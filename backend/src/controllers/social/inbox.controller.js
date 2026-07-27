const inboxService = require('../../services/social/inbox.service');
const asyncHandler = require('../../utils/async-handler');

class InboxController {
  /**
   * GET /api/inbox
   */
  getInboxItems = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });

    const result = await inboxService.getInboxItems(req.query, brandId);

    res.status(200).json({
      message: 'Inbox items retrieved successfully',
      ...result
    });
  });

  /**
   * GET /api/inbox/:id
   */
  getConversationThread = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await inboxService.getConversationThread(id, req.user.id);

    res.status(200).json({
      message: 'Thread retrieved successfully',
      ...result
    });
  });

  /**
   * POST /api/inbox/sync
   */
  syncInbox = asyncHandler(async (req, res) => {
    const { brandId, platform } = req.body;
    console.log(`[InboxController] Syncing inbox: Brand = ${brandId}, Platform = ${platform}`);
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });

    const result = await inboxService.syncPlatformComments(brandId, platform);
    res.json({ message: 'Sync completed', data: result });
  });

  /**
   * POST /api/inbox/reply
   */
  replyToItem = asyncHandler(async (req, res) => {
    const { brandId, itemId, text } = req.body;
    if (!brandId || !itemId || !text) {
      return res.status(400).json({ message: 'brandId, itemId, and text are required' });
    }

    const result = await inboxService.replyToItem(brandId, itemId, text, req.user.id);
    res.json({ message: 'Reply sent', data: result });
  });

  /**
   * PATCH /api/inbox/:id/status
   */
  updateStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    console.log(`[InboxController] Updating status for ${id} to ${status}`);
    
    if (!status) return res.status(400).json({ message: 'status is required' });

    const result = await inboxService.updateItemStatus(id, status, req.user.id);
    res.json({ message: 'Status updated', data: result });
  });

  /**
   * PATCH /api/inbox/:id/metadata
   */
  updateMetadata = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { tags, internalNotes } = req.body;

    const result = await inboxService.updateItemMetadata(id, { tags, internalNotes }, req.user.id);
    res.json({ message: 'Metadata updated successfully', data: result });
  });

  /**
   * PATCH /api/inbox/replies/:replyId
   */
  updateReply = asyncHandler(async (req, res) => {
    const { replyId } = req.params;
    const { brandId, text } = req.body;
    if (!brandId || !text) {
      return res.status(400).json({ message: 'brandId and text are required' });
    }

    const result = await inboxService.updateReply(brandId, replyId, text, req.user.id);
    res.json({ message: 'Reply updated successfully', data: result });
  });

  /**
   * DELETE /api/inbox/replies/:replyId
   */
  deleteReply = asyncHandler(async (req, res) => {
    const { replyId } = req.params;
    const { brandId } = req.body;
    if (!brandId) {
      return res.status(400).json({ message: 'brandId is required' });
    }

    await inboxService.deleteReply(brandId, replyId, req.user.id);
    res.json({ message: 'Reply deleted successfully' });
  });

  /**
   * GET /api/inbox/auto-reply/settings/:socialAccountId
   */
  getAutoReplySettings = asyncHandler(async (req, res) => {
    const { socialAccountId } = req.params;
    if (!socialAccountId) {
      return res.status(400).json({ message: 'socialAccountId is required' });
    }

    const settings = await inboxService.getAutoReplySettings(socialAccountId, req.user.id);
    res.status(200).json({
      message: 'Auto-reply settings retrieved successfully',
      data: settings
    });
  });

  /**
   * POST /api/inbox/auto-reply/settings/:socialAccountId
   */
  saveAutoReplySettings = asyncHandler(async (req, res) => {
    const { socialAccountId } = req.params;
    if (!socialAccountId) {
      return res.status(400).json({ message: 'socialAccountId is required' });
    }

    const settings = await inboxService.saveAutoReplySettings(socialAccountId, req.body, req.user.id);
    res.status(200).json({
      message: 'Auto-reply settings updated successfully',
      data: settings
    });
  });
}

module.exports = new InboxController();
