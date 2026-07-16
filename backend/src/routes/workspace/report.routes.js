const express = require('express');
const reportController = require('../../controllers/workspace/report.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const checkPermission = require('../../middlewares/permission.middleware');

const router = express.Router();

// Apply auth to all report endpoints
router.use(verifyAuth);

/**
 * GET /api/reports?brandId=...
 * Get reports list
 */
router.get('/', checkPermission('VIEW_ANALYTICS'), reportController.getReports);

/**
 * GET /api/reports/preview-data?brandId=...&dateRange=...&platforms=...
 * Get aggregated data for previewing template reports
 */
router.get('/preview-data', checkPermission('VIEW_ANALYTICS'), reportController.getPreviewData);

/**
 * POST /api/reports/send-test?brandId=...
 * Generate and send report via email immediately
 */
router.post('/send-test', checkPermission('VIEW_ANALYTICS'), reportController.sendTestReport);

/**
 * GET /api/reports/schedule-config?brandId=...
 * Get scheduled report configuration
 */
router.get('/schedule-config', checkPermission('VIEW_ANALYTICS'), reportController.getScheduleConfig);

/**
 * POST /api/reports/schedule-config?brandId=...
 * Save scheduled report configuration
 */
router.post('/schedule-config', checkPermission('VIEW_ANALYTICS'), reportController.saveScheduleConfig);

/**
 * POST /api/reports?brandId=...
 * Generate a new report
 */
router.post('/', checkPermission('VIEW_ANALYTICS'), reportController.generateReport);

/**
 * GET /api/reports/:id/download?brandId=...
 * Download a report's file. Report files are also present under
 * /uploads/reports (see app.js static serving), but that path has no auth —
 * anyone who guesses/observes a fileUrl could download another brand's
 * report. This route is the access-controlled way to fetch the same file;
 * the frontend should always use this instead of the raw fileUrl.
 */
router.get('/:id/download', checkPermission('VIEW_ANALYTICS'), reportController.downloadReport);

/**
 * DELETE /api/reports/:id?brandId=...
 * Delete a report
 */
router.delete('/:id', checkPermission('VIEW_ANALYTICS'), reportController.deleteReport);

module.exports = router;
