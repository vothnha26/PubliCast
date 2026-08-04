const express = require('express');
const helpArticleController = require('../../controllers/admin/help-article.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/authorization.middleware');
const { USER_ROLES } = require('../../utils/constants');

const router = express.Router();

router.use(verifyAuth);
router.use(authorize(USER_ROLES.ADMIN));

/**
 * GET /api/v2/admin/help-articles?status=&category=
 */
router.get('/', helpArticleController.list);

/**
 * GET /api/v2/admin/help-articles/:id
 */
router.get('/:id', helpArticleController.getById);

/**
 * POST /api/v2/admin/help-articles
 * Body: { title, slug, category, tags, contentJson, contentHtml }
 */
router.post('/', helpArticleController.create);

/**
 * PUT /api/v2/admin/help-articles/:id
 */
router.put('/:id', helpArticleController.update);

/**
 * POST /api/v2/admin/help-articles/:id/publish
 */
router.post('/:id/publish', helpArticleController.publish);

/**
 * POST /api/v2/admin/help-articles/:id/unpublish
 */
router.post('/:id/unpublish', helpArticleController.unpublish);

/**
 * DELETE /api/v2/admin/help-articles/:id
 */
router.delete('/:id', helpArticleController.remove);

module.exports = router;
