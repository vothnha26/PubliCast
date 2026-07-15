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
  USER_ROLES
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

    const reviewerList = Array.isArray(reviewerIds) ? reviewerIds : [reviewerIds].filter(Boolean);

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

    // Update individual reviewer status first
    let reviewerStatus = WORKFLOW_STATUS.PENDING;
    if (action === REVIEW_ACTION.APPROVED) {
      reviewerStatus = WORKFLOW_STATUS.APPROVED;
    } else if (action === REVIEW_ACTION.REJECTED) {
      reviewerStatus = WORKFLOW_STATUS.REJECTED;
    } else if (action === REVIEW_ACTION.REVISION_NEEDED) {
      reviewerStatus = WORKFLOW_STATUS.REVISION_NEEDED;
    }

    const existingReviewerRecord = await prisma.workflowReviewer.findFirst({
      where: { workflowId, reviewerId }
    });

    if (existingReviewerRecord) {
      await prisma.workflowReviewer.update({
        where: { id: existingReviewerRecord.id },
        data: {
          status: reviewerStatus,
          comment,
          reviewedAt: new Date()
        }
      });
    } else {
      await prisma.workflowReviewer.create({
        data: {
          workflowId,
          reviewerId,
          status: reviewerStatus,
          comment,
          reviewedAt: new Date()
        }
      });
    }

    // Decide final workflow & post status based on policy
    let finalWorkflowStatus = WORKFLOW_STATUS.PENDING;
    let finalPostStatus = POST_STATUS.PENDING_APPROVAL;

    if (action === REVIEW_ACTION.REJECTED) {
      finalWorkflowStatus = WORKFLOW_STATUS.REJECTED;
      finalPostStatus = POST_STATUS.REJECTED;
    } else if (action === REVIEW_ACTION.REVISION_NEEDED) {
      finalWorkflowStatus = WORKFLOW_STATUS.REVISION_NEEDED;
      finalPostStatus = POST_STATUS.DRAFT;
    } else if (action === REVIEW_ACTION.APPROVED) {
      const policy = workflow.approvalPolicy || WORKFLOW_POLICY.AT_LEAST_ONE;
      if (policy === WORKFLOW_POLICY.AT_LEAST_ONE) {
        const { workflowStatus, postStatus } = await strategy.execute(workflow);
        finalWorkflowStatus = workflowStatus;
        finalPostStatus = postStatus;
      } else if (policy === WORKFLOW_POLICY.ALL) {
        const reviewersList = JSON.parse(workflow.selectedReviewers || '[]');
        const currentDecisions = await prisma.workflowReviewer.findMany({
          where: { workflowId }
        });

        const allApproved = reviewersList.every(rId => {
          const decision = currentDecisions.find(d => d.reviewerId === rId);
          return decision && decision.status === WORKFLOW_STATUS.APPROVED;
        });

        if (allApproved) {
          const { workflowStatus, postStatus } = await strategy.execute(workflow);
          finalWorkflowStatus = workflowStatus;
          finalPostStatus = postStatus;
        } else {
          finalWorkflowStatus = WORKFLOW_STATUS.PENDING;
          finalPostStatus = POST_STATUS.PENDING_APPROVAL;
        }
      }
    }

    const updatedWorkflow = await approvalWorkflowRepository.update(workflowId, {
      status:            finalWorkflowStatus,
      reviewedByUserId:  reviewerId,
      reviewedAt:        new Date(),
      reviewerComment:   comment
    });

    await postRepository.updateStatus(workflow.postId, finalPostStatus);

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

    const reviewerList = Array.isArray(newReviewerIds) ? newReviewerIds.filter(Boolean) : [];

    // Xóa tất cả reviewer cũ rồi tạo lại
    await prisma.workflowReviewer.deleteMany({ where: { workflowId } });

    // Cập nhật workflow với reviewer mới
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

    const updatedWorkflow = await approvalWorkflowRepository.update(workflowId, updateData);
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
