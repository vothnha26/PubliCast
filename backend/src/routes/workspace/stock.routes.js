const express = require('express');
const stockController = require('../../controllers/stock.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const checkPermission = require('../../middlewares/permission.middleware');
const { PERMISSION_KEYS } = require('../../utils/constants');

const router = express.Router();

router.use(verifyAuth);

/**
 * GET /api/stock/search
 * Query: provider, query, page, perPage, mediaType, orientation
 */
router.get('/search', stockController.searchMedia);

/**
 * POST /api/stock/import
 * Body: { brandId, provider, externalId, downloadUrl, downloadLocationUrl, photographerName, photographerUrl, attributionHtml, mediaType }
 */
router.post('/import', checkPermission(PERMISSION_KEYS.MANAGE_MEDIA), stockController.importMedia);

module.exports = router;
