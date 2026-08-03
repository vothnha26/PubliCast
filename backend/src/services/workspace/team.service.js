const jwt = require('jsonwebtoken');
const prisma = require('../../config/prisma');
const teamRepository = require('../../repositories/workspace/team.repository');
const brandRepository = require('../../repositories/workspace/brand.repository');
const subscriptionRepository = require('../../repositories/billing/subscription.repository');
const userRepository = require('../../repositories/auth/user.repository');
const approvalWorkflowRepository = require('../../repositories/workspace/approval-workflow.repository');
const approvalWorkflowService = require('./approval-workflow.service');
const authorizationFacade = require('../auth/authorization.facade');
const roleResolver = require('./role-resolver');
const outboxEventRepository = require('../../repositories/core/outbox-event.repository');
const revocationWebhookService = require('../integrations/revocation-webhook.service');
const { OUTBOX_EVENT_TYPES } = require('../../constants/outbox.constants');
const { TEAM_STATUS, PERMISSION_KEYS, NOTIFICATION_TYPES, WORKFLOW_STATUS } = require('../../utils/constants');
const QueryPipeline = require('../../core/query-pipeline/query.pipeline');
const TeamSearchFilter = require('./team/filters/search.filter');
const TeamRoleFilter = require('./team/filters/role.filter');
const TeamStatusFilter = require('./team/filters/status.filter');
const notificationService = require('../core/notification.service');
const logger = require('../../utils/logger');

class TeamService {
  constructor() {
    this.queryPipeline = new QueryPipeline([
      new TeamSearchFilter(),
      new TeamRoleFilter(),
      new TeamStatusFilter()
    ]);
  }

  /**
   * Get team members for a brand
   */
  async getTeamMembers(queryParams, brandId) {
    const { page = 1, limit = 50 } = queryParams;
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const skip = (Math.max(1, parseInt(page) || 1) - 1) * safeLimit;

    // Apply filters
    const where = this.queryPipeline.apply({ brandId }, queryParams);
    const { members, total } = await teamRepository.findManyAndCount(where, { skip, take: safeLimit });

    return {
      data: members.map(m => this._formatTeamMember(m)),
      meta: { total, page: Math.max(1, parseInt(page) || 1), limit: safeLimit, totalPages: Math.ceil(total / safeLimit) }
    };
  }

  /**
   * Invite a new team member
   */
  async inviteMember({ email, role, brandId, invitedByUserId }) {
    if (!email || typeof email !== 'string') {
      const error = new Error('Email không được để trống.');
      error.status = 400;
      throw error;
    }
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      const error = new Error('Định dạng email không hợp lệ.');
      error.status = 400;
      throw error;
    }

    const brand = await brandRepository.findBrandWithSubscription(brandId);

    if (!brand) {
      const error = new Error('Workspace/Brand không tồn tại.');
      error.status = 404;
      throw error;
    }

    const isAuthorized = await authorizationFacade.checkPermission(invitedByUserId, brandId, PERMISSION_KEYS.MANAGE_TEAM);
    if (!isAuthorized) {
      const error = new Error('Bạn không có quyền mời thành viên vào thương hiệu này.');
      error.status = 403;
      throw error;
    }

    const maxSeats = brand.subscription?.plan?.planLimit?.maxTeamSeats || 5;

    // Map role using RoleResolver
    const { dbRole, customRoleId } = await roleResolver.resolve(role, brandId);

    // Find or create shell user
    let user = await userRepository.findByEmail(cleanEmail);

    if (!user) {
      user = await userRepository.createShellUser(cleanEmail);
    }

    // Check if already in Team
    const existingTeam = await teamRepository.findByBrandAndUserId(brandId, user.id);

    if (existingTeam) {
      if (existingTeam.status === TEAM_STATUS.ACTIVE) {
        const error = new Error('Người dùng này đã là thành viên của thương hiệu.');
        error.status = 400;
        throw error;
      }
    }

    // Re-check the seat limit + create/update the team record inside a single
    // transaction, behind a row lock on the brand's Subscription — closes the
    // check-then-act race (#60) where two concurrent invites could each read
    // a count under maxSeats and both write, exceeding the seat limit.
    const team = await prisma.$transaction(async (tx) => {
      await subscriptionRepository.lockSubscriptionForUpdate(brandId, tx);
      const lockedSeatCount = await teamRepository.countMembersByBrand(brandId, tx);
      if (lockedSeatCount >= maxSeats) {
        const error = new Error(`Thương hiệu đã đạt giới hạn thành viên tối đa cho phép (${maxSeats} người). Vui lòng nâng cấp gói.`);
        error.status = 402;
        throw error;
      }

      if (existingTeam) {
        return teamRepository.update(existingTeam.id, {
          role: dbRole,
          customRoleId,
          invitedByUserId,
          invitedAt: new Date(),
          status: TEAM_STATUS.PENDING
        }, tx);
      }
      return teamRepository.create({
        brandId,
        userId: user.id,
        role: dbRole,
        customRoleId,
        invitedByUserId,
        status: TEAM_STATUS.PENDING
      }, tx);
    });

    // Generate JWT Token (expires in 7 days)
    const token = jwt.sign(
      { teamId: team.id, email: user.email, brandId },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '7d' }
    );

    // Send invitation email
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const inviteUrl = `${frontendUrl}/invite?token=${token}`;
    const inviter = await userRepository.findById(invitedByUserId);

    try {
      const emailService = require('../core/email.service');
      await emailService.sendTeamInvitation(user.email, inviter.name, brand.name, inviteUrl);
    } catch (err) {
      console.error('Failed to send invite email:', err);
    }

    // Tạo notification cho người được mời
    try {
      await notificationService.create({
        userId: user.id,
        brandId,
        type: NOTIFICATION_TYPES.TEAM,
        title: `Bạn được mời vào "${brand.name}"`,
        message: `${inviter?.name || 'Ai đó'} đã mời bạn tham gia với vai trò ${role}.`,
        actionUrl: `/invite?token=${token}`
      });
    } catch (notifErr) {
      // Không để lỗi notification chặn flow mời thành viên
      console.error('[TeamService] Failed to create invite notification:', notifErr.message);
    }

    return {
      message: 'Đã gửi lời mời thành công',
      team: this._formatTeamMember(await teamRepository.findById(team.id)),
      token
    };
  }

  /**
   * Resend invitation to a pending member
   */
  async resendInvitation(teamId, requestedByUserId) {
    const team = await teamRepository.findById(teamId);
    if (!team) {
      const error = new Error('Không tìm thấy thành viên.');
      error.status = 404;
      throw error;
    }

    if (team.status !== 'PENDING') {
      const error = new Error('Chỉ có thể gửi lại lời mời cho thành viên đang ở trạng thái chờ xác nhận (Pending).');
      error.status = 400;
      throw error;
    }

    const isAuthorized = await authorizationFacade.checkPermission(requestedByUserId, team.brandId, PERMISSION_KEYS.MANAGE_TEAM);
    if (!isAuthorized) {
      const error = new Error('Bạn không có quyền gửi lại lời mời.');
      error.status = 403;
      throw error;
    }

    const brand = await brandRepository.findBrandWithSubscription(team.brandId);
    const requester = await userRepository.findById(requestedByUserId);

    // Generate new JWT token (reset 7-day window)
    const token = jwt.sign(
      { teamId: team.id, email: team.user.email, brandId: team.brandId },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '7d' }
    );

    // Update invitedAt to reflect the resend time
    await teamRepository.update(teamId, { invitedAt: new Date(), invitedByUserId: requestedByUserId });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const inviteUrl = `${frontendUrl}/invite?token=${token}`;

    try {
      const emailService = require('../core/email.service');
      await emailService.sendTeamInvitation(team.user.email, requester.name, brand.name, inviteUrl, true);
    } catch (err) {
      console.error('[TeamService] Failed to resend invite email:', err.message);
      const error = new Error('Không thể gửi email lời mời. Vui lòng kiểm tra cấu hình SMTP.');
      error.status = 500;
      throw error;
    }

    // Update notification
    try {
      await notificationService.create({
        userId: team.userId,
        brandId: team.brandId,
        type: NOTIFICATION_TYPES.TEAM,
        title: `Lời mời gia nhập "${brand.name}" đã được gửi lại`,
        message: `${requester?.name || 'Ai đó'} đã gửi lại lời mời. Vui lòng kiểm tra email của bạn.`,
        actionUrl: `/invite?token=${token}`
      });
    } catch (notifErr) {
      console.error('[TeamService] Failed to create resend notification:', notifErr.message);
    }

    return { message: `Đã gửi lại lời mời tới ${team.user.email} thành công!` };
  }

  /**
   * Invite multiple team members
   */
  async inviteMembers({ emails, role, brandId, invitedByUserId }) {
    if (!Array.isArray(emails) || emails.length === 0) {

      const error = new Error('Danh sách email không hợp lệ.');
      error.status = 400;
      throw error;
    }

    const brand = await brandRepository.findBrandWithSubscription(brandId);
    if (!brand) {
      const error = new Error('Workspace/Brand không tồn tại.');
      error.status = 404;
      throw error;
    }

    const isAuthorized = await authorizationFacade.checkPermission(invitedByUserId, brandId, PERMISSION_KEYS.MANAGE_TEAM);
    if (!isAuthorized) {
      const error = new Error('Bạn không có quyền mời thành viên vào thương hiệu này.');
      error.status = 403;
      throw error;
    }

    // Check plan limits
    const currentSeatCount = await teamRepository.countMembersByBrand(brandId);
    const maxSeats = brand.subscription?.plan?.planLimit?.maxTeamSeats || 5;
    const remainingSeats = maxSeats - currentSeatCount;

    if (remainingSeats <= 0) {
      const error = new Error(`Thương hiệu đã đạt giới hạn thành viên tối đa cho phép (${maxSeats} người). Vui lòng nâng cấp gói.`);
      error.status = 402;
      throw error;
    }

    if (emails.length > remainingSeats) {
      const error = new Error(`Bạn chỉ có thể mời thêm tối đa ${remainingSeats} thành viên (Gói hiện tại giới hạn ${maxSeats} người).`);
      error.status = 400;
      throw error;
    }

    const successes = [];
    const failures = [];

    for (const email of emails) {
      try {
        if (!email || typeof email !== 'string') {
          throw new Error('Email không được để trống.');
        }
        const cleanEmail = email.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanEmail)) {
          throw new Error('Định dạng email không hợp lệ.');
        }

        // Map role using RoleResolver
        const { dbRole, customRoleId } = await roleResolver.resolve(role, brandId);

        // Find or create shell user
        let user = await userRepository.findByEmail(cleanEmail);
        if (!user) {
          user = await userRepository.createShellUser(cleanEmail);
        }

        // Check if already in Team
        const existingTeam = await teamRepository.findByBrandAndUserId(brandId, user.id);
        if (existingTeam && existingTeam.status === TEAM_STATUS.ACTIVE) {
          throw new Error('Người dùng này đã là thành viên của thương hiệu.');
        }

        // Re-check the seat limit + create/update the team record inside a
        // single transaction, behind a row lock on the brand's Subscription —
        // closes the check-then-act race (#60). The pre-flight remainingSeats
        // check above is only a fast-fail; this per-invite re-check inside
        // the lock is what actually prevents exceeding maxSeats when this
        // loop races against another concurrent inviteMember(s) call.
        const team = await prisma.$transaction(async (tx) => {
          await subscriptionRepository.lockSubscriptionForUpdate(brandId, tx);
          const lockedSeatCount = await teamRepository.countMembersByBrand(brandId, tx);
          if (lockedSeatCount >= maxSeats) {
            throw new Error(`Thương hiệu đã đạt giới hạn thành viên tối đa cho phép (${maxSeats} người). Vui lòng nâng cấp gói.`);
          }

          if (existingTeam) {
            return teamRepository.update(existingTeam.id, {
              role: dbRole,
              customRoleId,
              invitedByUserId,
              invitedAt: new Date(),
              status: TEAM_STATUS.PENDING
            }, tx);
          }
          return teamRepository.create({
            brandId,
            userId: user.id,
            role: dbRole,
            customRoleId,
            invitedByUserId,
            status: TEAM_STATUS.PENDING
          }, tx);
        });

        // Generate JWT Token (expires in 7 days)
        const token = jwt.sign(
          { teamId: team.id, email: user.email, brandId },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: '7d' }
        );

        // Send invitation email
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const inviteUrl = `${frontendUrl}/invite?token=${token}`;
        const inviter = await userRepository.findById(invitedByUserId);

        try {
          const emailService = require('../core/email.service');
          await emailService.sendTeamInvitation(user.email, inviter.name, brand.name, inviteUrl);
        } catch (err) {
          console.error('Failed to send invite email:', err);
        }

        // Tạo notification cho người được mời
        try {
          await notificationService.create({
            userId: user.id,
            brandId,
            type: NOTIFICATION_TYPES.TEAM,
            title: `Bạn được mời vào "${brand.name}"`,
            message: `${inviter?.name || 'Ai đó'} đã mời bạn tham gia với vai trò ${role}.`,
            actionUrl: `/invite?token=${token}`
          });
        } catch (notifErr) {
          console.error('[TeamService] Failed to create invite notification:', notifErr.message);
        }

        successes.push({
          email: cleanEmail,
          team: this._formatTeamMember(await teamRepository.findById(team.id)),
          token
        });
      } catch (err) {
        failures.push({
          email,
          message: err.message
        });
      }
    }

    return {
      message: `Đã xử lý mời thành viên. Thành công: ${successes.length}, Thất bại: ${failures.length}`,
      successes,
      failures
    };
  }


  /**
   * Validate invitation token
   */
  async validateInvitation(token) {
    try {
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      const team = await teamRepository.findById(decoded.teamId);
      if (!team || team.status !== 'PENDING') {
        const error = new Error('Lời mời không hợp lệ hoặc đã được sử dụng.');
        error.status = 400;
        throw error;
      }

      const inviter = await prisma.user.findUnique({
        where: { id: team.invitedByUserId },
        select: { name: true }
      });

      return {
        email: team.user.email,
        brandName: team.brand.name,
        inviterName: inviter?.name || 'Ai đó',
        isNewUser: !team.user.passwordHash || team.user.passwordHash === ''
      };
    } catch (err) {
      const error = new Error(err.message || 'Token lời mời không hợp lệ hoặc đã hết hạn.');
      error.status = 400;
      throw error;
    }
  }

  /**
   * Accept team invitation
   */
  async acceptInvitation({ token, name, password }) {
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (err) {
      const error = new Error('Token lời mời không hợp lệ hoặc đã hết hạn.');
      error.status = 400;
      throw error;
    }

    const team = await teamRepository.findById(decoded.teamId);
    if (!team || team.status !== 'PENDING') {
      const error = new Error('Lời mời không tồn tại hoặc đã được xử lý.');
      error.status = 400;
      throw error;
    }

    const user = team.user;
    const isNewUser = !user.passwordHash;

    if (isNewUser && (!name || !password)) {
      const error = new Error('Vui lòng điền đầy đủ họ tên và mật khẩu.');
      error.status = 400;
      throw error;
    }

    // Atomic accept: the WHERE status: 'PENDING' guard means a double-submit
    // (e.g. two tabs, double-click) only lets ONE request through — the loser
    // gets count: 0 here and stops before touching the user's password, instead
    // of both requests racing to hash/write two different passwords.
    const { count } = await teamRepository.activateIfPending(team.id);
    if (count === 0) {
      const error = new Error('Lời mời không tồn tại hoặc đã được xử lý.');
      error.status = 400;
      throw error;
    }

    if (isNewUser) {
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash(password, 10);

      // Update user profile and activate account
      await prisma.user.update({
        where: { id: user.id },
        data: {
          name,
          passwordHash,
          isActive: true,
          isEmailVerified: true,
          accounts: {
            upsert: {
              where: {
                userId_provider: {
                  userId: user.id,
                  provider: 'LOCAL'
                }
              },
              update: { passwordHash },
              create: {
                provider: 'LOCAL',
                passwordHash
              }
            }
          }
        }
      });
    }

    // Generate tokens for immediate login
    const tokenService = require('../auth/token.service');
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id }
    });
    const tokens = await tokenService.generateAndSaveTokens(updatedUser);

    return {
      message: 'Chấp nhận lời mời thành công',
      ...tokens,
      brandId: team.brandId,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role
      }
    };
  }

  /**
   * Update team member role
   */
  async updateMemberRole(id, role, operatorUserId) {
    const team = await teamRepository.findById(id);
    if (!team) {
      const error = new Error('Không tìm thấy thành viên.');
      error.status = 404;
      throw error;
    }

    const isAuthorized = await authorizationFacade.checkPermission(operatorUserId, team.brandId, PERMISSION_KEYS.MANAGE_TEAM);
    if (!isAuthorized) {
      const error = new Error('Bạn không có quyền quản lý thành viên của thương hiệu này.');
      error.status = 403;
      throw error;
    }

    // Map role
    let dbRole = 'USER';
    let customRoleId = null;

    // Check if role is custom role ID
    const customRole = await prisma.customRole.findFirst({
      where: { id: role, brandId: team.brandId }
    });

    if (customRole) {
      customRoleId = customRole.id;
      dbRole = 'USER'; // Default fallback role
    } else {
      if (role === 'Admin') dbRole = 'ADMIN';
      else if (role === 'Analyst') dbRole = 'ANALYST';
      else dbRole = 'USER';
    }

    // Lock the row before writing — prevents a concurrent removeMember on the
    // same member from deleting the record between our read above and this
    // write (and vice versa: see removeMember's own lock for that direction).
    const updated = await prisma.$transaction(async (tx) => {
      await teamRepository.lockForUpdate(id, tx);
      return teamRepository.update(id, { role: dbRole, customRoleId }, tx);
    });

    // Tạo notification cho thành viên bị đổi vai trò
    try {
      await notificationService.create({
        userId: team.userId,
        brandId: team.brandId,
        type: NOTIFICATION_TYPES.TEAM,
        title: 'Vai trò của bạn đã được cập nhật',
        message: `Vai trò của bạn trong workspace đã được thay đổi thành ${role}.`,
        actionUrl: '/settings/team'
      });
    } catch (notifErr) {
      console.error('[TeamService] Failed to create role-update notification:', notifErr.message);
    }

    // Check if new role has APPROVE_POSTS permission
    const hasApproveAfterUpdate = await this._roleHasApprovePermission(dbRole, customRoleId);

    // If new role loses APPROVE_POSTS, remove from any pending workflows
    if (!hasApproveAfterUpdate) {
      await this._handleReviewerRemoved(team.userId, team.brandId, 'role_changed');
    }

    return this._formatTeamMember(updated);
  }

  /**
   * Remove member from team
   */
  async removeMember(id, operatorUserId) {
    const team = await teamRepository.findById(id);
    if (!team) {
      const error = new Error('Không tìm thấy thành viên.');
      error.status = 404;
      throw error;
    }

    const isAuthorized = await authorizationFacade.checkPermission(operatorUserId, team.brandId, PERMISSION_KEYS.MANAGE_TEAM);
    if (!isAuthorized) {
      const error = new Error('Bạn không có quyền xóa thành viên của thương hiệu này.');
      error.status = 403;
      throw error;
    }

    if (team.brand.ownerId === team.userId) {
      const error = new Error('Không thể xóa chủ sở hữu khỏi thương hiệu.');
      error.status = 400;
      throw error;
    }

    // Lock + re-read before deleting — prevents racing a concurrent
    // updateMemberRole on the same member (see that method's own lock for the
    // other direction), and makes this idempotent if another removeMember
    // call already deleted the row between our read above and this write.
    const deleted = await prisma.$transaction(async (tx) => {
      await teamRepository.lockForUpdate(id, tx);
      const fresh = await teamRepository.findById(id, tx);
      if (!fresh) return false;
      await teamRepository.delete(id, tx);

      // Critical-event push to external integrations (plan.txt mục 6) — a
      // user removed from a brand may have a live real-time session (e.g.
      // an open real-time chat) that needs to be cut immediately, not
      // just on their next API call. Enqueued in the SAME transaction as
      // the deletion so the event can't be lost if the process crashes
      // right after commit but before enqueueing separately.
      const outboxPayloads = await revocationWebhookService.buildOutboxPayloadsForAllClients(
        'USER_REMOVED_FROM_BRAND',
        { brandId: team.brandId, userId: team.userId }
      );
      for (const { clientId, payload } of outboxPayloads) {
        await outboxEventRepository.create(
          OUTBOX_EVENT_TYPES.INTEGRATION_REVOCATION_WEBHOOK,
          `${team.brandId}:${team.userId}:${clientId}`,
          { clientId, eventPayload: payload },
          {},
          tx
        );
      }

      return true;
    });

    if (!deleted) {
      return { message: 'Đã xóa thành viên khỏi thương hiệu thành công' };
    }

    // Remove kicked member from any pending approval workflows & notify requesters
    await this._handleReviewerRemoved(team.userId, team.brandId, 'member_removed');

    return { message: 'Đã xóa thành viên khỏi thương hiệu thành công' };
  }

  // ============= Private Helper Methods =============

  /**
   * Kiểm tra xem dbRole/customRoleId có quyền APPROVE_POSTS không.
   */
  async _roleHasApprovePermission(dbRole, customRoleId) {
    // OWNER và ADMIN luôn có quyền
    if (dbRole === 'OWNER' || dbRole === 'ADMIN') return true;
    if (!customRoleId) return false;

    const role = await prisma.customRole.findUnique({
      where: { id: customRoleId },
      include: { permissions: true }
    });
    if (!role) return false;
    return role.permissions.some(
      p => p.permissionKey === PERMISSION_KEYS.APPROVE_POSTS && p.isAllowed
    );
  }

  /**
   * Xử lý khi một user bị xoá khỏi team hoặc mất quyền APPROVE_POSTS.
   * - Tìm tất cả workflow PENDING trong brand mà user đang là reviewer.
   * - Với mỗi workflow: khóa dòng (FOR UPDATE), xóa WorkflowReviewer record của
   *   user, rồi ủy quyền cho ApprovalWorkflowService.reevaluateAfterReviewerRemoved
   *   quyết định có tự động APPROVED hay không — TeamService không tự tính toán
   *   quy tắc policy (single source of truth nằm ở ApprovalWorkflowService).
   * - Nếu workflow không còn reviewer nào (và không tự động approve), notify
   *   requester để bổ sung người duyệt mới.
   * @param {string} userId - User bị kick/đổi role
   * @param {string} brandId
   * @param {'member_removed'|'role_changed'} reason
   */
  async _handleReviewerRemoved(userId, brandId, reason) {
    try {
      // Tìm tất cả WorkflowReviewer records của user trong brand này đang PENDING
      const affectedReviewers = await prisma.workflowReviewer.findMany({
        where: {
          reviewerId: userId,
          status: WORKFLOW_STATUS.PENDING,
          workflow: {
            brandId,
            status: WORKFLOW_STATUS.PENDING
          }
        },
        include: {
          workflow: {
            include: {
              post: { select: { id: true, title: true } },
              requester: { select: { id: true, name: true } }
            }
          }
        }
      });

      if (affectedReviewers.length === 0) return;

      const removedUser = await userRepository.findById(userId);
      const reasonText = reason === 'member_removed'
        ? `đã bị xóa khỏi workspace`
        : `đã bị đổi vai trò và không còn quyền phê duyệt`;

      for (const wr of affectedReviewers) {
        const workflow = wr.workflow;
        if (!workflow) continue;

        const { autoApproved, remainingReviewers } = await prisma.$transaction(async (tx) => {
          await approvalWorkflowRepository.lockForUpdate(workflow.id, tx);
          await tx.workflowReviewer.delete({ where: { id: wr.id } });

          // reevaluateAfterReviewerRemoved tự ghi outbox (job publish + domain event)
          // NGAY BÊN TRONG tx này nếu autoApproved — không cần bước side-effect nào
          // sau khi transaction commit, outbox tự đảm bảo retry.
          const evalResult = await approvalWorkflowService.reevaluateAfterReviewerRemoved(workflow.id, tx);
          const remaining = await tx.workflowReviewer.count({ where: { workflowId: workflow.id } });

          return {
            autoApproved: evalResult.autoApproved,
            remainingReviewers: remaining
          };
        });

        // Notify requester
        const postTitle = workflow.post?.title || 'Bài viết không rõ tiêu đề';
        const removedName = removedUser?.name || 'Thành viên';

        let notifTitle, notifMessage;
        if (autoApproved) {
          notifTitle = '✅ Bài viết đã được tự động duyệt';
          notifMessage = `"${removedName}" ${reasonText}. Các reviewer còn lại của bài viết "${postTitle}" đã duyệt đủ, bài viết được tự động chuyển sang duyệt xong.`;
        } else if (remainingReviewers === 0) {
          notifTitle = '⚠️ Không còn người duyệt bài viết';
          notifMessage = `"${removedName}" ${reasonText}. Bài viết "${postTitle}" hiện không còn người duyệt. Vui lòng chỉ định người duyệt mới.`;
        } else {
          notifTitle = '🔔 Người duyệt bài viết đã thay đổi';
          notifMessage = `"${removedName}" ${reasonText}. Bài viết "${postTitle}" còn ${remainingReviewers} người duyệt.`;
        }

        if (workflow.requester?.id) {
          await notificationService.create({
            userId: workflow.requester.id,
            brandId,
            type: NOTIFICATION_TYPES.TEAM,
            title: notifTitle,
            message: notifMessage,
            actionUrl: `/planner/list`
          }).catch(err => console.error('[TeamService] Failed to notify requester:', err.message));
        }

        logger.debug(`[TeamService] Removed reviewer ${userId} from workflow ${workflow.id}. Remaining: ${remainingReviewers}. AutoApproved: ${autoApproved}`);
      }
    } catch (err) {
      // Không để lỗi này chặn flow chính (kick member / đổi role)
      console.error('[TeamService] _handleReviewerRemoved failed:', err.message);
    }
  }

  _formatTeamMember(m) {
    return {
      id: m.id,
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      avatar: m.user.avatarUrl,
      role: m.customRole ? m.customRole.name : this._formatRoleName(m.role),
      customRole: m.customRole ? {
        id: m.customRole.id,
        name: m.customRole.name,
        colorHex: m.customRole.colorHex
      } : null,
      status: m.status.toLowerCase(),
      joinedDate: m.acceptedAt 
        ? new Date(m.acceptedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) 
        : 'Pending',
      invitedBy: m.invitedBy?.name || 'System'
    };
  }

  _formatRoleName(role) {
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  }
}

module.exports = new TeamService();
