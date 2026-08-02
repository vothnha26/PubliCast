const inboxService = require('../../services/social/inbox.service');
const asyncHandler = require('../../utils/async-handler');
const { v2Success } = require('../../utils/response.helper');

/**
 * Inbox Controller V2 - Enforces Standardized Envelope Responses: { message, data }
 */
class InboxControllerV2 {
  getInboxItems = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });

    const result = await inboxService.getInboxItems(req.query, brandId);
    return v2Success(res, result, 'Inbox items fetched successfully.');
  });

  getInboxPosts = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });

    const result = await inboxService.getInboxPosts(brandId, req.query);
    return v2Success(res, result, 'Inbox posts fetched successfully.');
  });

  getCommentsByPost = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    const { postId } = req.params;
    if (!brandId || !postId) {
      return res.status(400).json({ message: 'brandId and postId are required' });
    }

    const result = await inboxService.getCommentsByPost(brandId, postId, req.query);
    return v2Success(res, result, 'Post comments fetched successfully.');
  });

  getConversationThread = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await inboxService.getConversationThread(id, req.user.id);
    return v2Success(res, result, 'Conversation thread fetched successfully.');
  });

  syncInbox = asyncHandler(async (req, res) => {
    const { brandId, platform } = req.body;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });

    const result = await inboxService.syncPlatformComments(brandId, platform);
    return v2Success(res, result, 'Inbox synchronized successfully.');
  });

  replyToItem = asyncHandler(async (req, res) => {
    const { brandId, itemId, text, attachmentUrl } = req.body;
    if (!brandId || !itemId || !text) {
      return res.status(400).json({ message: 'brandId, itemId, and text are required' });
    }

    const result = await inboxService.replyToItem(brandId, itemId, text, req.user.id, attachmentUrl);
    return v2Success(res, result, 'Reply sent successfully.');
  });

  postNewComment = asyncHandler(async (req, res) => {
    const { brandId, postId, platform, text, socialAccountId, attachmentUrl } = req.body;
    if (!brandId || !postId || !platform || !text) {
      return res.status(400).json({ message: 'brandId, postId, platform, and text are required' });
    }

    const result = await inboxService.postNewComment(brandId, postId, platform, text, req.user.id, socialAccountId, attachmentUrl);
    return v2Success(res, result, 'Comment posted successfully.');
  });

  updateStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: 'status is required' });

    const result = await inboxService.updateItemStatus(id, status, req.user.id);
    return v2Success(res, result, 'Inbox status updated.');
  });

  updateMetadata = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { tags, internalNotes } = req.body;

    const result = await inboxService.updateItemMetadata(id, { tags, internalNotes }, req.user.id);
    return v2Success(res, result, 'Metadata updated.');
  });

  updateReply = asyncHandler(async (req, res) => {
    const { replyId } = req.params;
    const { brandId, text } = req.body;
    if (!brandId || !text) {
      return res.status(400).json({ message: 'brandId and text are required' });
    }

    const result = await inboxService.updateReply(brandId, replyId, text, req.user.id);
    return v2Success(res, result, 'Reply updated successfully.');
  });

  deleteReply = asyncHandler(async (req, res) => {
    const { replyId } = req.params;
    const { brandId } = req.body;
    if (!brandId) {
      return res.status(400).json({ message: 'brandId is required' });
    }

    await inboxService.deleteReply(brandId, replyId, req.user.id);
    return v2Success(res, null, 'Reply deleted successfully.');
  });

  getAutoReplySettings = asyncHandler(async (req, res) => {
    const { socialAccountId } = req.params;
    if (!socialAccountId) {
      return res.status(400).json({ message: 'socialAccountId is required' });
    }

    const settings = await inboxService.getAutoReplySettings(socialAccountId, req.user.id);
    return v2Success(res, settings, 'Auto reply settings fetched.');
  });

  saveAutoReplySettings = asyncHandler(async (req, res) => {
    const { socialAccountId } = req.params;
    if (!socialAccountId) {
      return res.status(400).json({ message: 'socialAccountId is required' });
    }

    const settings = await inboxService.saveAutoReplySettings(socialAccountId, req.body, req.user.id);
    return v2Success(res, settings, 'Auto reply settings updated.');
  });
}

module.exports = new InboxControllerV2();
