const auditLogService = require('../../services/admin/audit-log.service');
const asyncHandler = require('../../utils/async-handler');

class AuditLogController {
  /**
   * GET /api/admin/audit-logs
   * Fetch all audit logs with query filter params
   */
  getAuditLogs = asyncHandler(async (req, res) => {
    const result = await auditLogService.getAuditLogs(req.query);

    res.status(200).json({
      message: 'Audit logs retrieved successfully',
      ...result
    });
  });
}

module.exports = new AuditLogController();
