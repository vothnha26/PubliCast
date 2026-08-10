const express = require('express');
const pricingController = require('../../controllers/admin/pricing.controller');
const auditLogController = require('../../controllers/admin/audit-log.controller');
const revenueController = require('../../controllers/admin/revenue.controller');
const productController = require('../../controllers/admin/product.controller');
const platformLimitController = require('../../controllers/admin/platform-limit.controller');
const postingUsageMonitoringController = require('../../controllers/admin/posting-usage-monitoring.controller');
const userController = require('../../controllers/admin/user.controller');
const templateController = require('../../controllers/admin/template.controller');
const feedController = require('../../controllers/admin/feed.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/authorization.middleware');
const { validatePlanData } = require('../../middlewares/pricing.validation');
const { USER_ROLES } = require('../../utils/constants');

const router = express.Router();

router.use(verifyAuth);
router.use(authorize(USER_ROLES.ADMIN));

/**
 * @openapi
 * tags:
 *   name: Admin V2
 *   description: Platform administration — pricing, products, users, audit logs, revenue (v2 Envelope API)
 */

// ── Pricing V2 ──
router.get('/pricing', pricingController.getPricingPlans);
router.get('/pricing/analytics/revenue', pricingController.getPricingAnalytics);
router.get('/pricing/limits', pricingController.getPlanLimits);
router.get('/pricing/products', pricingController.getProducts);
router.post('/pricing', validatePlanData, pricingController.createPlan);
router.patch('/pricing/:planId', validatePlanData, pricingController.updatePlan);
router.delete('/pricing/:planId', pricingController.deactivatePlan);
router.get('/pricing/:planId', pricingController.getPlanDetails);

// ── Products V2 ──
router.get('/products/matrix', productController.getProductMatrix);
router.post('/products/matrix', productController.enableProductMatrix);
router.post('/products/matrix/disable', productController.disableProductMatrix);
router.post('/products/platforms', productController.createPlatform);
router.delete('/products/platforms/:id', productController.deletePlatform);
router.post('/products/modules', productController.createModule);
router.delete('/products/modules/:id', productController.deleteModule);

// ── Platform Limits V2 ──
router.get('/platform-limits', platformLimitController.getPlatformLimits);
router.get('/platform-limits/:id', platformLimitController.getPlatformLimitById);
router.post('/platform-limits', platformLimitController.createPlatformLimit);
router.put('/platform-limits/:id', platformLimitController.updatePlatformLimit);
router.patch('/platform-limits/:id/lock', platformLimitController.toggleLock);
router.delete('/platform-limits/:id', platformLimitController.deletePlatformLimit);

// ── Fair Use Posting Usage Monitoring V2 ──
router.get('/posting-usage/monthly', postingUsageMonitoringController.getMonthlyOverview);

// ── Users V2 ──
router.get('/users', userController.listUsers);
router.patch('/users/:id/status', userController.changeStatus);
router.patch('/users/:id/role', userController.changeRole);

// ── Featured Templates V2 ──
router.get('/templates', templateController.getFeaturedTemplates);
router.post('/templates/categories', templateController.createCategory);
router.put('/templates/categories/:id', templateController.updateCategory);
router.delete('/templates/categories/:id', templateController.deleteCategory);
router.post('/templates', templateController.createTemplate);
router.put('/templates/:id', templateController.updateTemplate);
router.delete('/templates/:id', templateController.deleteTemplate);

// ── Explore Feeds (System) V2 ──
router.get('/feeds', feedController.getSystemFeeds);
router.post('/feeds', feedController.createSystemFeed);
router.put('/feeds/:id', feedController.updateSystemFeed);
router.delete('/feeds/:id', feedController.deleteSystemFeed);

// ── Audit Logs V2 ──
router.get('/audit-logs', (req, res, next) => auditLogController.getAuditLogs(req, res, next));

// ── Revenue V2 ──
router.get('/revenue', revenueController.getRevenueDashboard);

module.exports = router;
