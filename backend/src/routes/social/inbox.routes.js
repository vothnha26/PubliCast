const express = require('express');
const inboxController = require('../../controllers/social/inbox.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const { requireFeature } = require('../../middlewares/feature-gate.middleware');
const { PRODUCT_IDS } = require('../../utils/constants');

const router = express.Router();
const featureGate = requireFeature(PRODUCT_IDS.UNIFIED_INBOX);

router.use(verifyAuth);

/**
 * GET /api/inbox — brandId bắt buộc qua query string (?brandId=...)
 */
router.get('/', featureGate, inboxController.getInboxItems);

/**
 * GET /api/inbox/:id — item đã thuộc về user đã auth, không cần feature gate
 */
router.get('/:id', inboxController.getConversationThread);

/**
 * POST /api/inbox/sync — brandId bắt buộc trong body
 */
router.post('/sync', featureGate, inboxController.syncInbox);

/**
 * POST /api/inbox/reply — brandId bắt buộc trong body
 */
router.post('/reply', featureGate, inboxController.replyToItem);

/**
 * PATCH /api/inbox/:id/status — thao tác trên item cụ thể, không cần feature gate
 */
router.patch('/:id/status', inboxController.updateStatus);

router.patch('/:id/metadata', inboxController.updateMetadata);

router.patch('/replies/:replyId', featureGate, inboxController.updateReply);
router.delete('/replies/:replyId', featureGate, inboxController.deleteReply);

router.get('/auto-reply/settings/:socialAccountId', featureGate, inboxController.getAutoReplySettings);
router.post('/auto-reply/settings/:socialAccountId', featureGate, inboxController.saveAutoReplySettings);

module.exports = router;
