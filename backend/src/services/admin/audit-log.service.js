const auditLogRepository = require('../../repositories/admin/audit-log.repository');
const QueryPipeline = require('../../core/query-pipeline/query.pipeline');
const AuditLogSearchFilter = require('./audit-log/filters/search.filter');
const AuditLogCategoryFilter = require('./audit-log/filters/category.filter');
const AuditLogStatusFilter = require('./audit-log/filters/status.filter');
const AuditLogDateRangeFilter = require('./audit-log/filters/date-range.filter');
const { DEFAULT_CONFIG, AUDIT_CONFIG } = require('../../utils/constants');

const ALLOWED_SORT_FIELDS = ['createdAt', 'action', 'targetType'];
const ALLOWED_SORT_ORDERS = ['asc', 'desc'];

class AuditLogService {
  constructor() {
    this.queryPipeline = new QueryPipeline([
      new AuditLogSearchFilter(),
      new AuditLogCategoryFilter(),
      new AuditLogStatusFilter(),
      new AuditLogDateRangeFilter()
    ]);
  }

  /**
   * Get filtered audit logs with pagination metadata
   */
  async getAuditLogs(queryParams) {
    const { page = 1, limit = 5, sortBy = 'createdAt', sortOrder = 'desc' } = queryParams;
    const { skip, take } = this._getPagination(page, limit);
    const order = this._getSortOrder(sortBy, sortOrder);

    const where = this.queryPipeline.apply({}, queryParams);
    const { logs, total } = await auditLogRepository.findManyAndCount(where, { skip, take, orderBy: order });

    return {
      data: logs.map(log => this._formatAuditLog(log)),
      meta: { total, page: Math.max(1, parseInt(page) || 1), limit: take, totalPages: Math.ceil(total / take) }
    };
  }

  // ============= Private Helper Methods =============

  _getPagination(page, limit) {
    const safePage = Math.max(1, parseInt(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit) || 5));
    return { skip: (safePage - 1) * safeLimit, take: safeLimit };
  }

  _getSortOrder(sortBy, sortOrder) {
    const safeSortBy = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : 'createdAt';
    const safeSortOrder = ALLOWED_SORT_ORDERS.includes(sortOrder) ? sortOrder : 'desc';
    return { [safeSortBy]: safeSortOrder };
  }

  _formatAuditLog(log) {
    return {
      id: log.id,
      createdAt: log.createdAt,
      actor: log.user?.name || AUDIT_CONFIG.SYSTEM_ACTOR,
      role: log.user?.role || AUDIT_CONFIG.ROOT_ROLE,
      action: log.action,
      category: log.targetType,
      target: log.targetId || '—',
      ip: log.ipAddress || '—',
      status: log.details || AUDIT_CONFIG.DEFAULT_STATUS,
      time: new Date(log.createdAt).toLocaleTimeString(DEFAULT_CONFIG.LOCALE, { hour12: false })
    };
  }
}

module.exports = new AuditLogService();
