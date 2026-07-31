const express = require('express');
const router = express.Router();
const { verifyAuth } = require('../../middlewares/auth.middleware');
const checkPermission = require('../../middlewares/permission.middleware');
const { requireBrandMember } = require('../../middlewares/permission.middleware');
const { PERMISSION_KEYS } = require('../../utils/constants');
const subscriptionController = require('../../controllers/billing/subscription.controller');

router.use(verifyAuth);

/**
 * @openapi
 * tags:
 *   name: Billing V2
 *   description: Subscriptions, Addons & Payment processing (v2 Envelope API)
 */

/**
 * @openapi
 * /v2/billing/subscriptions/initiate:
 *   post:
 *     summary: Initiate plan upgrade subscription payment (generates SePay QR code)
 *     tags: [Billing V2]
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [brandId, planId, billingCycle]
 *             properties:
 *               brandId: { type: string }
 *               planId: { type: string }
 *               billingCycle: { type: string, example: "MONTHLY" }
 *     responses:
 *       200:
 *         description: Payment session initiated with QR code
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.post('/initiate', checkPermission(PERMISSION_KEYS.MANAGE_BILLING), subscriptionController.initiatePayment);

/**
 * @openapi
 * /v2/billing/subscriptions/current:
 *   get:
 *     summary: Get active subscription plan details for brand
 *     tags: [Billing V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: brandId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Active plan details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/current', requireBrandMember, subscriptionController.getCurrentPlan);

/**
 * @openapi
 * /v2/billing/subscriptions/plans:
 *   get:
 *     summary: Get public catalog of subscription plans
 *     tags: [Billing V2]
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200:
 *         description: Subscription plans list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/plans', subscriptionController.getPlans);

/**
 * @openapi
 * /v2/billing/subscriptions/history:
 *   get:
 *     summary: Get payment transaction history for brand
 *     tags: [Billing V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: brandId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Transaction history list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/history', requireBrandMember, subscriptionController.getPaymentHistory);

/**
 * @openapi
 * /v2/billing/subscriptions/addons:
 *   get:
 *     summary: Get public catalog of available addons
 *     tags: [Billing V2]
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200:
 *         description: Addons list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/addons', subscriptionController.getActiveAddons);
router.post('/addons/initiate', checkPermission(PERMISSION_KEYS.MANAGE_BILLING), subscriptionController.initiateAddonPayment);

/**
 * @openapi
 * /v2/billing/subscriptions/status/{transactionCode}:
 *   get:
 *     summary: Poll SePay payment confirmation status
 *     tags: [Billing V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: transactionCode
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Payment status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/status/:transactionCode', subscriptionController.checkPaymentStatus);
router.post('/cancel', subscriptionController.cancelPayment);

module.exports = router;
