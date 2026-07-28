const request = require('supertest');

// Mock otplib to prevent ESModule parsing errors on @scure/base in Jest
jest.mock('otplib', () => ({
  authenticator: {
    generate: jest.fn(),
    verify: jest.fn()
  }
}));

const app = require('../../src/app');

// Mock Auth Middleware
jest.mock('../../src/middlewares/auth.middleware', () => ({
  verifyAuth: (req, res, next) => {
    req.user = { id: 'operator-id', email: 'owner@publicast.com' };
    next();
  }
}));

jest.mock('../../src/middlewares/csrf.middleware', () => ({
  issueCsrfToken: (req, res, next) => next(),
  enforceCsrfGlobally: (req, res, next) => next(),
  verifyCsrfToken: (req, res, next) => next(),
  CSRF_COOKIE_NAME: 'csrfToken',
  CSRF_HEADER_NAME: 'x-csrf-token'
}));

// Mock Prisma
jest.mock('../../src/config/prisma', () => {
  const mockBrand = {
    findUnique: jest.fn(),
    findFirst: jest.fn()
  };
  const mockTeam = {
    findUnique: jest.fn()
  };
  const mockCustomRole = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  };
  const mockCustomRolePermission = {
    findUnique: jest.fn(),
    deleteMany: jest.fn(),
    createMany: jest.fn()
  };

  return {
    brand: mockBrand,
    team: mockTeam,
    customRole: mockCustomRole,
    customRolePermission: mockCustomRolePermission,
    $transaction: jest.fn((cb) => cb({
      customRole: mockCustomRole,
      customRolePermission: mockCustomRolePermission
    }))
  };
});

const prisma = require('../../src/config/prisma');

describe('Custom Roles APIs', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/brands/:brandId/roles', () => {
    it('should return list of custom roles', async () => {
      const mockRoles = [
        {
          id: 'role-1',
          brandId: 'brand-1',
          name: 'Editor',
          colorHex: '#FF5733',
          permissions: [
            { permissionKey: 'CREATE_POSTS', isAllowed: true }
          ],
          _count: { teamMembers: 2 }
        }
      ];

      prisma.customRole.findMany.mockResolvedValue(mockRoles);

      const res = await request(app)
        .get('/api/brands/brand-1/roles');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Editor');
      expect(res.body.data[0]._count.teamMembers).toBe(2);
    });
  });

  describe('POST /api/brands/:brandId/roles', () => {
    it('should create a new custom role if plan permits', async () => {
      const mockBrand = {
        id: 'brand-1',
        ownerId: 'operator-id',
        subscription: {
          plan: {
            planLimit: {
              allowCustomRoles: true
            }
          }
        }
      };

      prisma.brand.findUnique.mockResolvedValue(mockBrand);
      prisma.brand.findFirst.mockResolvedValue(mockBrand);
      prisma.customRole.findFirst.mockResolvedValue(null); // No duplicate name
      
      const createdRole = {
        id: 'role-2',
        brandId: 'brand-1',
        name: 'Manager',
        colorHex: '#33FF57',
        permissions: [{ permissionKey: 'MANAGE_CONNECTIONS', isAllowed: true }]
      };
      prisma.customRole.create.mockResolvedValue({ id: 'role-2' });
      prisma.customRole.findUnique.mockResolvedValue(createdRole);

      const res = await request(app)
        .post('/api/brands/brand-1/roles')
        .send({
          name: 'Manager',
          colorHex: '#33FF57',
          permissions: [
            { permissionKey: 'MANAGE_CONNECTIONS', isAllowed: true }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Manager');
    });

    it('should reject an unrecognized permissionKey instead of writing it to the DB', async () => {
      const mockBrand = {
        id: 'brand-1',
        ownerId: 'operator-id',
        subscription: { plan: { planLimit: { allowCustomRoles: true } } }
      };
      prisma.brand.findFirst.mockResolvedValue(mockBrand);

      const res = await request(app)
        .post('/api/brands/brand-1/roles')
        .send({
          name: 'Manager',
          colorHex: '#33FF57',
          permissions: [{ permissionKey: 'HACK_EVERYTHING', isAllowed: true }]
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('HACK_EVERYTHING');
      expect(prisma.customRole.create).not.toHaveBeenCalled();
    });

    it('should throw error if plan does not permit custom roles', async () => {
      const mockBrand = {
        id: 'brand-1',
        ownerId: 'operator-id',
        subscription: {
          plan: {
            planLimit: {
              allowCustomRoles: false
            }
          }
        }
      };

      prisma.brand.findUnique.mockResolvedValue(mockBrand);
      prisma.brand.findFirst.mockResolvedValue(mockBrand);

      const res = await request(app)
        .post('/api/brands/brand-1/roles')
        .send({
          name: 'Manager',
          colorHex: '#33FF57',
          permissions: []
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('không hỗ trợ tạo Vai trò tùy chỉnh');
    });
  });

  describe('PUT /api/brands/:brandId/roles/:id', () => {
    it('should update role name and permissions', async () => {
      const mockBrand = {
        id: 'brand-1',
        ownerId: 'operator-id'
      };
      prisma.brand.findFirst.mockResolvedValue(mockBrand);

      const existingRole = {
        id: 'role-1',
        brandId: 'brand-1',
        name: 'Old Editor'
      };
      prisma.customRole.findUnique.mockResolvedValue(existingRole);
      prisma.customRole.findFirst.mockResolvedValue(null); // No name duplicate
      
      const updatedRole = {
        id: 'role-1',
        brandId: 'brand-1',
        name: 'New Editor',
        colorHex: '#FF5733',
        permissions: []
      };
      prisma.customRole.update.mockResolvedValue(updatedRole);
      prisma.customRole.findUnique.mockResolvedValue(updatedRole);

      const res = await request(app)
        .put('/api/brands/brand-1/roles/role-1')
        .send({
          name: 'New Editor',
          colorHex: '#FF5733',
          permissions: []
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('New Editor');
    });

    it('should reject an unrecognized permissionKey instead of writing it to the DB', async () => {
      const mockBrand = { id: 'brand-1', ownerId: 'operator-id' };
      prisma.brand.findFirst.mockResolvedValue(mockBrand);
      prisma.customRole.findUnique.mockResolvedValue({ id: 'role-1', brandId: 'brand-1', name: 'Old Editor' });

      const res = await request(app)
        .put('/api/brands/brand-1/roles/role-1')
        .send({
          name: 'New Editor',
          colorHex: '#FF5733',
          permissions: [{ permissionKey: 'HACK_EVERYTHING', isAllowed: true }]
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('HACK_EVERYTHING');
      expect(prisma.customRole.update).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/brands/:brandId/roles/:id', () => {
    it('should delete role if not in use', async () => {
      const mockBrand = {
        id: 'brand-1',
        ownerId: 'operator-id'
      };
      prisma.brand.findFirst.mockResolvedValue(mockBrand);

      const existingRole = {
        id: 'role-1',
        brandId: 'brand-1',
        _count: { teamMembers: 0 }
      };
      prisma.customRole.findUnique.mockResolvedValue(existingRole);
      prisma.customRole.delete.mockResolvedValue(existingRole);

      const res = await request(app)
        .delete('/api/brands/brand-1/roles/role-1');

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Xóa vai trò thành công');
    });

    it('should fail delete if role is in use by team members', async () => {
      const mockBrand = {
        id: 'brand-1',
        ownerId: 'operator-id'
      };
      prisma.brand.findFirst.mockResolvedValue(mockBrand);

      const existingRole = {
        id: 'role-1',
        brandId: 'brand-1',
        _count: { teamMembers: 2 }
      };
      prisma.customRole.findUnique.mockResolvedValue(existingRole);

      const res = await request(app)
        .delete('/api/brands/brand-1/roles/role-1');

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('đang có thành viên trong đội ngũ sử dụng');
    });
  });
});
