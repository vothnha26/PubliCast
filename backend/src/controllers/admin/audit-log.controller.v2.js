const auditLogService = require('../../services/admin/audit-log.service');
const asyncHandler = require('../../utils/async-handler');

/**
 * getAuditLogs keeps v1's flat { message, data, meta } shape (not the
 * standard v2Success envelope) because the frontend's apiV2 interceptor
 * specifically unwraps top-level `meta` alongside `data` for paginated
 * endpoints — nesting under `data` here would break that unwrap.
 */
class AuditLogControllerV2 {
  getAuditLogs = asyncHandler(async (req, res) => {
    const result = await auditLogService.getAuditLogs(req.query);

    res.status(200).json({
      message: 'Audit logs retrieved successfully',
      ...result
    });
  });
}

module.exports = new AuditLogControllerV2();
