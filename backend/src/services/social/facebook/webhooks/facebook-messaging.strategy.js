const BaseWebhookStrategy = require('./base.webhook-strategy');
const inboxRepository = require('../../../../repositories/social/inbox.repository');
const { PLATFORMS, INBOX_STATUS, INBOX_TYPES, FACEBOOK_API, API_VERSIONS } = require('../../../../utils/constants');
const logger = require('../../../../utils/logger');

class FacebookMessagingStrategy extends BaseWebhookStrategy {
  async handle(entry, messagingItem) {
    const pageId = entry.id;
    logger.info(`[FacebookMessagingStrategy] Handling message for page ${pageId}`);

    const senderId = messagingItem.sender.id;
    const recipientId = messagingItem.recipient.id;

    const isFromMe = senderId === pageId;
    const customerPsid = isFromMe ? recipientId : senderId;

    const account = await this.getAccount(pageId, PLATFORMS.FACEBOOK);
    const inbox = await this.getInbox(account.brandId);

    const messageText = messagingItem.message?.text || '[Attachment]';
    const messageId = messagingItem.message?.mid;

    if (!messageId) {
      logger.warn('[FacebookMessagingStrategy] Ignored message event without mid');
      return;
    }

    if (await this.isDuplicateEvent(messageId)) return;

    // 1. Fetch or Determine Conversation ID from Meta
    let conversationPlatformId = await this.fetchMetaConversationId(pageId, customerPsid, account.accessToken);
    if (!conversationPlatformId) {
      // Fallback unique ID format if Meta API fails
      conversationPlatformId = `t_fallback_${customerPsid}`;
    }

    const senderAvatar = FACEBOOK_API.avatarUrl(API_VERSIONS.FACEBOOK, customerPsid);

    // 2. Upsert parent conversation item
    const parentItem = await inboxRepository.upsertInboxItem(
      { platformItemId: conversationPlatformId },
      {
        content: messageText,
        authorName: 'Facebook User',
        authorAvatarUrl: senderAvatar,
        platformCreatedAt: new Date(messagingItem.timestamp),
        syncedAt: new Date(),
        status: isFromMe ? INBOX_STATUS.READ : INBOX_STATUS.UNREAD,
        socialAccountId: account.id
      },
      {
        inboxId: inbox.id,
        platform: PLATFORMS.FACEBOOK,
        type: INBOX_TYPES.DIRECT_MESSAGE,
        platformItemId: conversationPlatformId,
        authorId: customerPsid,
        authorName: 'Facebook User',
        authorAvatarUrl: senderAvatar,
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
        platform: PLATFORMS.FACEBOOK,
        type: INBOX_TYPES.DIRECT_MESSAGE,
        platformItemId: messageId,
        parentItemId: parentItem.id,
        authorId: senderId,
        authorName: isFromMe ? account.displayName : 'Facebook User',
        authorAvatarUrl: isFromMe ? account.profilePictureUrl : senderAvatar,
        content: messageText,
        platformCreatedAt: new Date(messagingItem.timestamp),
        syncedAt: new Date(),
        status: isFromMe ? INBOX_STATUS.READ : INBOX_STATUS.UNREAD,
        socialAccountId: account.id
      }
    );

    logger.info(`[FacebookMessagingStrategy] Message ${messageId} saved under conversation ${conversationPlatformId}`);

    // 4. Notify Frontend
    // We notify with the updated parentItem, so Frontend knows to refresh the list & thread
    this.notifyClient(account.brandId, 'new_inbox_item', {
      ...parentItem,
      // Pass the details of the latest message too
      latestMessage: savedMessage
    });
  }
}

module.exports = FacebookMessagingStrategy;
