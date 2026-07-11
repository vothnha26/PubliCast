const BaseWebhookStrategy = require('./base.webhook-strategy');
const inboxRepository = require('../../../../repositories/social/inbox.repository');
const { PLATFORMS, INBOX_STATUS, INBOX_TYPES } = require('../../../../utils/constants');
const logger = require('../../../../utils/logger');

class InstagramMessagingStrategy extends BaseWebhookStrategy {
  async handle(entry, messagingItem) {
    const instagramAccountId = entry.id;
    logger.info(`[InstagramMessagingStrategy] Handling message for IG account ${instagramAccountId}`);

    const senderId = messagingItem.sender.id;
    const recipientId = messagingItem.recipient.id;

    const isFromMe = senderId === instagramAccountId;
    const customerIgsid = isFromMe ? recipientId : senderId;

    const account = await this.getAccount(instagramAccountId, PLATFORMS.INSTAGRAM);
    const inbox = await this.getInbox(account.brandId);

    const messageText = messagingItem.message?.text || '[Attachment]';
    const messageId = messagingItem.message?.mid;

    if (!messageId) {
      logger.warn('[InstagramMessagingStrategy] Ignored IG message event without mid');
      return;
    }

    if (await this.isDuplicateEvent(messageId)) return;

    // 1. Fetch or Determine Conversation ID from Meta
    let conversationPlatformId = await this.fetchMetaConversationId(instagramAccountId, customerIgsid, account.accessToken);
    if (!conversationPlatformId) {
      // Fallback unique ID format
      conversationPlatformId = `t_ig_fallback_${customerIgsid}`;
    }

    // 2. Upsert parent conversation item
    const parentItem = await inboxRepository.upsertInboxItem(
      { platformItemId: conversationPlatformId },
      {
        content: messageText,
        authorName: 'Instagram User',
        platformCreatedAt: new Date(messagingItem.timestamp),
        syncedAt: new Date(),
        status: isFromMe ? INBOX_STATUS.READ : INBOX_STATUS.UNREAD,
        socialAccountId: account.id
      },
      {
        inboxId: inbox.id,
        platform: PLATFORMS.INSTAGRAM,
        type: INBOX_TYPES.DIRECT_MESSAGE,
        platformItemId: conversationPlatformId,
        authorId: customerIgsid,
        authorName: 'Instagram User',
        content: messageText,
        platformCreatedAt: new Date(messagingItem.timestamp),
        syncedAt: new Date(),
        status: isFromMe ? INBOX_STATUS.READ : INBOX_STATUS.UNREAD,
        socialAccountId: account.id
      }
    );

    // 3. Save current message as a reply child in DB
    const savedMessage = await inboxRepository.upsertInboxItem(
      { platformItemId: messageId },
      {
        content: messageText,
        syncedAt: new Date(),
        socialAccountId: account.id
      },
      {
        inboxId: inbox.id,
        platform: PLATFORMS.INSTAGRAM,
        type: INBOX_TYPES.DIRECT_MESSAGE,
        platformItemId: messageId,
        parentItemId: parentItem.id,
        authorId: senderId,
        authorName: isFromMe ? account.displayName : 'Instagram User',
        content: messageText,
        platformCreatedAt: new Date(messagingItem.timestamp),
        syncedAt: new Date(),
        status: isFromMe ? INBOX_STATUS.READ : INBOX_STATUS.UNREAD,
        socialAccountId: account.id
      }
    );

    logger.info(`[InstagramMessagingStrategy] IG message ${messageId} saved under conversation ${conversationPlatformId}`);

    // 4. Notify Frontend
    this.notifyClient(account.brandId, 'new_inbox_item', {
      ...parentItem,
      latestMessage: savedMessage
    });
  }
}

module.exports = InstagramMessagingStrategy;
