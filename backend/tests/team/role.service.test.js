/**
 * Unit tests for RoleService (custom role / permission creation flow) —
 * covers branches not exercised by tests/team/custom-roles.test.js, which
 * only tests the HTTP happy paths + a couple of validation cases directly
 * against a mocked Prisma. Here we mock authorizationFacade and
 * roleRepository directly to isolate RoleService's own business rules:
 * permission gate (MANAGE_ROLES), duplicate-name rejection on create,
 * cross-brand 404s, and field validation.
 */
jest.mock('../../src/repositories/workspace/role.repository', () => ({
  findManyByBrandId: jest.fn(),
  findById: jest.fn(),
  findByName: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
}));
jest.mock('../../src/services/auth/authorization.facade', () => ({
  checkPermission: jest.fn()
}));
jest.mock('../../src/config/prisma', () => ({
  brand: { findUnique: jest.fn() }
}));

const roleService = require('../../src/services/workspace/role.service');
const roleRepository = require('../../src/repositories/workspace/role.repository');
const authorizationFacade = require('../../src/services/auth/authorization.facade');
const prisma = require('../../src/config/prisma');
const { PERMISSION_KEYS } = require('../../src/utils/constants');

function brandAllowingCustomRoles() {
  return {
    id: 'brand-1',
    subscription: { plan: { planLimit: { allowCustomRoles: true } } }
  };
}

describe('RoleService.createRole', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authorizationFacade.checkPermission.mockResolvedValue(true);
    prisma.brand.findUnique.mockResolvedValue(brandAllowingCustomRoles());
    roleRepository.findByName.mockResolvedValue(null);
    roleRepository.create.mockResolvedValue({ id: 'role-new', name: 'Manager' });
  });

  it('rejects with 403 when the operator lacks MANAGE_ROLES, without touching the DB', async () => {
    authorizationFacade.checkPermission.mockResolvedValue(false);

    await expect(roleService.createRole('brand-1', { name: 'Manager', colorHex: '#FFFFFF', permissions: [] }, 'operator-1'))
      .rejects.toMatchObject({ status: 403 });

    expect(authorizationFacade.checkPermission).toHaveBeenCalledWith('operator-1', 'brand-1', PERMISSION_KEYS.MANAGE_ROLES);
    expect(prisma.brand.findUnique).not.toHaveBeenCalled();
    expect(roleRepository.create).not.toHaveBeenCalled();
  });

  it('rejects an unrecognized permissionKey before checking plan or DB state', async () => {
    await expect(roleService.createRole('brand-1', {
      name: 'Manager', colorHex: '#FFFFFF', permissions: [{ permissionKey: 'NOT_A_REAL_KEY', isAllowed: true }]
    }, 'operator-1')).rejects.toMatchObject({ status: 400 });

    expect(roleRepository.create).not.toHaveBeenCalled();
  });

  it('rejects with 404 when the brand does not exist', async () => {
    prisma.brand.findUnique.mockResolvedValue(null);

    await expect(roleService.createRole('brand-1', { name: 'Manager', colorHex: '#FFFFFF', permissions: [] }, 'operator-1'))
      .rejects.toMatchObject({ status: 404 });
  });

  it('rejects with 403 when the plan does not allow custom roles', async () => {
    prisma.brand.findUnique.mockResolvedValue({
      id: 'brand-1', subscription: { plan: { planLimit: { allowCustomRoles: false } } }
    });

    await expect(roleService.createRole('brand-1', { name: 'Manager', colorHex: '#FFFFFF', permissions: [] }, 'operator-1'))
      .rejects.toMatchObject({ status: 403 });
    expect(roleRepository.create).not.toHaveBeenCalled();
  });

  it('rejects an empty or whitespace-only name', async () => {
    await expect(roleService.createRole('brand-1', { name: '   ', colorHex: '#FFFFFF', permissions: [] }, 'operator-1'))
      .rejects.toMatchObject({ status: 400 });
    expect(roleRepository.create).not.toHaveBeenCalled();
  });

  it('rejects a name longer than 50 characters', async () => {
    const longName = 'A'.repeat(51);
    await expect(roleService.createRole('brand-1', { name: longName, colorHex: '#FFFFFF', permissions: [] }, 'operator-1'))
      .rejects.toMatchObject({ status: 400 });
    expect(roleRepository.create).not.toHaveBeenCalled();
  });

  it('rejects an empty colorHex', async () => {
    await expect(roleService.createRole('brand-1', { name: 'Manager', colorHex: '', permissions: [] }, 'operator-1'))
      .rejects.toMatchObject({ status: 400 });
    expect(roleRepository.create).not.toHaveBeenCalled();
  });

  it('rejects when a role with the same name already exists in the brand', async () => {
    roleRepository.findByName.mockResolvedValue({ id: 'role-existing', name: 'Manager' });

    await expect(roleService.createRole('brand-1', { name: 'Manager', colorHex: '#FFFFFF', permissions: [] }, 'operator-1'))
      .rejects.toMatchObject({ status: 400 });
    expect(roleRepository.create).not.toHaveBeenCalled();
  });

  it('creates the role with trimmed name/colorHex and the given permissions when all checks pass', async () => {
    const result = await roleService.createRole('brand-1', {
      name: '  Manager  ', colorHex: ' #33FF57 ', permissions: [{ permissionKey: PERMISSION_KEYS.MANAGE_CONNECTIONS, isAllowed: true }]
    }, 'operator-1');

    expect(roleRepository.create).toHaveBeenCalledWith({
      brandId: 'brand-1',
      name: 'Manager',
      description: undefined,
      colorHex: '#33FF57',
      permissions: [{ permissionKey: PERMISSION_KEYS.MANAGE_CONNECTIONS, isAllowed: true }]
    });
    expect(result).toEqual({ id: 'role-new', name: 'Manager' });
  });
});

describe('RoleService.updateRole', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authorizationFacade.checkPermission.mockResolvedValue(true);
    roleRepository.findById.mockResolvedValue({ id: 'role-1', brandId: 'brand-1', name: 'Old Name' });
    roleRepository.findByName.mockResolvedValue(null);
    roleRepository.update.mockResolvedValue({ id: 'role-1', name: 'New Name' });
  });

  it('rejects with 403 when the operator lacks MANAGE_ROLES', async () => {
    authorizationFacade.checkPermission.mockResolvedValue(false);

    await expect(roleService.updateRole('brand-1', 'role-1', { name: 'New Name', colorHex: '#FFFFFF' }, 'operator-1'))
      .rejects.toMatchObject({ status: 403 });
    expect(roleRepository.findById).not.toHaveBeenCalled();
  });

  it('rejects with 404 when the role does not exist', async () => {
    roleRepository.findById.mockResolvedValue(null);

    await expect(roleService.updateRole('brand-1', 'role-1', { name: 'New Name', colorHex: '#FFFFFF' }, 'operator-1'))
      .rejects.toMatchObject({ status: 404 });
  });

  it('rejects with 404 when the role belongs to a different brand (cross-brand IDOR guard)', async () => {
    roleRepository.findById.mockResolvedValue({ id: 'role-1', brandId: 'some-other-brand', name: 'Old Name' });

    await expect(roleService.updateRole('brand-1', 'role-1', { name: 'New Name', colorHex: '#FFFFFF' }, 'operator-1'))
      .rejects.toMatchObject({ status: 404 });
    expect(roleRepository.update).not.toHaveBeenCalled();
  });

  it('rejects an unrecognized permissionKey before writing', async () => {
    await expect(roleService.updateRole('brand-1', 'role-1', {
      name: 'New Name', colorHex: '#FFFFFF', permissions: [{ permissionKey: 'BOGUS_KEY', isAllowed: true }]
    }, 'operator-1')).rejects.toMatchObject({ status: 400 });
    expect(roleRepository.update).not.toHaveBeenCalled();
  });

  it('rejects when renaming to a name already used by a different role in the brand', async () => {
    roleRepository.findByName.mockResolvedValue({ id: 'role-2', name: 'New Name' });

    await expect(roleService.updateRole('brand-1', 'role-1', { name: 'New Name', colorHex: '#FFFFFF' }, 'operator-1'))
      .rejects.toMatchObject({ status: 400 });
    expect(roleRepository.update).not.toHaveBeenCalled();
  });

  it('allows keeping the same name on the same role (no self-collision false positive)', async () => {
    roleRepository.findByName.mockResolvedValue({ id: 'role-1', name: 'Old Name' }); // same id as the role being updated

    const result = await roleService.updateRole('brand-1', 'role-1', { name: 'Old Name', colorHex: '#FFFFFF' }, 'operator-1');

    expect(roleRepository.update).toHaveBeenCalled();
    expect(result).toEqual({ id: 'role-1', name: 'New Name' });
  });
});

describe('RoleService.deleteRole', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authorizationFacade.checkPermission.mockResolvedValue(true);
  });

  it('rejects with 403 when the operator lacks MANAGE_ROLES', async () => {
    authorizationFacade.checkPermission.mockResolvedValue(false);

    await expect(roleService.deleteRole('brand-1', 'role-1', 'operator-1')).rejects.toMatchObject({ status: 403 });
    expect(roleRepository.findById).not.toHaveBeenCalled();
  });

  it('rejects with 404 when the role belongs to a different brand', async () => {
    roleRepository.findById.mockResolvedValue({ id: 'role-1', brandId: 'some-other-brand', _count: { teamMembers: 0 } });

    await expect(roleService.deleteRole('brand-1', 'role-1', 'operator-1')).rejects.toMatchObject({ status: 404 });
    expect(roleRepository.delete).not.toHaveBeenCalled();
  });

  it('rejects with 400 when the role is still assigned to team members', async () => {
    roleRepository.findById.mockResolvedValue({ id: 'role-1', brandId: 'brand-1', _count: { teamMembers: 3 } });

    await expect(roleService.deleteRole('brand-1', 'role-1', 'operator-1')).rejects.toMatchObject({ status: 400 });
    expect(roleRepository.delete).not.toHaveBeenCalled();
  });

  it('deletes the role when unassigned and owned by the correct brand', async () => {
    roleRepository.findById.mockResolvedValue({ id: 'role-1', brandId: 'brand-1', _count: { teamMembers: 0 } });
    roleRepository.delete.mockResolvedValue({});

    const result = await roleService.deleteRole('brand-1', 'role-1', 'operator-1');

    expect(roleRepository.delete).toHaveBeenCalledWith('role-1');
    expect(result.message).toContain('Xóa vai trò thành công');
  });
});
