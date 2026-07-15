const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock otplib to prevent ESModule parsing errors on @scure/base in Jest
jest.mock('otplib', () => ({
  authenticator: {
    generate: jest.fn(),
    verify: jest.fn()
  }
}));

// Mock Auth Middleware
jest.mock('../../src/middlewares/auth.middleware', () => ({
  verifyAuth: (req, res, next) => {
    req.user = { id: 'operator-id', email: 'owner@publicast.com' };
    next();
  }
}));

// Mock Prisma
jest.mock('../../src/config/prisma', () => {
  const mockBrand = {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn().mockResolvedValue([
      {
        id: 'brand-1',
        ownerId: 'operator-id',
        subscription: {
          status: 'ACTIVE',
          plan: {
            name: 'PRO',
            priceAmount: 100,
            planLimit: {
              maxTeamSeats: 5
            }
          }
        }
      }
    ])
  };
  const mockTeam = {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn()
  };
  const mockUser = {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  };
  const mockUserAccount = {
    upsert: jest.fn()
  };
  const mockCustomRole = {
    findFirst: jest.fn(),
    findUnique: jest.fn()
  };
  const mockCustomRolePermission = {
    findUnique: jest.fn()
  };
  const mockWorkflowReviewer = {
    findMany: jest.fn().mockResolvedValue([]),
    delete: jest.fn().mockResolvedValue({}),
    count: jest.fn().mockResolvedValue(0)
  };
  const mockApprovalWorkflow = {
    findUnique: jest.fn(),
    update: jest.fn()
  };

  const mockPrisma = {
    brand: mockBrand,
    team: mockTeam,
    user: mockUser,
    userAccount: mockUserAccount,
    customRole: mockCustomRole,
    customRolePermission: mockCustomRolePermission,
    workflowReviewer: mockWorkflowReviewer,
    approvalWorkflow: mockApprovalWorkflow,
    post: { update: jest.fn(), findUnique: jest.fn() },
    $queryRaw: jest.fn().mockResolvedValue([]),
    $transaction: jest.fn().mockImplementation((callback) => callback(mockPrisma))
  };

  return mockPrisma;
});

const prisma = require('../../src/config/prisma');

// Mock Outbox Event Repository — approval-workflow.service.js ghi outbox trong
// transaction thay vì gọi upsertPublishJob/eventEmitter.emit trực tiếp.
jest.mock('../../src/repositories/core/outbox-event.repository', () => ({
  create: jest.fn().mockResolvedValue({})
}));

// Mock Token Service
jest.mock('../../src/services/auth/token.service', () => ({
  generateAndSaveTokens: jest.fn().mockResolvedValue({
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token'
  })
}));

// Mock Email Service
jest.mock('../../src/services/core/email.service', () => ({
  sendTeamInvitation: jest.fn().mockResolvedValue(true)
}));

// Mock Notification Service (bắt buộc mock vì team.service.js đã gọi notificationService)
jest.mock('../../src/services/core/notification.service', () => ({
  create: jest.fn().mockResolvedValue({ id: 'notif-mock-id' })
}));

// Mock BullMQ Queue calls (chạm tới khi _handleReviewerRemoved auto-approve 1 workflow có scheduledAt)
jest.mock('../../src/queues/publish.queue', () => ({
  publishQueue: { client: { on: jest.fn() } },
  upsertPublishJob: jest.fn().mockResolvedValue(true),
  removePublishJob: jest.fn().mockResolvedValue(true)
}));

const notificationService = require('../../src/services/core/notification.service');
const app = require('../../src/app');

describe('Team Management APIs', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/team', () => {
    it('should return team members with brandId', async () => {
      const mockMembers = [
        {
          id: 'team-1',
          userId: 'user-1',
          role: 'ADMIN',
          status: 'ACTIVE',
          acceptedAt: new Date(),
          user: { id: 'user-1', name: 'User One', email: 'user1@gmail.com', avatarUrl: null },
          invitedBy: { name: 'Owner' }
        }
      ];

      prisma.team.findMany.mockResolvedValue(mockMembers);
      prisma.team.count.mockResolvedValue(1);

      const res = await request(app)
        .get('/api/team')
        .query({ brandId: 'brand-1' });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('User One');
      expect(res.body.data[0].role).toBe('Admin');
    });

    it('should return 400 if brandId is missing', async () => {
      const res = await request(app).get('/api/team');
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/team/invite', () => {
    it('should invite new user and create shell account', async () => {
      const mockBrand = {
        id: 'brand-1',
        name: 'My Brand',
        ownerId: 'operator-id',
        subscription: {
          plan: {
            planLimit: {
              maxTeamSeats: 5
            }
          }
        }
      };

      prisma.brand.findFirst.mockResolvedValue(mockBrand);
      prisma.team.count.mockResolvedValue(1);
      prisma.user.findUnique.mockImplementation(async (query) => {
        if (query.where.id === 'operator-id') {
          return { id: 'operator-id', name: 'Owner' };
        }
        return null;
      });
      prisma.user.create.mockResolvedValue({ id: 'new-user-id', email: 'invitee@gmail.com' });
      
      const mockTeam = {
        id: 'team-invite-id',
        brandId: 'brand-1',
        userId: 'new-user-id',
        role: 'ADMIN',
        status: 'PENDING',
        user: { id: 'new-user-id', name: 'invitee', email: 'invitee@gmail.com' },
        invitedBy: { name: 'Owner' }
      };

      prisma.team.findUnique.mockImplementation(async (query) => {
        if (query.where.id === 'team-invite-id') {
          return mockTeam;
        }
        return null;
      });

      prisma.team.create.mockResolvedValue(mockTeam);
      prisma.team.update.mockResolvedValue(mockTeam);
      prisma.brand.findUnique.mockResolvedValue(mockBrand);

      const res = await request(app)
        .post('/api/team/invite')
        .send({ email: 'invitee@gmail.com', role: 'Admin', brandId: 'brand-1' });

      expect(res.status).toBe(201);
      expect(res.body.message).toContain('Đã xử lý mời thành viên');
      expect(res.body.successes[0].token).toBeDefined();
    });

    it('should support batch invitation of multiple emails', async () => {
      const mockBrand = {
        id: 'brand-1',
        name: 'My Brand',
        ownerId: 'operator-id',
        subscription: {
          plan: {
            planLimit: {
              maxTeamSeats: 5
            }
          }
        }
      };

      prisma.brand.findFirst.mockResolvedValue(mockBrand);
      prisma.team.count.mockResolvedValue(1);
      prisma.user.findUnique.mockImplementation(async (query) => {
        if (query.where.id === 'operator-id') {
          return { id: 'operator-id', name: 'Owner' };
        }
        return null;
      });
      
      prisma.user.create.mockImplementation(async (arg) => {
        return { id: `user-${arg.data.email}`, email: arg.data.email };
      });

      prisma.team.create.mockImplementation(async (arg) => {
        return {
          id: `team-${arg.data.userId}`,
          brandId: arg.data.brandId,
          userId: arg.data.userId,
          role: arg.data.role,
          status: 'PENDING'
        };
      });

      prisma.team.findUnique.mockImplementation(async (query) => {
        const teamId = query.where.id || 'team-id';
        const email = teamId.includes('invitee2') ? 'invitee2@gmail.com' : 'invitee1@gmail.com';
        const userId = `user-${email}`;
        return {
          id: teamId,
          brandId: 'brand-1',
          userId,
          role: 'ADMIN',
          status: 'PENDING',
          user: { id: userId, name: email.split('@')[0], email },
          invitedBy: { name: 'Owner' }
        };
      });

      const res = await request(app)
        .post('/api/team/invite')
        .send({
          emails: ['invitee1@gmail.com', 'invitee2@gmail.com'],
          role: 'Admin',
          brandId: 'brand-1'
        });

      expect(res.status).toBe(201);
      expect(res.body.successes).toHaveLength(2);
      expect(res.body.failures).toHaveLength(0);
      expect(res.body.successes[0].email).toBe('invitee1@gmail.com');
      expect(res.body.successes[1].email).toBe('invitee2@gmail.com');
    });

    it('should create a TEAM notification for the invited user', async () => {
      const mockBrand = {
        id: 'brand-1',
        name: 'My Brand',
        ownerId: 'operator-id',
        subscription: { plan: { planLimit: { maxTeamSeats: 5 } } }
      };

      prisma.brand.findFirst.mockResolvedValue(mockBrand);
      prisma.team.count.mockResolvedValue(1);
      prisma.user.findUnique.mockImplementation(async (query) => {
        if (query.where.id === 'operator-id') return { id: 'operator-id', name: 'Owner' };
        return null;
      });
      prisma.user.create.mockResolvedValue({ id: 'new-user-id', email: 'notify-test@gmail.com' });

      const mockTeam = {
        id: 'team-notif-id',
        brandId: 'brand-1',
        userId: 'new-user-id',
        role: 'USER',
        status: 'PENDING',
        user: { id: 'new-user-id', name: 'notify-test', email: 'notify-test@gmail.com' },
        invitedBy: { name: 'Owner' }
      };

      prisma.team.findUnique.mockResolvedValue(mockTeam);
      prisma.team.create.mockResolvedValue(mockTeam);
      prisma.team.update.mockResolvedValue(mockTeam);
      prisma.brand.findUnique.mockResolvedValue(mockBrand);
      notificationService.create.mockClear();

      await request(app)
        .post('/api/team/invite')
        .send({ email: 'notify-test@gmail.com', role: 'User', brandId: 'brand-1' });

      expect(notificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'new-user-id',
          brandId: 'brand-1',
          type: 'team',
          title: expect.stringContaining('My Brand')
        })
      );
    });
  });

  describe('GET /api/team/invitations/validate', () => {
    it('should return invitation details for valid token', async () => {
      const tokenPayload = { teamId: 'team-invite-id', email: 'invitee@gmail.com', brandId: 'brand-1' };
      const token = jwt.sign(tokenPayload, process.env.ACCESS_TOKEN_SECRET || 'secret123456789012345678901234567890');

      const mockTeam = {
        id: 'team-invite-id',
        status: 'PENDING',
        invitedByUserId: 'operator-id',
        user: { email: 'invitee@gmail.com', passwordHash: '' },
        brand: { name: 'My Brand' }
      };

      prisma.team.findUnique.mockResolvedValue(mockTeam);
      prisma.user.findUnique.mockResolvedValue({ id: 'operator-id', name: 'Owner' });

      const res = await request(app)
        .get('/api/team/invitations/validate')
        .query({ token });

      expect(res.status).toBe(200);
      expect(res.body.email).toBe('invitee@gmail.com');
      expect(res.body.brandName).toBe('My Brand');
      expect(res.body.inviterName).toBe('Owner');
      expect(res.body.isNewUser).toBe(true);
    });
  });

  describe('POST /api/team/invitations/accept', () => {
    it('should activate user and accept team membership', async () => {
      const tokenPayload = { teamId: 'team-invite-id', email: 'invitee@gmail.com', brandId: 'brand-1' };
      const token = jwt.sign(tokenPayload, process.env.ACCESS_TOKEN_SECRET || 'secret123456789012345678901234567890');

      const mockTeam = {
        id: 'team-invite-id',
        status: 'PENDING',
        user: { id: 'new-user-id', email: 'invitee@gmail.com' }
      };

      prisma.team.findUnique.mockResolvedValue(mockTeam);
      prisma.user.update.mockResolvedValue({});
      prisma.team.updateMany.mockResolvedValue({ count: 1 });
      prisma.user.findUnique.mockResolvedValue({ id: 'new-user-id', role: 'USER' });

      const res = await request(app)
        .post('/api/team/invitations/accept')
        .send({ token, name: 'Invitee Name', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
    });

    it('rejects a double-submitted accept (race condition) without a second password write', async () => {
      const tokenPayload = { teamId: 'team-invite-id', email: 'invitee@gmail.com', brandId: 'brand-1' };
      const token = jwt.sign(tokenPayload, process.env.ACCESS_TOKEN_SECRET || 'secret123456789012345678901234567890');

      const mockTeam = {
        id: 'team-invite-id',
        status: 'PENDING',
        user: { id: 'new-user-id', email: 'invitee@gmail.com' }
      };

      // findUnique still sees PENDING (stale read from before the winning
      // request committed), but the atomic updateMany's WHERE status: 'PENDING'
      // no longer matches — simulating the loser of a race.
      prisma.team.findUnique.mockResolvedValue(mockTeam);
      prisma.team.updateMany.mockResolvedValue({ count: 0 });

      const res = await request(app)
        .post('/api/team/invitations/accept')
        .send({ token, name: 'Invitee Name', password: 'password123' });

      expect(res.status).toBe(400);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('PUT /api/team/:id/role', () => {
    it('should update role of a team member', async () => {
      const mockTeam = {
        id: 'team-1',
        brandId: 'brand-1',
        userId: 'user-1',
        role: 'USER',
        status: 'ACTIVE',
        brand: { ownerId: 'operator-id' }
      };
      
      prisma.team.findUnique.mockResolvedValue(mockTeam);
      // authorizationFacade.OwnerStrategy checks brand.ownerId via findFirst, not findUnique.
      prisma.brand.findFirst.mockResolvedValue({ id: 'brand-1', ownerId: 'operator-id' });
      prisma.team.update.mockResolvedValue({
        ...mockTeam,
        role: 'ADMIN',
        user: { name: 'User One', email: 'user1@gmail.com', avatarUrl: null },
        invitedBy: { name: 'Owner' }
      });

      const res = await request(app)
        .put('/api/team/team-1/role')
        .send({ role: 'Admin' });

      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe('Admin');
    });

    it('should create a TEAM notification for the member whose role was updated', async () => {
      const mockTeam = {
        id: 'team-1',
        brandId: 'brand-1',
        userId: 'user-1',
        role: 'USER',
        status: 'ACTIVE',
        brand: { ownerId: 'operator-id' }
      };

      prisma.team.findUnique.mockResolvedValue(mockTeam);
      // authorizationFacade.OwnerStrategy checks brand.ownerId via findFirst, not findUnique.
      prisma.brand.findFirst.mockResolvedValue({ id: 'brand-1', ownerId: 'operator-id' });
      prisma.customRole.findFirst.mockResolvedValue(null);
      prisma.team.update.mockResolvedValue({
        ...mockTeam,
        role: 'ADMIN',
        user: { name: 'User One', email: 'user1@gmail.com', avatarUrl: null },
        invitedBy: { name: 'Owner' }
      });
      notificationService.create.mockClear();

      await request(app)
        .put('/api/team/team-1/role')
        .send({ role: 'Admin' });

      expect(notificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          brandId: 'brand-1',
          type: 'team',
          title: 'Vai trò của bạn đã được cập nhật'
        })
      );
    });

    it('should reject a non-owner ADMIN whose CustomRole has revoked MANAGE_TEAM (regression: previously bypassed via legacy role field)', async () => {
      const mockTeam = {
        id: 'team-1',
        brandId: 'brand-1',
        userId: 'user-1',
        role: 'USER',
        status: 'ACTIVE',
        brand: { ownerId: 'someone-else-id' }
      };

      prisma.team.findUnique.mockResolvedValue(mockTeam);
      // Operator is NOT the brand owner (OwnerStrategy queries via findFirst)...
      prisma.brand.findFirst.mockResolvedValue(null);
      // ...but is a legacy 'ADMIN' team member with a CustomRole assigned...
      prisma.team.findFirst.mockResolvedValue(null); // not matched by DefaultRoleStrategy's old ADMIN-only lookup
      prisma.team.findUnique.mockImplementation((args) => {
        if (args?.where?.brandId_userId) {
          // authorizationFacade membership lookup for the operator
          return Promise.resolve({
            brandId: 'brand-1',
            userId: 'operator-id',
            status: 'ACTIVE',
            role: 'ADMIN',
            customRoleId: 'custom-role-revoked'
          });
        }
        return Promise.resolve(mockTeam); // teamRepository.findById(id) lookup for the target
      });
      // ...and that CustomRole has explicitly revoked MANAGE_TEAM.
      prisma.customRolePermission.findUnique.mockResolvedValue({ isAllowed: false });

      const res = await request(app)
        .put('/api/team/team-1/role')
        .send({ role: 'Analyst' });

      expect(res.status).toBe(403);
      expect(prisma.team.update).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/team/:id', () => {
    it('should remove member from team', async () => {
      const mockTeam = {
        id: 'team-1',
        brandId: 'brand-1',
        userId: 'user-1',
        brand: { ownerId: 'operator-id' }
      };

      prisma.team.findUnique.mockResolvedValue(mockTeam);
      prisma.brand.findFirst.mockResolvedValue({ id: 'brand-1', ownerId: 'operator-id' });
      prisma.team.delete.mockResolvedValue({});

      const res = await request(app).delete('/api/team/team-1');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Đã xóa thành viên khỏi thương hiệu thành công');
    });

    it('should auto-approve the workflow when policy is ALL and remaining reviewers have all approved', async () => {
      const mockTeam = {
        id: 'team-1',
        brandId: 'brand-1',
        userId: 'user-1',
        brand: { ownerId: 'operator-id' }
      };
      const mockWorkflowReviewerRecord = {
        id: 'wr-1',
        workflowId: 'wf-1',
        reviewerId: 'user-1',
        status: 'PENDING',
        workflow: {
          id: 'wf-1',
          brandId: 'brand-1',
          postId: 'post-1',
          status: 'PENDING',
          approvalPolicy: 'ALL',
          post: { id: 'post-1', title: 'Bài viết cần duyệt' },
          requester: { id: 'requester-id', name: 'Requester User' }
        }
      };

      prisma.team.findUnique.mockResolvedValue(mockTeam);
      prisma.brand.findFirst.mockResolvedValue({ id: 'brand-1', ownerId: 'operator-id' });
      prisma.team.delete.mockResolvedValue({});
      prisma.workflowReviewer.findMany.mockResolvedValueOnce([mockWorkflowReviewerRecord]); // affectedReviewers lookup
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', name: 'Removed User' });

      // Bên trong transaction: reevaluateAfterReviewerRemoved đọc lại workflow + decisions còn lại (đều APPROVED)
      prisma.approvalWorkflow.findUnique.mockResolvedValue({
        id: 'wf-1',
        postId: 'post-1',
        status: 'PENDING',
        approvalPolicy: 'ALL',
        post: { id: 'post-1' } // không có scheduledAt -> APPROVED thay vì SCHEDULED
      });
      prisma.workflowReviewer.findMany.mockResolvedValueOnce([
        { reviewerId: 'other-reviewer-id', status: 'APPROVED' }
      ]); // decisions còn lại sau khi xóa user-1, tất cả đã APPROVED
      prisma.approvalWorkflow.update.mockResolvedValue({ id: 'wf-1', status: 'APPROVED' });
      prisma.workflowReviewer.count.mockResolvedValue(1);
      prisma.post.findUnique.mockResolvedValue({ id: 'post-1', status: 'APPROVED' });

      const res = await request(app).delete('/api/team/team-1');

      expect(res.status).toBe(200);
      expect(prisma.approvalWorkflow.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'wf-1' },
          data: expect.objectContaining({ status: 'APPROVED' })
        })
      );
      expect(prisma.post.update).toHaveBeenCalledWith({ where: { id: 'post-1' }, data: { status: 'APPROVED' } });
    });

    it('should lock the workflow row (FOR UPDATE) before removing the reviewer', async () => {
      const mockTeam = {
        id: 'team-1',
        brandId: 'brand-1',
        userId: 'user-1',
        brand: { ownerId: 'operator-id' }
      };
      const mockWorkflowReviewerRecord = {
        id: 'wr-1',
        workflowId: 'wf-1',
        reviewerId: 'user-1',
        status: 'PENDING',
        workflow: {
          id: 'wf-1',
          brandId: 'brand-1',
          postId: 'post-1',
          status: 'PENDING',
          approvalPolicy: 'AT_LEAST_ONE',
          post: { id: 'post-1', title: 'Bài viết cần duyệt' },
          requester: { id: 'requester-id', name: 'Requester User' }
        }
      };

      prisma.team.findUnique.mockResolvedValue(mockTeam);
      prisma.brand.findFirst.mockResolvedValue({ id: 'brand-1', ownerId: 'operator-id' });
      prisma.team.delete.mockResolvedValue({});
      prisma.workflowReviewer.findMany.mockResolvedValueOnce([mockWorkflowReviewerRecord]);
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', name: 'Removed User' });
      prisma.approvalWorkflow.findUnique.mockResolvedValue({
        id: 'wf-1',
        postId: 'post-1',
        status: 'PENDING',
        approvalPolicy: 'AT_LEAST_ONE',
        post: { id: 'post-1' }
      });
      prisma.workflowReviewer.findMany.mockResolvedValueOnce([]); // không còn ai duyệt -> chưa thỏa AT_LEAST_ONE
      prisma.workflowReviewer.count.mockResolvedValue(0);

      await request(app).delete('/api/team/team-1');

      expect(prisma.$queryRaw).toHaveBeenCalled();
    });
  });
});
