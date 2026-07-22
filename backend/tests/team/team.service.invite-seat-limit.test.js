/**
 * Regression tests for #60: inviteMember/inviteMembers must re-check the
 * team-seat limit behind a row lock inside a transaction, not just via a
 * plain count-then-act read before the write. Two concurrent invites that
 * both read a count under maxSeats must not both be allowed to write.
 */
jest.mock('../../src/config/prisma', () => ({
  $transaction: jest.fn(async (fn) => fn({ __tx: true }))
}));
jest.mock('../../src/repositories/workspace/team.repository', () => ({
  countMembersByBrand: jest.fn(),
  findByBrandAndUserId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  findById: jest.fn()
}));
jest.mock('../../src/repositories/workspace/brand.repository', () => ({
  findBrandWithSubscription: jest.fn()
}));
jest.mock('../../src/repositories/billing/subscription.repository', () => ({
  lockSubscriptionForUpdate: jest.fn().mockResolvedValue(undefined)
}));
jest.mock('../../src/repositories/auth/user.repository', () => ({
  findByEmail: jest.fn(),
  createShellUser: jest.fn(),
  findById: jest.fn()
}));
jest.mock('../../src/services/auth/authorization.facade', () => ({
  checkPermission: jest.fn()
}));
jest.mock('../../src/services/workspace/role-resolver', () => ({
  resolve: jest.fn()
}));
jest.mock('../../src/services/core/notification.service', () => ({
  create: jest.fn().mockResolvedValue(undefined)
}));
jest.mock('../../src/services/core/email.service', () => ({
  sendTeamInvitation: jest.fn().mockResolvedValue(undefined)
}));

const teamService = require('../../src/services/workspace/team.service');
const teamRepository = require('../../src/repositories/workspace/team.repository');
const brandRepository = require('../../src/repositories/workspace/brand.repository');
const subscriptionRepository = require('../../src/repositories/billing/subscription.repository');
const userRepository = require('../../src/repositories/auth/user.repository');
const authorizationFacade = require('../../src/services/auth/authorization.facade');
const roleResolver = require('../../src/services/workspace/role-resolver');

function brandWithMaxSeats(maxTeamSeats) {
  return {
    id: 'brand-1',
    name: 'Test Brand',
    subscription: { plan: { planLimit: { maxTeamSeats } } }
  };
}

describe('inviteMember seat limit re-check (#60)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    brandRepository.findBrandWithSubscription.mockResolvedValue(brandWithMaxSeats(5));
    authorizationFacade.checkPermission.mockResolvedValue(true);
    roleResolver.resolve.mockResolvedValue({ dbRole: 'MEMBER', customRoleId: null });
    userRepository.findByEmail.mockResolvedValue(null);
    userRepository.createShellUser.mockResolvedValue({ id: 'user-2', email: 'new@example.com' });
    userRepository.findById.mockResolvedValue({ id: 'user-1', name: 'Inviter' });
    teamRepository.findByBrandAndUserId.mockResolvedValue(null);
    teamRepository.create.mockResolvedValue({ id: 'team-1' });
    teamRepository.findById.mockResolvedValue({
      id: 'team-1', userId: 'user-2', role: 'MEMBER', status: 'PENDING',
      user: { name: 'New User', email: 'new@example.com', avatarUrl: null }
    });
    process.env.ACCESS_TOKEN_SECRET = 'test-secret';
  });

  it('locks the subscription row and re-checks the seat count inside the transaction before creating', async () => {
    teamRepository.countMembersByBrand.mockResolvedValue(4); // under the limit of 5

    await teamService.inviteMember({ email: 'new@example.com', role: 'MEMBER', brandId: 'brand-1', invitedByUserId: 'user-1' });

    expect(subscriptionRepository.lockSubscriptionForUpdate).toHaveBeenCalledWith('brand-1', expect.objectContaining({ __tx: true }));
    expect(teamRepository.countMembersByBrand).toHaveBeenCalledWith('brand-1', expect.objectContaining({ __tx: true }));
    expect(teamRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ brandId: 'brand-1', userId: 'user-2' }),
      expect.objectContaining({ __tx: true })
    );
  });

  it('rejects when the locked re-check finds the seat limit already reached', async () => {
    teamRepository.countMembersByBrand.mockResolvedValue(5); // at the limit

    await expect(teamService.inviteMember({
      email: 'new@example.com', role: 'MEMBER', brandId: 'brand-1', invitedByUserId: 'user-1'
    })).rejects.toMatchObject({ status: 402 });

    expect(teamRepository.create).not.toHaveBeenCalled();
  });
});

describe('inviteMembers bulk seat limit re-check (#60)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    brandRepository.findBrandWithSubscription.mockResolvedValue(brandWithMaxSeats(5));
    authorizationFacade.checkPermission.mockResolvedValue(true);
    roleResolver.resolve.mockResolvedValue({ dbRole: 'MEMBER', customRoleId: null });
    userRepository.findByEmail.mockResolvedValue(null);
    userRepository.createShellUser.mockImplementation((email) => Promise.resolve({ id: `user-${email}`, email }));
    userRepository.findById.mockResolvedValue({ id: 'user-1', name: 'Inviter' });
    teamRepository.findByBrandAndUserId.mockResolvedValue(null);
    teamRepository.create.mockResolvedValue({ id: 'team-x' });
    process.env.ACCESS_TOKEN_SECRET = 'test-secret';
  });

  it('re-checks the seat count per-invite inside the lock, failing individual invites once the limit is hit mid-loop', async () => {
    // Pre-flight remainingSeats = 5 - 3 = 2, and 2 emails <= 2, so the
    // pre-flight check alone would let both through. Simulate a concurrent
    // invite landing between the pre-flight check and the loop by having the
    // locked re-check report the limit is already reached for both.
    teamRepository.countMembersByBrand.mockResolvedValue(3).mockResolvedValueOnce(3);
    teamRepository.countMembersByBrand.mockResolvedValue(5); // locked re-check: limit already hit

    const result = await teamService.inviteMembers({
      emails: ['a@example.com', 'b@example.com'],
      role: 'MEMBER',
      brandId: 'brand-1',
      invitedByUserId: 'user-1'
    });

    expect(result.failures.length).toBe(2);
    expect(teamRepository.create).not.toHaveBeenCalled();
  });
});
