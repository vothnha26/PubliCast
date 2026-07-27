const express = require('express');
const productController = require('../../controllers/admin/product.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/authorization.middleware');
const { USER_ROLES } = require('../../utils/constants');

const router = express.Router();

router.use(verifyAuth);
router.use(authorize(USER_ROLES.ADMIN));

/**
 * GET /api/admin/products/matrix
 */
router.get('/matrix', productController.getProductMatrix);

/**
 * POST /api/admin/products/matrix
 * Body: { platformId, moduleId, sku }
 */
router.post('/matrix', productController.enableProductMatrix);

/**
 * POST /api/admin/products/matrix/disable
 * Body: { platformId, moduleId }
 */
router.post('/matrix/disable', productController.disableProductMatrix);

/**
 * POST /api/admin/products/platforms
 * Body: { id, name, color, image }
 */
router.post('/platforms', productController.createPlatform);

/**
 * DELETE /api/admin/products/platforms/:id
 */
router.delete('/platforms/:id', productController.deletePlatform);

/**
 * POST /api/admin/products/modules
 * Body: { id, name, description }
 */
router.post('/modules', productController.createModule);

/**
 * DELETE /api/admin/products/modules/:id
 */
router.delete('/modules/:id', productController.deleteModule);

module.exports = router;
