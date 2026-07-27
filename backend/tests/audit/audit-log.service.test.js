const auditLogService = require('../../src/services/admin/audit-log.service');
const auditLogRepository = require('../../src/repositories/admin/audit-log.repository');

jest.mock('../../src/repositories/admin/audit-log.repository', () => ({
  findManyAndCount: jest.fn()
}));

describe('AuditLogService Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockLogs = [
    {
      id: 'log-1',
      createdAt: '2026-06-19T10:00:00.000Z',
      action: 'LOGIN',
      targetType: 'AUTH',
      targetId: 'user-123',
      ipAddress: '192.168.1.1',
      details: 'User login successfully',
      user: {
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'ADMIN'
      }
    },
    {
      id: 'log-2',
      createdAt: '2026-06-19T11:00:00.000Z',
      action: 'UPDATE_PLAN',
      targetType: 'PLAN',
      targetId: 'plan-456',
      ipAddress: null,
      details: null,
      user: null // System action
    }
  ];

  describe('AUDIT_001 - getAuditLogs (Pagination & Filters)', () => {
    it('should query repository with filters and pagination options', async () => {
      auditLogRepository.findManyAndCount.mockResolvedValue({
        logs: [mockLogs[0]],
        total: 1
      });

      const queryParams = { page: 2, limit: 10, sortBy: 'action', sortOrder: 'asc' };
      const result = await auditLogService.getAuditLogs(queryParams);

      expect(result.data).toHaveLength(1);
      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(10);
      expect(auditLogRepository.findManyAndCount).toHaveBeenCalledWith(
        expect.any(Object),
        {
          skip: 10,
          take: 10,
          orderBy: { action: 'asc' }
        }
      );
    });
  });

  describe('AUDIT_002 - formatAuditLog', () => {
    it('should format user audit logs correctly', async () => {
      auditLogRepository.findManyAndCount.mockResolvedValue({
        logs: [mockLogs[0]],
        total: 1
      });

      const result = await auditLogService.getAuditLogs({});

      expect(result.data[0]).toEqual(expect.objectContaining({
        id: 'log-1',
        actor: 'John Doe',
        role: 'ADMIN',
        action: 'LOGIN',
        category: 'AUTH',
        target: 'user-123',
        ip: '192.168.1.1',
        status: 'User login successfully'
      }));
    });

    it('should fallback to system actor and root role when user info is missing', async () => {
      auditLogRepository.findManyAndCount.mockResolvedValue({
        logs: [mockLogs[1]],
        total: 1
      });

      const result = await auditLogService.getAuditLogs({});

      expect(result.data[0]).toEqual(expect.objectContaining({
        id: 'log-2',
        actor: 'System',
        role: 'Root',
        action: 'UPDATE_PLAN',
        category: 'PLAN',
        target: 'plan-456',
        ip: '—',
        status: 'success'
      }));
    });
  });
});
