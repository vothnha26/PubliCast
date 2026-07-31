const express = require('express');
const tiktokControllerV2 = require('../../controllers/social/tiktok.controller.v2');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const checkPermission = require('../../middlewares/permission.middleware');
const { requireBrandMember } = checkPermission;

const router = express.Router();

/**
 * @openapi
 * tags:
 *   name: Social TikTok V2
 *   description: TikTok Integration & Analytics endpoints (v2 Envelope API)
 */

/**
 * @openapi
 * /v2/social/tiktok/published-videos:
 *   get:
 *     summary: Get TikTok published videos list for brand
 *     tags: [Social TikTok V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: brandId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: TikTok published videos list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/published-videos', verifyAuth, requireBrandMember, tiktokControllerV2.getTikTokPublishedVideos);

module.exports = router;
