const express = require('express');
const inboxControllerV2 = require('../../controllers/social/inbox.controller.v2');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const { requireFeature } = require('../../middlewares/feature-gate.middleware');
const checkBrandAccess = require('../../middlewares/brand-access.middleware');
const { PRODUCT_IDS } = require('../../utils/constants');

const router = express.Router();
const featureGate = requireFeature(PRODUCT_IDS.UNIFIED_INBOX);

router.use(verifyAuth);

/**
 * @openapi
 * tags:
 *   name: Social Inbox V2
 *   description: Unified Social Inbox management endpoints (v2 Envelope API)
 */

/**
 * @openapi
 * /v2/social/inbox:
 *   get:
 *     summary: Get unified inbox items for a brand
 *     tags: [Social Inbox V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: brandId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Inbox items list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/', checkBrandAccess, featureGate, inboxControllerV2.getInboxItems);
router.get('/posts', checkBrandAccess, featureGate, inboxControllerV2.getInboxPosts);
router.get('/posts/:postId/comments', checkBrandAccess, featureGate, inboxControllerV2.getCommentsByPost);

/**
 * @openapi
 * /v2/social/inbox/{id}:
 *   get:
 *     summary: Get conversation thread by inbox item ID
 *     tags: [Social Inbox V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Conversation thread details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/:id', inboxControllerV2.getConversationThread);

/**
 * @openapi
 * /v2/social/inbox/sync:
 *   post:
 *     summary: Sync social inbox messages for a brand
 *     tags: [Social Inbox V2]
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [brandId]
 *             properties:
 *               brandId: { type: string }
 *     responses:
 *       200:
 *         description: Sync initiated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.post('/sync', checkBrandAccess, featureGate, inboxControllerV2.syncInbox);

/**
 * @openapi
 * /v2/social/inbox/reply:
 *   post:
 *     summary: Reply to an inbox message or comment
 *     tags: [Social Inbox V2]
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [brandId, itemId, message]
 *             properties:
 *               brandId: { type: string }
 *               itemId: { type: string }
 *               message: { type: string }
 *     responses:
 *       200:
 *         description: Reply sent
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.post('/reply', checkBrandAccess, featureGate, inboxControllerV2.replyToItem);

/**
 * @openapi
 * /v2/social/inbox/comment:
 *   post:
 *     summary: Post a brand-new top-level comment on a post/video with no existing comments
 *     tags: [Social Inbox V2]
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [brandId, postId, platform, text]
 *             properties:
 *               brandId: { type: string }
 *               postId: { type: string }
 *               platform: { type: string }
 *               text: { type: string }
 *               socialAccountId: { type: string }
 *     responses:
 *       200:
 *         description: Comment posted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.post('/comment', checkBrandAccess, featureGate, inboxControllerV2.postNewComment);

/**
 * @openapi
 * /v2/social/inbox/{id}/status:
 *   patch:
 *     summary: Update inbox item status (read, unread, archived)
 *     tags: [Social Inbox V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status: { type: string, example: READ }
 *     responses:
 *       200:
 *         description: Status updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.patch('/:id/status', inboxControllerV2.updateStatus);

/**
 * @openapi
 * /v2/social/inbox/{id}/metadata:
 *   patch:
 *     summary: Update inbox item metadata tags or notes
 *     tags: [Social Inbox V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Metadata updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.patch('/:id/metadata', inboxControllerV2.updateMetadata);

/**
 * @openapi
 * /v2/social/inbox/replies/{replyId}:
 *   patch:
 *     summary: Edit sent reply
 *     tags: [Social Inbox V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: replyId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Reply updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 *   delete:
 *     summary: Delete sent reply
 *     tags: [Social Inbox V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: replyId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Reply deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.patch('/replies/:replyId', featureGate, inboxControllerV2.updateReply);
router.delete('/replies/:replyId', featureGate, inboxControllerV2.deleteReply);

/**
 * @openapi
 * /v2/social/inbox/auto-reply/settings/{socialAccountId}:
 *   get:
 *     summary: Get auto reply settings for a social account
 *     tags: [Social Inbox V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: socialAccountId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Auto reply settings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 *   post:
 *     summary: Save auto reply settings for a social account
 *     tags: [Social Inbox V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: socialAccountId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Auto reply settings saved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/auto-reply/settings/:socialAccountId', inboxControllerV2.getAutoReplySettings);
router.post('/auto-reply/settings/:socialAccountId', inboxControllerV2.saveAutoReplySettings);

module.exports = router;
