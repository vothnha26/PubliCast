const inboxController = require('../../controllers/social/inbox.controller');
const { v2Success } = require('../../utils/response.helper');

/**
 * Inbox Controller V2 - Enforces Standardized Envelope Responses: { message, data }
 */
class InboxControllerV2 {
  async getInboxItems(req, res, next) {
    try {
      const result = await inboxController.getInboxItems(req, res, next);
      // If controller already handled response, return
      if (res.headersSent) return;
      return v2Success(res, result, 'Inbox items fetched successfully.');
    } catch (err) {
      next(err);
    }
  }

  async getConversationThread(req, res, next) {
    try {
      const result = await inboxController.getConversationThread(req, res, next);
      if (res.headersSent) return;
      return v2Success(res, result, 'Conversation thread fetched successfully.');
    } catch (err) {
      next(err);
    }
  }

  async syncInbox(req, res, next) {
    try {
      const result = await inboxController.syncInbox(req, res, next);
      if (res.headersSent) return;
      return v2Success(res, result, 'Inbox synchronized successfully.');
    } catch (err) {
      next(err);
    }
  }

  async replyToItem(req, res, next) {
    try {
      const result = await inboxController.replyToItem(req, res, next);
      if (res.headersSent) return;
      return v2Success(res, result, 'Reply sent successfully.');
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const result = await inboxController.updateStatus(req, res, next);
      if (res.headersSent) return;
      return v2Success(res, result, 'Inbox status updated.');
    } catch (err) {
      next(err);
    }
  }

  async updateMetadata(req, res, next) {
    try {
      const result = await inboxController.updateMetadata(req, res, next);
      if (res.headersSent) return;
      return v2Success(res, result, 'Metadata updated.');
    } catch (err) {
      next(err);
    }
  }

  async updateReply(req, res, next) {
    try {
      const result = await inboxController.updateReply(req, res, next);
      if (res.headersSent) return;
      return v2Success(res, result, 'Reply updated successfully.');
    } catch (err) {
      next(err);
    }
  }

  async deleteReply(req, res, next) {
    try {
      const result = await inboxController.deleteReply(req, res, next);
      if (res.headersSent) return;
      return v2Success(res, result, 'Reply deleted successfully.');
    } catch (err) {
      next(err);
    }
  }

  async getAutoReplySettings(req, res, next) {
    try {
      const result = await inboxController.getAutoReplySettings(req, res, next);
      if (res.headersSent) return;
      return v2Success(res, result, 'Auto reply settings fetched.');
    } catch (err) {
      next(err);
    }
  }

  async saveAutoReplySettings(req, res, next) {
    try {
      const result = await inboxController.saveAutoReplySettings(req, res, next);
      if (res.headersSent) return;
      return v2Success(res, result, 'Auto reply settings saved.');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new InboxControllerV2();
