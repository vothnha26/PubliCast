/**
 * Unit tests for AuthorizationFacade — the single source of truth for
 * "can this user do X in this brand" checks used across team invite/role/
 * remove flows (and beyond). Covers all three strategies it composes:
 * OwnerStrategy, CustomRoleStrategy, and the DefaultRoleStrategy matrix
 * (ADMIN/USER/ANALYST), plus the precedence order between them.
 */
jest.mock('../../src/config/prisma', () => ({
  brand: { findFirst: jest.fn() },
  team: { findUnique: jest.fn() },
  customRolePermission: { findUnique: jest.fn() }
}));

const prisma = require('../../src/config/prisma');
const authorizationFacade = require('../../src/services/auth/authorization.facade');
const { PERMISSION_KEYS } = require('../../src/utils/constants');

describe('AuthorizationFacade.checkPermission', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns false immediately when userId, brandId, or permissionKey is missing', async () => {
    expect(await authorizationFacade.checkPermission(null, 'brand-1', PERMISSION_KEYS.MANAGE_TEAM)).toBe(false);
    expect(await authorizationFacade.checkPermission('user-1', null, PERMISSION_KEYS.MANAGE_TEAM)).toBe(false);
    expect(await authorizationFacade.checkPermission('user-1', 'brand-1', null)).toBe(false);
    expect(prisma.brand.findFirst).not.toHaveBeenCalled();
  });

  it('grants any permission to the brand owner without consulting team membership', async () => {
    prisma.brand.findFirst.mockResolvedValue({ id: 'brand-1', ownerId: 'owner-1' });

    const result = await authorizationFacade.checkPermission('owner-1', 'brand-1', PERMISSION_KEYS.MANAGE_BILLING);

    expect(result).toBe(true);
    expect(prisma.team.findUnique).not.toHaveBeenCalled();
  });

  it('denies access when the user is not the owner and has no team membership', async () => {
    prisma.brand.findFirst.mockResolvedValue(null);
    prisma.team.findUnique.mockResolvedValue(null);

    const result = await authorizationFacade.checkPermission('stranger-1', 'brand-1', PERMISSION_KEYS.VIEW_ANALYTICS);

    expect(result).toBe(false);
  });

  it('denies access when membership exists but is not ACTIVE (e.g. still PENDING)', async () => {
    prisma.brand.findFirst.mockResolvedValue(null);
    prisma.team.findUnique.mockResolvedValue({ role: 'ADMIN', status: 'PENDING', customRoleId: null });

    const result = await authorizationFacade.checkPermission('user-1', 'brand-1', PERMISSION_KEYS.MANAGE_TEAM);

    expect(result).toBe(false);
  });

  describe('DefaultRoleStrategy matrix', () => {
    beforeEach(() => {
      prisma.brand.findFirst.mockResolvedValue(null);
    });

    it('ADMIN has MANAGE_TEAM, MANAGE_ROLES, and APPROVE_POSTS', async () => {
      prisma.team.findUnique.mockResolvedValue({ role: 'ADMIN', status: 'ACTIVE', customRoleId: null });

      expect(await authorizationFacade.checkPermission('u', 'b', PERMISSION_KEYS.MANAGE_TEAM)).toBe(true);
      expect(await authorizationFacade.checkPermission('u', 'b', PERMISSION_KEYS.MANAGE_ROLES)).toBe(true);
      expect(await authorizationFacade.checkPermission('u', 'b', PERMISSION_KEYS.APPROVE_POSTS)).toBe(true);
    });

    it('USER (Member) can create posts and manage media but cannot manage team or approve posts', async () => {
      prisma.team.findUnique.mockResolvedValue({ role: 'USER', status: 'ACTIVE', customRoleId: null });

      expect(await authorizationFacade.checkPermission('u', 'b', PERMISSION_KEYS.CREATE_POSTS)).toBe(true);
      expect(await authorizationFacade.checkPermission('u', 'b', PERMISSION_KEYS.MANAGE_MEDIA)).toBe(true);
      expect(await authorizationFacade.checkPermission('u', 'b', PERMISSION_KEYS.MANAGE_TEAM)).toBe(false);
      expect(await authorizationFacade.checkPermission('u', 'b', PERMISSION_KEYS.APPROVE_POSTS)).toBe(false);
      expect(await authorizationFacade.checkPermission('u', 'b', PERMISSION_KEYS.DELETE_POSTS)).toBe(false);
    });

    it('ANALYST can only view analytics — every write/manage permission is denied', async () => {
      prisma.team.findUnique.mockResolvedValue({ role: 'ANALYST', status: 'ACTIVE', customRoleId: null });

      expect(await authorizationFacade.checkPermission('u', 'b', PERMISSION_KEYS.VIEW_ANALYTICS)).toBe(true);
      expect(await authorizationFacade.checkPermission('u', 'b', PERMISSION_KEYS.CREATE_POSTS)).toBe(false);
      expect(await authorizationFacade.checkPermission('u', 'b', PERMISSION_KEYS.MANAGE_TEAM)).toBe(false);
      expect(await authorizationFacade.checkPermission('u', 'b', PERMISSION_KEYS.MANAGE_CONNECTIONS)).toBe(false);
    });

    it('denies (fails closed) for an unrecognized role not present in the matrix', async () => {
      prisma.team.findUnique.mockResolvedValue({ role: 'SOME_FUTURE_ROLE', status: 'ACTIVE', customRoleId: null });

      const result = await authorizationFacade.checkPermission('u', 'b', PERMISSION_KEYS.VIEW_ANALYTICS);

      expect(result).toBe(false);
    });
  });

  describe('CustomRoleStrategy', () => {
    beforeEach(() => {
      prisma.brand.findFirst.mockResolvedValue(null);
    });

    it('takes precedence over the default role matrix when customRoleId is set', async () => {
      prisma.team.findUnique.mockResolvedValue({ role: 'USER', status: 'ACTIVE', customRoleId: 'custom-role-1' });
      prisma.customRolePermission.findUnique.mockResolvedValue({ isAllowed: true });

      // Default USER matrix denies MANAGE_TEAM, but the custom role explicitly grants it.
      const result = await authorizationFacade.checkPermission('u', 'b', PERMISSION_KEYS.MANAGE_TEAM);

      expect(result).toBe(true);
      expect(prisma.customRolePermission.findUnique).toHaveBeenCalledWith({
        where: { roleId_permissionKey: { roleId: 'custom-role-1', permissionKey: PERMISSION_KEYS.MANAGE_TEAM } }
      });
    });

    it('denies when the custom role permission row explicitly has isAllowed: false', async () => {
      prisma.team.findUnique.mockResolvedValue({ role: 'ADMIN', status: 'ACTIVE', customRoleId: 'custom-role-1' });
      prisma.customRolePermission.findUnique.mockResolvedValue({ isAllowed: false });

      // Even though legacy role is ADMIN, an explicit custom-role revocation wins.
      const result = await authorizationFacade.checkPermission('u', 'b', PERMISSION_KEYS.MANAGE_TEAM);

      expect(result).toBe(false);
    });

    it('denies when no CustomRolePermission row exists for this key (fail closed, no fallback to default matrix)', async () => {
      prisma.team.findUnique.mockResolvedValue({ role: 'ADMIN', status: 'ACTIVE', customRoleId: 'custom-role-1' });
      prisma.customRolePermission.findUnique.mockResolvedValue(null);

      const result = await authorizationFacade.checkPermission('u', 'b', PERMISSION_KEYS.MANAGE_TEAM);

      expect(result).toBe(false);
    });
  });
});

describe('AuthorizationFacade.checkBrandAccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('grants access to the owner without a team lookup', async () => {
    prisma.brand.findFirst.mockResolvedValue({ id: 'brand-1', ownerId: 'owner-1' });

    expect(await authorizationFacade.checkBrandAccess('owner-1', 'brand-1')).toBe(true);
    expect(prisma.team.findUnique).not.toHaveBeenCalled();
  });

  it('grants access to an ACTIVE member regardless of role', async () => {
    prisma.brand.findFirst.mockResolvedValue(null);
    prisma.team.findUnique.mockResolvedValue({ role: 'ANALYST', status: 'ACTIVE' });

    expect(await authorizationFacade.checkBrandAccess('user-1', 'brand-1')).toBe(true);
  });

  it('denies access to a PENDING (not-yet-accepted) member', async () => {
    prisma.brand.findFirst.mockResolvedValue(null);
    prisma.team.findUnique.mockResolvedValue({ role: 'ADMIN', status: 'PENDING' });

    expect(await authorizationFacade.checkBrandAccess('user-1', 'brand-1')).toBe(false);
  });
});
