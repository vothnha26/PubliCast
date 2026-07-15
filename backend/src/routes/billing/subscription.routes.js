const express = require('express');
const router = express.Router();
const { verifyAuth } = require('../../middlewares/auth.middleware');
const checkPermission = require('../../middlewares/permission.middleware');
const { requireBrandMember } = require('../../middlewares/permission.middleware');
const { PERMISSION_KEYS } = require('../../utils/constants');
const subscriptionController = require('../../controllers/billing/subscription.controller');

/**
 * Subscription Routes
 * All routes require user to be authenticated (verifyAuth). Write/spend actions
 * (initiate, addons/initiate) additionally require MANAGE_BILLING. Read-only
 * routes with a brandId in the request use requireBrandMember (any active member
 * can view, matching the intent — an ANALYST should see the plan/history without
 * being able to upgrade/cancel it).
 *
 * /cancel and /status/:transactionCode don't carry a brandId in the request (the
 * client only knows the transactionCode) — ownership is resolved and checked
 * inside subscription.service.js via the PendingPayment record itself, mirroring
 * how /api/social/reassign resolves its source brand from the account being moved.
 */

// POST /api/billing/subscriptions/initiate
// User clicks "Upgrade" → server creates QR, returns payment data
router.post('/initiate', verifyAuth, checkPermission(PERMISSION_KEYS.MANAGE_BILLING), subscriptionController.initiatePayment);

// POST /api/billing/subscriptions/cancel
// User clicks "Hủy" to cancel a pending payment request — brandId resolved + MANAGE_BILLING checked in service
router.post('/cancel', verifyAuth, subscriptionController.cancelPayment);

// GET /api/billing/subscriptions/status/:transactionCode
// Frontend polls every 3s to check if SePay confirmed the payment — brandId resolved + membership checked in service
router.get('/status/:transactionCode', verifyAuth, subscriptionController.checkPaymentStatus);

// GET /api/billing/subscriptions/current?brandId=xxx
// Get current plan info for a brand (for Settings/Pricing page)
router.get('/current', verifyAuth, requireBrandMember, subscriptionController.getCurrentPlan);

// GET /api/billing/subscriptions/plans
// Get all active subscription plans (public catalog, not brand-scoped)
router.get('/plans', verifyAuth, subscriptionController.getPlans);

// GET /api/billing/subscriptions/history
// Get payment history for a brand
router.get('/history', verifyAuth, requireBrandMember, subscriptionController.getPaymentHistory);

// GET /api/billing/subscriptions/addons
// Get list of all available addons (public catalog, not brand-scoped)
router.get('/addons', verifyAuth, subscriptionController.getActiveAddons);

// POST /api/billing/subscriptions/addons/initiate
// Buy an addon
router.post('/addons/initiate', verifyAuth, checkPermission(PERMISSION_KEYS.MANAGE_BILLING), subscriptionController.initiateAddonPayment);

module.exports = router;
