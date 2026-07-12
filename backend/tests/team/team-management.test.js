const request = require('supertest');
const app = require('../../src/app');
const jwt = require('jsonwebtoken');

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
  const mockWorkflowReviewer = {
    findMany: jest.fn().mockResolvedValue([]),
    delete: jest.fn().mockResolvedValue({}),
    count: jest.fn().mockResolvedValue(0)
  };

  return {
    brand: mockBrand,
    team: mockTeam,
    user: mockUser,
    userAccount: mockUserAccount,
    customRole: mockCustomRole,
    workflowReviewer: mockWorkflowReviewer
  };
});

const prisma = require('../../src/config/prisma');

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

const notificationService = require('../../src/services/core/notification.service');

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
      prisma.team.update.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue({ id: 'new-user-id', role: 'USER' });

      const res = await request(app)
        .post('/api/team/invitations/accept')
        .send({ token, name: 'Invitee Name', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
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
      prisma.brand.findUnique.mockResolvedValue({ id: 'brand-1', ownerId: 'operator-id' });
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
      prisma.brand.findUnique.mockResolvedValue({ id: 'brand-1', ownerId: 'operator-id' });
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
      prisma.brand.findUnique.mockResolvedValue({ id: 'brand-1', ownerId: 'operator-id' });
      prisma.team.delete.mockResolvedValue({});

      const res = await request(app).delete('/api/team/team-1');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Đã xóa thành viên khỏi thương hiệu thành công');
    });
  });
});
