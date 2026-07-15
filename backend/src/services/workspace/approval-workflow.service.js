const approvalWorkflowRepository = require('../../repositories/workspace/approval-workflow.repository');
const postRepository = require('../../repositories/workspace/post.repository');
const authorizationFacade = require('../auth/authorization.facade');
const {
  POST_STATUS,
  WORKFLOW_STATUS,
  WORKFLOW_POLICY,
  REVIEW_ACTION,
  TEAM_STATUS,
  PERMISSION_KEYS,
  USER_ROLES,
  ERROR_MESSAGES
} = require('../../utils/constants');
const { REVIEW_ACTION_STRATEGY_MAP } = require('./review-action-strategies');
const prisma = require('../../config/prisma');
const { eventEmitter, EVENTS } = require('../../events/event-emitter');

class ApprovalWorkflowService {
  /**
   * Lấy danh sách những người có thể review bài trong một brand.
   * Bao gồm: OWNER, ADMIN, thành viên có quyền APPROVE_POSTS.
   */
  async getPotentialReviewers(brandId, userId) {
    const isMember = await authorizationFacade.checkBrandAccess(userId, brandId);
    if (!isMember) {
      const error = new Error('Bạn không có quyền truy cập vào thương hiệu này.');
      error.status = 403;
      throw error;
    }

    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatarUrl: true }
        }
      }
    });
    if (!brand) return [];

    const members = await prisma.team.findMany({
      where: { brandId, status: TEAM_STATUS.ACTIVE },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true }
        },
        customRole: {
          include: { permissions: true }
        }
      }
    });

    const reviewers = [];

    if (brand.owner) {
      reviewers.push({
        id:        brand.owner.id,
        name:      brand.owner.name,
        email:     brand.owner.email,
        avatarUrl: brand.owner.avatarUrl,
        role:      USER_ROLES.OWNER
      });
    }

    for (const m of members) {
      if (m.userId === brand.ownerId) continue;

      const hasPermission = this._memberHasApprovePermission(m);

      if (hasPermission && m.user) {
        reviewers.push({
          id:        m.user.id,
          name:      m.user.name,
          email:     m.user.email,
          avatarUrl: m.user.avatarUrl,
          role:      m.customRole ? m.customRole.name : USER_ROLES.ADMIN
        });
      }
    }

    return reviewers;
  }

  /**
   * Lấy danh sách workflow theo brand.
   * brandId === 'all' → lấy tất cả brand mà user có quyền truy cập.
   */
  async getWorkflowsByBrand(brandId, userId) {
    if (brandId === 'all') {
      const brandIds = await this._getAllAccessibleBrandIds(userId);
      if (brandIds.length === 0) return [];
      return approvalWorkflowRepository.findManyByBrand(brandIds);
    }

    const isMember = await authorizationFacade.checkBrandAccess(userId, brandId);
    if (!isMember) {
      const error = new Error('Bạn không có quyền truy cập vào thương hiệu này.');
      error.status = 403;
      throw error;
    }

    return approvalWorkflowRepository.findManyByBrand(brandId);
  }

  /**
   * Tạo yêu cầu phê duyệt cho một bài viết.
   */
  async createWorkflowRequest(
    postId,
    requesterId,
    brandId,
    reviewerIds = [],
    policy = WORKFLOW_POLICY.AT_LEAST_ONE,
    requesterNote = ''
  ) {
    this._assertValidPolicy(policy, false);
    const reviewerList = this._dedupeReviewerIds(reviewerIds);

    const post = await postRepository.findById(postId);
    if (!post || post.brandId !== brandId) {
      const error = new Error('Không tìm thấy bài viết hoặc bài viết không thuộc thương hiệu này.');
      error.status = 404;
      throw error;
    }

    const allowedStatuses = [POST_STATUS.DRAFT, POST_STATUS.REJECTED, POST_STATUS.PENDING_APPROVAL];
    if (!allowedStatuses.includes(post.status)) {
      const error = new Error('Chỉ có thể gửi duyệt bài viết đang ở trạng thái Nháp, Chờ duyệt hoặc Bị từ chối.');
      error.status = 400;
      throw error;
    }

    const workflow = await approvalWorkflowRepository.create({
      postId,
      brandId,
      requesterId,
      approvalPolicy:    policy,
      selectedReviewers: JSON.stringify(reviewerList),
      requesterNote,
      status:            WORKFLOW_STATUS.PENDING,
      reviewers: {
        create: reviewerList.map(rId => ({
          reviewerId: rId,
          status: WORKFLOW_STATUS.PENDING
        }))
      }
    });

    await postRepository.updateStatus(postId, POST_STATUS.PENDING_APPROVAL);

    return workflow;
  }

  /**
   * Reviewer xử lý một yêu cầu phê duyệt.
   * Dùng Strategy Pattern — mỗi action là một strategy độc lập.
   * Thêm action mới: tạo class mới trong review-action-strategies.js, không sửa file này.
   */
  async reviewWorkflowRequest(workflowId, reviewerId, action, comment = '') {
    const workflow = await approvalWorkflowRepository.findById(workflowId);
    if (!workflow) {
      const error = new Error('Không tìm thấy yêu cầu phê duyệt.');
      error.status = 404;
      throw error;
    }

    if (workflow.status !== WORKFLOW_STATUS.PENDING) {
      const error = new Error('Yêu cầu phê duyệt này đã được xử lý trước đó.');
      error.status = 400;
      throw error;
    }

    await this._assertReviewerIsAuthorized(reviewerId, workflow);

    // Lookup strategy — không có if/else if chain nữa
    const strategy = REVIEW_ACTION_STRATEGY_MAP[action];
    if (!strategy) {
      const error = new Error('Hành động phê duyệt không hợp lệ.');
      error.status = 400;
      throw error;
    }

    let reviewerStatus = WORKFLOW_STATUS.PENDING;
    if (action === REVIEW_ACTION.APPROVED) {
      reviewerStatus = WORKFLOW_STATUS.APPROVED;
    } else if (action === REVIEW_ACTION.REJECTED) {
      reviewerStatus = WORKFLOW_STATUS.REJECTED;
    } else if (action === REVIEW_ACTION.REVISION_NEEDED) {
      reviewerStatus = WORKFLOW_STATUS.REVISION_NEEDED;
    }

    // Toàn bộ đọc-ghi quyết định trạng thái nằm trong 1 transaction với row lock (FOR UPDATE)
    // trên bản ghi workflow, để tránh race condition khi 2 reviewer duyệt gần như đồng thời
    // dưới policy ALL (cả hai đều đọc "chưa đủ APPROVED" trước khi bên kia commit).
    const { finalWorkflowStatus, finalPostStatus, updatedWorkflow } = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM approval_workflows WHERE id = ${workflowId} FOR UPDATE`;

      const existingReviewerRecord = await tx.workflowReviewer.findFirst({
        where: { workflowId, reviewerId }
      });

      if (existingReviewerRecord) {
        await tx.workflowReviewer.update({
          where: { id: existingReviewerRecord.id },
          data: {
            status: reviewerStatus,
            comment,
            reviewedAt: new Date()
          }
        });
      } else {
        await tx.workflowReviewer.create({
          data: {
            workflowId,
            reviewerId,
            status: reviewerStatus,
            comment,
            reviewedAt: new Date()
          }
        });
      }

      let workflowStatus = WORKFLOW_STATUS.PENDING;
      let postStatus = POST_STATUS.PENDING_APPROVAL;

      if (action === REVIEW_ACTION.REJECTED) {
        workflowStatus = WORKFLOW_STATUS.REJECTED;
        postStatus = POST_STATUS.REJECTED;
      } else if (action === REVIEW_ACTION.REVISION_NEEDED) {
        workflowStatus = WORKFLOW_STATUS.REVISION_NEEDED;
        postStatus = POST_STATUS.DRAFT;
      } else if (action === REVIEW_ACTION.APPROVED) {
        const policy = workflow.approvalPolicy || WORKFLOW_POLICY.AT_LEAST_ONE;
        if (policy === WORKFLOW_POLICY.AT_LEAST_ONE) {
          const result = await strategy.execute(workflow);
          workflowStatus = result.workflowStatus;
          postStatus = result.postStatus;
        } else if (policy === WORKFLOW_POLICY.ALL) {
          const reviewersList = this._dedupeReviewerIds(JSON.parse(workflow.selectedReviewers || '[]'));
          const currentDecisions = await tx.workflowReviewer.findMany({
            where: { workflowId }
          });

          const allApproved = reviewersList.every(rId => {
            const decision = currentDecisions.find(d => d.reviewerId === rId);
            return decision && decision.status === WORKFLOW_STATUS.APPROVED;
          });

          if (allApproved) {
            const result = await strategy.execute(workflow);
            workflowStatus = result.workflowStatus;
            postStatus = result.postStatus;
          } else {
            workflowStatus = WORKFLOW_STATUS.PENDING;
            postStatus = POST_STATUS.PENDING_APPROVAL;
          }
        }
      }

      const updated = await approvalWorkflowRepository.update(workflowId, {
        status:            workflowStatus,
        reviewedByUserId:  reviewerId,
        reviewedAt:        new Date(),
        reviewerComment:   comment
      }, tx);

      await postRepository.updateStatus(workflow.postId, postStatus, tx);

      return { finalWorkflowStatus: workflowStatus, finalPostStatus: postStatus, updatedWorkflow: updated };
    });

    // Side-effect (event emit) tách khỏi transaction — chỉ chạy sau khi DB đã commit thành công.
    const updatedPost = await postRepository.findById(workflow.postId);
    if (updatedPost) {
      let options = {};
      if (updatedPost.metadata) {
        try { options = JSON.parse(updatedPost.metadata); } catch(e) {}
      }
      const statusChangedToPublished = finalPostStatus === POST_STATUS.PUBLISHED;
      eventEmitter.emit(EVENTS.POST.UPDATED, { post: updatedPost, options, statusChangedToPublished });
    }

    return updatedWorkflow;
  }

  /**
   * Thay đổi danh sách reviewer (căn chỉnh lại) cho một workflow đang PENDING.
   * Chỉ requester hoặc owner/admin có thể thực hiện.
   */
  async reassignWorkflow(workflowId, brandId, requesterId, newReviewerIds = [], newPolicy = null) {
    // Fail-fast: validate input thuần túy trước khi chạm DB, nhất quán với createWorkflowRequest.
    this._assertValidPolicy(newPolicy, true);
    const reviewerList = this._dedupeReviewerIds(newReviewerIds);
    if (reviewerList.length === 0) {
      const error = new Error(ERROR_MESSAGES.EMPTY_REVIEWERS);
      error.status = 400;
      throw error;
    }

    const workflow = await approvalWorkflowRepository.findById(workflowId);
    if (!workflow || workflow.brandId !== brandId) {
      const error = new Error('Không tìm thấy yêu cầu phê duyệt.');
      error.status = 404;
      throw error;
    }

    if (workflow.status !== WORKFLOW_STATUS.PENDING) {
      const error = new Error('Chỉ có thể thay đổi người duyệt khi workflow đang ở trạng thái Chờ duyệt.');
      error.status = 400;
      throw error;
    }

    // Kiểm tra quyền: chỉ requester, owner hoặc admin mới có thể thay đổi
    const isRequester = workflow.requesterId === requesterId;
    const hasApprovePermission = await authorizationFacade.hasPermission(requesterId, brandId, PERMISSION_KEYS.APPROVE_POSTS);
    if (!isRequester && !hasApprovePermission) {
      const error = new Error('Bạn không có quyền thay đổi người duyệt cho yêu cầu này.');
      error.status = 403;
      throw error;
    }

    // Xóa reviewer cũ + tạo lại trong cùng 1 transaction với row lock, tránh trạng thái
    // "workflow trống hoàn toàn người duyệt" nếu bước tạo mới lỗi giữa chừng.
    const updatedWorkflow = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM approval_workflows WHERE id = ${workflowId} FOR UPDATE`;

      await tx.workflowReviewer.deleteMany({ where: { workflowId } });

      const updateData = {
        selectedReviewers: JSON.stringify(reviewerList),
        reviewers: {
          create: reviewerList.map(rId => ({
            reviewerId: rId,
            status: WORKFLOW_STATUS.PENDING
          }))
        }
      };
      if (newPolicy) updateData.approvalPolicy = newPolicy;

      return approvalWorkflowRepository.update(workflowId, updateData, tx);
    });

    return updatedWorkflow;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Kiểm tra member có quyền APPROVE_POSTS không (ADMIN hoặc custom role). */
  _memberHasApprovePermission(member) {
    if (member.role === USER_ROLES.ADMIN) return true;
    if (!member.customRole?.permissions) return false;
    return member.customRole.permissions.some(
      p => p.permissionKey === PERMISSION_KEYS.APPROVE_POSTS && p.isAllowed
    );
  }

  /**
   * Ném lỗi 403 nếu reviewer không có quyền APPROVE_POSTS hiện tại trên brand.
   * Lưu ý: workflow.selectedReviewers chỉ mang tính chất hiển thị/thông tin
   * (metadata chỉ định ban đầu), KHÔNG còn giữ vai trò phân quyền (authorization).
   * Quyền duyệt luôn được xác thực lại theo trạng thái quyền thực tế tại thời điểm review,
   * để tránh bypass khi reviewer bị thu hồi quyền/xóa khỏi nhóm sau khi được chỉ định.
   */
  async _assertReviewerIsAuthorized(reviewerId, workflow) {
    const hasApprovePermission = await authorizationFacade.hasPermission(
      reviewerId,
      workflow.brandId,
      PERMISSION_KEYS.APPROVE_POSTS
    );

    if (!hasApprovePermission) {
      const error = new Error('Bạn không có quyền phê duyệt yêu cầu này.');
      error.status = 403;
      throw error;
    }
  }

  /**
   * Ném lỗi 400 nếu policy không thuộc whitelist WORKFLOW_POLICY.
   * isOptional=true: cho phép policy falsy (null/undefined) đi qua — dùng ở reassignWorkflow
   * nơi không đổi policy là hợp lệ. isOptional=false: bắt buộc phải có giá trị hợp lệ — dùng ở
   * creation-time để tránh workflow được tạo với policy rỗng/không xác định.
   */
  _assertValidPolicy(policy, isOptional = false) {
    if (isOptional && !policy) return;

    const validPolicies = Object.values(WORKFLOW_POLICY);
    if (!validPolicies.includes(policy)) {
      const error = new Error(ERROR_MESSAGES.INVALID_APPROVAL_POLICY);
      error.status = 400;
      throw error;
    }
  }

  /** Chuẩn hoá danh sách reviewerId: loại falsy và trùng lặp, giữ nguyên thứ tự xuất hiện đầu tiên. */
  _dedupeReviewerIds(reviewerIds) {
    const list = Array.isArray(reviewerIds) ? reviewerIds : [reviewerIds].filter(Boolean);
    return [...new Set(list.filter(Boolean))];
  }

  /** Lấy tất cả brandId mà user có quyền truy cập (owned + active member). */
  async _getAllAccessibleBrandIds(userId) {
    const [ownedBrands, memberBrands] = await Promise.all([
      prisma.brand.findMany({
        where:  { ownerId: userId, deletedAt: null },
        select: { id: true }
      }),
      prisma.team.findMany({
        where:  { userId, status: TEAM_STATUS.ACTIVE },
        select: { brandId: true }
      })
    ]);

    return [...new Set([
      ...ownedBrands.map(b => b.id),
      ...memberBrands.map(t => t.brandId)
    ])];
  }
}

module.exports = new ApprovalWorkflowService();
