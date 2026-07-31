const express = require('express');
const reportController = require('../../controllers/workspace/report.controller');
const adAccountController = require('../../controllers/workspace/ad-account.controller');
const ticketController = require('../../controllers/workspace/ticket.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const checkPermission = require('../../middlewares/permission.middleware');
const { requireBrandMember } = checkPermission;

const router = express.Router();
router.use(verifyAuth);

/**
 * @openapi
 * tags:
 *   name: Analytics Reports & Support V2
 *   description: Automated Reports, Ad Accounts & Support Tickets endpoints (v2 Envelope API)
 */

// ── Reports V2 ──
/**
 * @openapi
 * /v2/analytics-support/reports:
 *   get:
 *     summary: Get generated reports list for brand
 *     tags: [Analytics Reports & Support V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: brandId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Reports list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 *   post:
 *     summary: Generate a new report for brand
 *     tags: [Analytics Reports & Support V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: brandId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Report generated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/reports', checkPermission('VIEW_ANALYTICS'), reportController.getReports);
router.post('/reports', checkPermission('VIEW_ANALYTICS'), reportController.generateReport);

/**
 * @openapi
 * /v2/analytics-support/reports/preview-data:
 *   get:
 *     summary: Preview aggregated report data
 *     tags: [Analytics Reports & Support V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: brandId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Aggregated preview data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/reports/preview-data', checkPermission('VIEW_ANALYTICS'), reportController.getPreviewData);

// ── Ad Accounts V2 ──
/**
 * @openapi
 * /v2/analytics-support/ad-accounts/performance:
 *   get:
 *     summary: Get connected ad accounts & performance analytics
 *     tags: [Analytics Reports & Support V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: brandId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Ad performance metrics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/ad-accounts/performance', requireBrandMember, adAccountController.getAdPerformanceData);

// ── Support Tickets V2 ──
/**
 * @openapi
 * /v2/analytics-support/tickets:
 *   get:
 *     summary: Get support tickets for brand
 *     tags: [Analytics Reports & Support V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: brandId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Tickets list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 *   post:
 *     summary: Create a new support ticket
 *     tags: [Analytics Reports & Support V2]
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [subject, message]
 *             properties:
 *               subject: { type: string }
 *               message: { type: string }
 *     responses:
 *       201:
 *         description: Ticket created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/tickets', requireBrandMember, ticketController.getTickets);
router.post('/tickets', ticketController.createTicket);

module.exports = router;
