const express = require('express');
const templateController = require('../../controllers/social/template.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');

const router = express.Router();

/**
 * @openapi
 * /v2/templates:
 *   get:
 *     summary: Get featured post-content templates (Buffer-style content ideas), grouped by category
 *     tags: [Templates]
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200:
 *         description: Featured templates grouped by category
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/', verifyAuth, templateController.getFeaturedTemplates);

module.exports = router;
