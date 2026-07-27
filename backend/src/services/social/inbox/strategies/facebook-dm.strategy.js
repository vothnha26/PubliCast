const BaseSyncStrategy = require('./base.strategy');
const facebookGateway = require('../../facebook/facebook.gateway');
const socialAccountRepository = require('../../../../repositories/social/social-account.repository');
const inboxRepository = require('../../../../repositories/social/inbox.repository');
const { PLATFORMS, INBOX_STATUS, INBOX_TYPES, API_VERSIONS, FACEBOOK_API } = require('../../../../utils/constants');


class FacebookDMSyncStrategy extends BaseSyncStrategy {
  supports(platform) {
    return platform.toUpperCase() === PLATFORMS.FACEBOOK;
  }

  async sync(brandId, inbox) {
    const { account, pageId, pageAccessToken } = await this._getAccountAndToken(brandId);
    
    let conversations = [];
    let afterCursor = null;
    let hasNextPage = true;
    let limitPages = 5;

    while (hasNextPage && limitPages > 0) {
      const response = await facebookGateway.getPageConversations(pageId, pageAccessToken, null, afterCursor);
      if (response.data && response.data.length > 0) {
        conversations = conversations.concat(response.data);
      }
      
      if (response.paging && response.paging.cursors && response.paging.cursors.after) {
        afterCursor = response.paging.cursors.after;
        limitPages--;
      } else {
        hasNextPage = false;
      }
    }

    // Fetch messages for all conversations in parallel to speed up sync dramatically
    const conversationsWithMessages = await Promise.all(
      conversations.map(async (conv) => {
        try {
          const messages = await facebookGateway.getConversationMessages(conv.id, pageAccessToken);
          return { conv, messages };
        } catch (e) {
          console.error(`Failed to fetch messages for conv ${conv.id}:`, e.message);
          return { conv, messages: [] };
        }
      })
    );

    const inboxItems = [];
    for (const { conv, messages } of conversationsWithMessages) {
      const item = await this._processConversation(conv, account, inbox, messages);
      if (item) inboxItems.push(item);
    }

    return inboxItems;
  }

  supportsReply(item) {
    return item.platform === PLATFORMS.FACEBOOK && item.type === INBOX_TYPES.DIRECT_MESSAGE;
  }

  async reply(brandId, parentPlatformItemId, text) {
    const { account, pageId, pageAccessToken } = await this._getAccountAndToken(brandId);
    
    let recipientPsid = null;
    const parentInDb = await inboxRepository.findInboxItemByPlatformId(parentPlatformItemId);
    
    if (parentInDb && parentInDb.authorId && parentInDb.authorId !== 'unknown') {
      recipientPsid = parentInDb.authorId;
    } else {
      recipientPsid = await facebookGateway.getConversationRecipientPsid(parentPlatformItemId, pageId, pageAccessToken);
    }

    if (!recipientPsid) {
      throw new Error(`Could not find recipient PSID for conversation ${parentPlatformItemId}`);
    }

    const response = await facebookGateway.sendDirectMessage(recipientPsid, text, pageAccessToken);
    const platformItemId = response.message_id || response.id;
    
    const inbox = await inboxRepository.findOrCreateInbox(brandId);

    return inboxRepository.createInboxItem({
      inboxId: inbox.id,
      platform: PLATFORMS.FACEBOOK,
      type: INBOX_TYPES.DIRECT_MESSAGE,
      platformItemId,
      parentItemId: parentInDb?.id,
      authorId: account.platformAccountId,
      authorName: account.displayName,
      authorAvatarUrl: account.profilePictureUrl,
      content: text,
      relatedPostId: parentInDb?.relatedPostId,
      platformCreatedAt: new Date(),
      syncedAt: new Date(),
      status: INBOX_STATUS.READ,
      socialAccountId: account.id
    });
  }

  async _getAccountAndToken(brandId) {
    const socialAccount = await socialAccountRepository.findByBrandAndPlatform(brandId, PLATFORMS.FACEBOOK);
    if (!socialAccount || socialAccount.length === 0) throw new Error('Facebook account not connected');
    
    const account = socialAccount[0];
    return {
      account,
      pageId: account.platformAccountId,
      pageAccessToken: account.accessToken
    };
  }

  async _processConversation(conv, account, inbox, messages) {
    const sender = conv.participants?.data?.find(p => p.id !== account.platformAccountId) || { name: 'Social User', id: 'unknown' };
    const senderAvatar = FACEBOOK_API.avatarUrl(API_VERSIONS.FACEBOOK, sender.id);


    let statusUpdate = {};
    if (messages && messages.length > 0) {
      const sortedMsgs = [...messages].sort((a, b) => new Date(a.created_time) - new Date(b.created_time));
      const lastMsg = sortedMsgs[sortedMsgs.length - 1];
      const isLastFromMe = lastMsg.from?.id === account.platformAccountId;
      if (!isLastFromMe) {
        statusUpdate.status = INBOX_STATUS.UNREAD;
      }
    }

    // 1. Create or update the parent conversation item
    const parentItem = await inboxRepository.upsertInboxItem(
      { platformItemId: conv.id },
      {
        content: conv.snippet || '',
        authorName: sender.name,
        authorAvatarUrl: senderAvatar,
        platformCreatedAt: new Date(conv.updated_time),
        syncedAt: new Date(),
        socialAccountId: account.id,
        ...statusUpdate
      },
      {
        inboxId: inbox.id,
        platform: PLATFORMS.FACEBOOK,
        type: INBOX_TYPES.DIRECT_MESSAGE,
        platformItemId: conv.id,
        authorId: sender.id,
        authorName: sender.name,
        authorAvatarUrl: senderAvatar,
        content: conv.snippet || '',
        platformCreatedAt: new Date(conv.updated_time),
        syncedAt: new Date(),
        status: INBOX_STATUS.UNREAD,
        socialAccountId: account.id
      }
    );

    // 2. Process all messages in this conversation as replies
    if (messages && messages.length > 0) {
      const sortedMsgs = [...messages].sort((a, b) => new Date(a.created_time) - new Date(b.created_time));
      
      for (const msg of sortedMsgs) {
        if (msg.id === conv.id) continue;
        
        const isFromMe = msg.from?.id === account.platformAccountId;
        const msgAuthorId = msg.from?.id || sender.id;
        const msgAuthorName = msg.from?.name || (isFromMe ? account.displayName : sender.name);
        const msgAuthorAvatar = isFromMe ? account.profilePictureUrl : senderAvatar;

        await inboxRepository.upsertInboxItem(
          { platformItemId: msg.id },
          {
            content: msg.message,
            authorName: msgAuthorName,
            authorAvatarUrl: msgAuthorAvatar,
            socialAccountId: account.id
          },
          {
            inboxId: inbox.id,
            platform: PLATFORMS.FACEBOOK,
            type: INBOX_TYPES.DIRECT_MESSAGE,
            platformItemId: msg.id,
            parentItemId: parentItem.id,
            authorId: msgAuthorId,
            authorName: msgAuthorName,
            authorAvatarUrl: msgAuthorAvatar,
            content: msg.message,
            platformCreatedAt: new Date(msg.created_time),
            syncedAt: new Date(),
            status: isFromMe ? INBOX_STATUS.READ : INBOX_STATUS.UNREAD,
            socialAccountId: account.id
          }
        );
      }
    }

    return parentItem;
  }
}

module.exports = FacebookDMSyncStrategy;
