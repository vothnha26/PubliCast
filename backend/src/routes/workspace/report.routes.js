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
 * DELETE /api/reports/:id?brandId=...
 * Delete a report
 */
router.delete('/:id', checkPermission('VIEW_ANALYTICS'), reportController.deleteReport);

module.exports = router;
