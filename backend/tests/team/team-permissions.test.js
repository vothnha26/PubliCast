/**
 * Covers team-flow permission/role branches not exercised by
 * team-management.test.js: permission-denied paths for invite/role/remove,
 * the "cannot remove the brand owner" guard, inviting an email that is
 * already an ACTIVE member, and the resendInvitation endpoint (which
 * previously had no test coverage at all).
 */
const request = require('supertest');

jest.mock('otplib', () => ({
  authenticator: { generate: jest.fn(), verify: jest.fn() }
}));

jest.mock('../../src/middlewares/auth.middleware', () => {
  const verifyAuth = (req, res, next) => {
    req.user = { id: 'operator-id', email: 'operator@publicast.com' };
    next();
  };
  return { verifyAuth, verifyAuthFromQuery: verifyAuth };
});

jest.mock('../../src/config/prisma', () => {
  const mockBrand = { findFirst: jest.fn(), findUnique: jest.fn() };
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
  const mockUser = { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() };
  const mockCustomRole = { findFirst: jest.fn(), findUnique: jest.fn() };
  const mockCustomRolePermission = { findUnique: jest.fn() };
  const mockWorkflowReviewer = {
    findMany: jest.fn().mockResolvedValue([]),
    delete: jest.fn().mockResolvedValue({}),
    count: jest.fn().mockResolvedValue(0)
  };

  const mockPrisma = {
    brand: mockBrand,
    team: mockTeam,
    user: mockUser,
    customRole: mockCustomRole,
    customRolePermission: mockCustomRolePermission,
    workflowReviewer: mockWorkflowReviewer,
    approvalWorkflow: { findUnique: jest.fn(), update: jest.fn() },
    post: { update: jest.fn(), findUnique: jest.fn() },
    $queryRaw: jest.fn().mockResolvedValue([]),
    $transaction: jest.fn().mockImplementation((callback) => callback(mockPrisma))
  };

  return mockPrisma;
});

const prisma = require('../../src/config/prisma');

jest.mock('../../src/repositories/core/outbox-event.repository', () => ({
  create: jest.fn().mockResolvedValue({})
}));
jest.mock('../../src/services/integrations/integration-client.service', () => ({
  findAllActiveWithWebhook: jest.fn().mockResolvedValue([])
}));
jest.mock('../../src/services/auth/token.service', () => ({
  generateAndSaveTokens: jest.fn().mockResolvedValue({ accessToken: 'a', refreshToken: 'b' })
}));
jest.mock('../../src/services/core/email.service', () => ({
  sendTeamInvitation: jest.fn().mockResolvedValue(true)
}));
jest.mock('../../src/services/core/notification.service', () => ({
  create: jest.fn().mockResolvedValue({ id: 'notif-mock-id' })
}));
jest.mock('../../src/services/workspace/post/publish-qstash.service', () => ({
  upsertPublishJob: jest.fn().mockResolvedValue(true),
  removePublishJob: jest.fn().mockResolvedValue(true),
  enqueueImmediate: jest.fn().mockResolvedValue('msg-mock')
}));

const emailService = require('../../src/services/core/email.service');
const app = require('../../src/app');

describe('Team flow — permission-denied branches', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/team/invite', () => {
    it('rejects with 403 when the operator (a non-owner MEMBER) lacks MANAGE_TEAM', async () => {
      const mockBrand = {
        id: 'brand-1',
        name: 'My Brand',
        ownerId: 'someone-else-id',
        subscription: { plan: { planLimit: { maxTeamSeats: 5 } } }
      };
      prisma.brand.findFirst.mockResolvedValue(null); // operator is not the owner
      prisma.team.findUnique.mockImplementation((args) => {
        if (args?.where?.brandId_userId) {
          return Promise.resolve({ brandId: 'brand-1', userId: 'operator-id', status: 'ACTIVE', role: 'USER', customRoleId: null });
        }
        return Promise.resolve(null);
      });

      // brandRepository.findBrandWithSubscription is called before the
      // permission check in inviteMember, so it must resolve regardless.
      const brandRepository = require('../../src/repositories/workspace/brand.repository');
      jest.spyOn(brandRepository, 'findBrandWithSubscription').mockResolvedValue(mockBrand);

      const res = await request(app)
        .post('/api/team/invite')
        .send({ email: 'invitee@gmail.com', role: 'Admin', brandId: 'brand-1' });

      expect(res.status).toBe(403);
      expect(prisma.team.create).not.toHaveBeenCalled();
    });

    it('reports the invited email as a failure (already an ACTIVE member) inside the batch response, without creating a duplicate membership', async () => {
      const mockBrand = {
        id: 'brand-1',
        name: 'My Brand',
        ownerId: 'operator-id',
        subscription: { plan: { planLimit: { maxTeamSeats: 5 } } }
      };
      const brandRepository = require('../../src/repositories/workspace/brand.repository');
      jest.spyOn(brandRepository, 'findBrandWithSubscription').mockResolvedValue(mockBrand);
      prisma.brand.findFirst.mockResolvedValue({ id: 'brand-1', ownerId: 'operator-id' }); // operator is owner -> authorized

      const userRepository = require('../../src/repositories/auth/user.repository');
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue({ id: 'existing-user-id', email: 'already@gmail.com' });

      const teamRepository = require('../../src/repositories/workspace/team.repository');
      jest.spyOn(teamRepository, 'findByBrandAndUserId').mockResolvedValue({
        id: 'team-existing', status: 'ACTIVE', userId: 'existing-user-id'
      });

      const res = await request(app)
        .post('/api/team/invite')
        .send({ email: 'already@gmail.com', role: 'Admin', brandId: 'brand-1' });

      // POST /api/team/invite always routes through inviteMembers (batch path),
      // even for a single email — see team.controller.js#inviteMember. A
      // per-email failure is reported inside the 201 batch envelope, not as
      // an HTTP error status.
      expect(res.status).toBe(201);
      expect(res.body.successes).toHaveLength(0);
      expect(res.body.failures).toHaveLength(1);
      expect(res.body.failures[0].message).toContain('đã là thành viên');
      expect(prisma.team.create).not.toHaveBeenCalled();
    });
  });

  describe('PUT /api/team/:id/role', () => {
    it('rejects with 403 when the operator is a plain MEMBER (no MANAGE_TEAM)', async () => {
      const mockTeam = {
        id: 'team-1', brandId: 'brand-1', userId: 'user-1', role: 'USER', status: 'ACTIVE',
        brand: { ownerId: 'someone-else-id' }
      };
      prisma.brand.findFirst.mockResolvedValue(null); // operator not owner
      prisma.team.findUnique.mockImplementation((args) => {
        if (args?.where?.brandId_userId) {
          return Promise.resolve({ brandId: 'brand-1', userId: 'operator-id', status: 'ACTIVE', role: 'USER', customRoleId: null });
        }
        return Promise.resolve(mockTeam);
      });

      const res = await request(app).put('/api/team/team-1/role').send({ role: 'Admin' });

      expect(res.status).toBe(403);
      expect(prisma.team.update).not.toHaveBeenCalled();
    });

    it('returns 404 when the target team member does not exist', async () => {
      prisma.team.findUnique.mockResolvedValue(null);

      const res = await request(app).put('/api/team/nonexistent-id/role').send({ role: 'Admin' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/team/:id', () => {
    it('rejects with 400 and refuses to delete when the target is the brand owner', async () => {
      const mockTeam = {
        id: 'team-owner', brandId: 'brand-1', userId: 'owner-1',
        brand: { ownerId: 'owner-1' }
      };
      prisma.team.findUnique.mockResolvedValue(mockTeam);
      prisma.brand.findFirst.mockResolvedValue({ id: 'brand-1', ownerId: 'operator-id' }); // operator authorized as brand owner (different user)

      const res = await request(app).delete('/api/team/team-owner');

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Không thể xóa chủ sở hữu');
      expect(prisma.team.delete).not.toHaveBeenCalled();
    });

    it('rejects with 403 when the operator (plain MEMBER) lacks MANAGE_TEAM', async () => {
      const mockTeam = {
        id: 'team-1', brandId: 'brand-1', userId: 'user-1',
        brand: { ownerId: 'someone-else-id' }
      };
      prisma.brand.findFirst.mockResolvedValue(null);
      prisma.team.findUnique.mockImplementation((args) => {
        if (args?.where?.brandId_userId) {
          return Promise.resolve({ brandId: 'brand-1', userId: 'operator-id', status: 'ACTIVE', role: 'USER', customRoleId: null });
        }
        return Promise.resolve(mockTeam);
      });

      const res = await request(app).delete('/api/team/team-1');

      expect(res.status).toBe(403);
      expect(prisma.team.delete).not.toHaveBeenCalled();
    });

    it('returns 404 when the target team member does not exist', async () => {
      prisma.team.findUnique.mockResolvedValue(null);

      const res = await request(app).delete('/api/team/nonexistent-id');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/team/:id/resend-invite', () => {
    it('resends the invitation email for a PENDING member and returns 200', async () => {
      const mockTeam = {
        id: 'team-1', brandId: 'brand-1', status: 'PENDING',
        user: { email: 'invitee@gmail.com' }
      };
      prisma.team.findUnique.mockResolvedValue(mockTeam);
      prisma.brand.findFirst.mockResolvedValue({ id: 'brand-1', ownerId: 'operator-id' });
      const brandRepository = require('../../src/repositories/workspace/brand.repository');
      jest.spyOn(brandRepository, 'findBrandWithSubscription').mockResolvedValue({ id: 'brand-1', name: 'My Brand' });
      const userRepository = require('../../src/repositories/auth/user.repository');
      jest.spyOn(userRepository, 'findById').mockResolvedValue({ id: 'operator-id', name: 'Owner' });
      process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'test-secret';

      const res = await request(app).post('/api/team/team-1/resend-invite');

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('invitee@gmail.com');
      expect(emailService.sendTeamInvitation).toHaveBeenCalledWith(
        'invitee@gmail.com', 'Owner', 'My Brand', expect.stringContaining('/invite?token='), true
      );
    });

    it('rejects with 400 when the target member is already ACTIVE (not pending)', async () => {
      const mockTeam = { id: 'team-1', brandId: 'brand-1', status: 'ACTIVE', user: { email: 'already@gmail.com' } };
      prisma.team.findUnique.mockResolvedValue(mockTeam);

      const res = await request(app).post('/api/team/team-1/resend-invite');

      expect(res.status).toBe(400);
      expect(emailService.sendTeamInvitation).not.toHaveBeenCalled();
    });

    it('rejects with 403 when the operator lacks MANAGE_TEAM for a PENDING member', async () => {
      const mockTeam = { id: 'team-1', brandId: 'brand-1', status: 'PENDING', user: { email: 'invitee@gmail.com' } };
      prisma.brand.findFirst.mockResolvedValue(null); // operator not owner
      prisma.team.findUnique.mockImplementation((args) => {
        if (args?.where?.brandId_userId) {
          return Promise.resolve({ brandId: 'brand-1', userId: 'operator-id', status: 'ACTIVE', role: 'USER', customRoleId: null });
        }
        return Promise.resolve(mockTeam);
      });

      const res = await request(app).post('/api/team/team-1/resend-invite');

      expect(res.status).toBe(403);
      expect(emailService.sendTeamInvitation).not.toHaveBeenCalled();
    });

    it('returns 404 when the target member does not exist', async () => {
      prisma.team.findUnique.mockResolvedValue(null);

      const res = await request(app).post('/api/team/nonexistent-id/resend-invite');

      expect(res.status).toBe(404);
    });
  });
});
