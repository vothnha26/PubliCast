const BaseWebhookStrategy = require('./base.webhook-strategy');
const inboxRepository = require('../../../../repositories/social/inbox.repository');
const autoReplyService = require('../../inbox/strategies/auto-reply/auto-reply.service');
const { PLATFORMS, INBOX_STATUS, INBOX_TYPES, FACEBOOK_API, API_VERSIONS } = require('../../../../utils/constants');
const logger = require('../../../../utils/logger');

class FacebookFeedStrategy extends BaseWebhookStrategy {
  async handle(entry, change) {
    const pageId = entry.id;
    const value = change.value;

    logger.info(`[FacebookFeedStrategy] Handling feed change for page ${pageId}: ${value.item} ${value.verb}`);

    // We only handle comment changes for now
    if (value.item !== 'comment') {
      logger.info(`[FacebookFeedStrategy] Ignored feed item type: ${value.item}`);
      return;
    }

    const account = await this.getAccount(pageId, PLATFORMS.FACEBOOK);
    const inbox = await this.getInbox(account.brandId);

    const verb = value.verb;
    const commentId = value.comment_id;

    if (verb === 'add' || verb === 'edited') {
      const authorId = value.sender_id || 'unknown';
      const authorName = value.sender_name || 'Facebook User';
      const authorAvatar = FACEBOOK_API.avatarUrl(API_VERSIONS.FACEBOOK, authorId);
      const isFromMe = authorId === pageId;

      // Determine parent ID if this is a reply to another comment
      let parentDbId = null;
      if (value.parent_id && value.parent_id !== value.post_id) {
        const parentComment = await inboxRepository.findInboxItemByPlatformId(value.parent_id);
        if (parentComment) {
          parentDbId = parentComment.id;
        }
      }

      const postPlatformId = value.post_id || value.parent_id;

      const inboxItemData = {
        inboxId: inbox.id,
        platform: PLATFORMS.FACEBOOK,
        type: INBOX_TYPES.COMMENT,
        platformItemId: commentId,
        authorId,
        authorName,
        authorAvatarUrl: authorAvatar,
        content: value.message || '',
        relatedPostId: postPlatformId,
        platformCreatedAt: value.created_time ? new Date(value.created_time * 1000) : new Date(),
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
          authorAvatarUrl: inboxItemData.authorAvatarUrl,
          syncedAt: inboxItemData.syncedAt,
          socialAccountId: account.id
        },
        inboxItemData
      );

      logger.info(`[FacebookFeedStrategy] Comment ${commentId} upserted successfully.`);
      
      // Notify Frontend
      const eventName = verb === 'add' ? 'new_inbox_item' : 'inbox_item_updated';
      this.notifyClient(account.brandId, eventName, savedItem);

      // Execute Auto-Reply if comment is new and not from the page itself
      if (verb === 'add' && !isFromMe) {
        autoReplyService.executeAutoReply(
          pageId,
          value.message || '',
          commentId,
          account.brandId
        ).catch(err => {
          logger.error(`[FacebookFeedStrategy] Error executing auto-reply for comment ${commentId}:`, err);
        });
      }

    } else if (verb === 'remove' || verb === 'hide') {
      const existingItem = await inboxRepository.findInboxItemByPlatformId(commentId);
      if (existingItem) {
        await inboxRepository.deleteInboxItem(existingItem.id).catch(() => {});
        logger.info(`[FacebookFeedStrategy] Comment ${commentId} deleted from database.`);
        
        // Notify Frontend
        this.notifyClient(account.brandId, 'inbox_item_deleted', { id: existingItem.id, platformItemId: commentId });
      }
    }
  }
}

module.exports = FacebookFeedStrategy;
