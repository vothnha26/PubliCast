const BaseWebhookStrategy = require('./base.webhook-strategy');
const inboxRepository = require('../../../../repositories/social/inbox.repository');
const { PLATFORMS, INBOX_STATUS, INBOX_TYPES } = require('../../../../utils/constants');
const autoReplyService = require('../../inbox/strategies/auto-reply/auto-reply.service');
const logger = require('../../../../utils/logger');

class InstagramCommentsStrategy extends BaseWebhookStrategy {
  async handle(entry, change) {
    const instagramAccountId = entry.id;
    const value = change.value;

    logger.info(`[InstagramCommentsStrategy] Handling comment change for IG account ${instagramAccountId}`);

    const commentId = value.id;
    if (value.verb !== 'remove' && await this.isDuplicateEvent(commentId)) return;
    const text = value.text;
    const authorId = value.from?.id || 'unknown';
    const authorName = value.from?.username || 'Instagram User';
    const mediaId = value.media?.id;

    const account = await this.getAccount(instagramAccountId, PLATFORMS.INSTAGRAM);
    const inbox = await this.getInbox(account.brandId);

    const isFromMe = authorId === instagramAccountId;

    // Handle delete/hide verb if exists in webhook change details
    // (Instagram also fires comments webhook with verb: 'remove')
    if (value.verb === 'remove') {
      const existingItem = await inboxRepository.findInboxItemByPlatformId(commentId);
      if (existingItem) {
        await inboxRepository.deleteInboxItem(existingItem.id).catch(() => {});
        logger.info(`[InstagramCommentsStrategy] Comment ${commentId} deleted.`);
        this.notifyClient(account.brandId, 'inbox_item_deleted', { id: existingItem.id, platformItemId: commentId });
      }
      return;
    }

    let parentDbId = null;
    if (value.parent_id) {
      const parentComment = await inboxRepository.findInboxItemByPlatformId(value.parent_id);
      if (parentComment) {
        parentDbId = parentComment.id;
      }
    }

    const inboxItemData = {
      inboxId: inbox.id,
      platform: PLATFORMS.INSTAGRAM,
      type: INBOX_TYPES.COMMENT,
      platformItemId: commentId,
      authorId,
      authorName,
      content: text || '',
      relatedPostId: mediaId,
      platformCreatedAt: new Date(),
      syncedAt: new Date(),
      status: isFromMe ? INBOX_STATUS.READ : INBOX_STATUS.UNREAD,
      socialAccountId: account.id
    };

    if (parentDbId) {
      inboxItemData.parentItemId = parentDbId;
    }

    const savedItem = await inboxRepository.upsertInboxItem(
      { platformItemId: commentId },
      {
        content: inboxItemData.content,
        authorName: inboxItemData.authorName,
        syncedAt: inboxItemData.syncedAt,
        socialAccountId: account.id
      },
      inboxItemData
    );

    logger.info(`[InstagramCommentsStrategy] IG comment ${commentId} saved.`);

    // Notify Frontend
    this.notifyClient(account.brandId, 'new_inbox_item', savedItem);

    // Execute Auto-Reply if comment is new and not from the IG page itself
    if (value.verb !== 'remove' && !isFromMe && text) {
      autoReplyService.executeAutoReply(
        account.id,
        text || '',
        commentId,
        account.brandId
      ).catch(err => {
        logger.error(`[InstagramCommentsStrategy] Error executing auto-reply for comment ${commentId}:`, err);
      });
    }
  }
}

module.exports = InstagramCommentsStrategy;
