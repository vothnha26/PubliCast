const express = require('express');
const pricingController = require('../../controllers/admin/pricing.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/authorization.middleware');
const { validatePlanData } = require('../../middlewares/pricing.validation');
const { USER_ROLES } = require('../../utils/constants');

const router = express.Router();

/**
 * Admin Pricing Routes
 * All routes require authentication and ADMIN or OWNER role
 */

router.use(verifyAuth);
router.use(authorize(USER_ROLES.ADMIN));

/**
 * GET /admin/pricing
 * Get all pricing plans
 */
router.get('/', pricingController.getPricingPlans);

/**
 * GET /admin/pricing/analytics/revenue
 * Get pricing analytics (must be before /:planId to avoid conflict)
 */
router.get('/analytics/revenue', pricingController.getPricingAnalytics);

/**
 * GET /admin/pricing/limits
 * Get all plan limits for selection
 */
router.get('/limits', pricingController.getPlanLimits);

/**
 * GET /admin/pricing/products
 * Get all products for selection
 */
router.get('/products', pricingController.getProducts);

/**
 * GET /admin/pricing/:planId
 * Get single plan details
 */
router.get('/:planId', pricingController.getPlanDetails);

/**
 * POST /admin/pricing
 * Create new plan
 */
router.post('/', validatePlanData, pricingController.createPlan);

/**
 * PATCH /admin/pricing/:planId
 * Update plan
 */
router.patch('/:planId', validatePlanData, pricingController.updatePlan);

/**
 * DELETE /admin/pricing/:planId
 * Deactivate plan
 */
router.delete('/:planId', pricingController.deactivatePlan);

module.exports = router;
