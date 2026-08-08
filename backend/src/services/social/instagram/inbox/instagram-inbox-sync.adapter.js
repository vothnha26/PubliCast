const BaseInboxSyncAdapter = require('../../../../core/inbox/base-inbox-sync.adapter');
const instagramGraphGateway = require('../instagram-graph.gateway');
const inboxRepository = require('../../../../repositories/social/inbox.repository');
const socialAuthFactory = require('../../../../core/auth/social-auth.factory');
const { PLATFORMS } = require('../../../../utils/constants');
const logger = require('../../../../utils/logger');

/**
 * InstagramInboxSyncAdapter
 * Phân chia làm 2 sub-routines độc lập:
 * 1. syncDirectMessages(): Quản lý tin nhắn Direct Messages qua /{instagram-user-id}/conversations
 * 2. syncMediaComments(): Quản lý bình luận trên media qua /{media-id}/comments
 */
class InstagramInboxSyncAdapter extends BaseInboxSyncAdapter {
  get platform() {
    return PLATFORMS.INSTAGRAM;
  }

  async sync(brandId, socialAccountId) {
    const authInfo = await socialAuthFactory.getAuthClient(brandId, this.platform, socialAccountId);
    if (!authInfo) return { syncedCount: 0, errors: ['No auth client available'] };

    const { auth, account } = authInfo;
    const instagramUserId = account.platformAccountId || account.id;

    let directSynced = 0;
    let commentSynced = 0;
    const errors = [];

    // Sub-routine 1: Sync Direct Messages
    try {
      directSynced = await this.syncDirectMessages(auth, brandId, socialAccountId, instagramUserId);
    } catch (err) {
      logger.error(`[InstagramInboxSyncAdapter] Direct messages sync failed: ${err.message}`);
      errors.push(`Direct DM Error: ${err.message}`);
    }

    // Sub-routine 2: Sync Media Comments
    try {
      commentSynced = await this.syncMediaComments(auth, brandId, socialAccountId, instagramUserId);
    } catch (err) {
      logger.error(`[InstagramInboxSyncAdapter] Media comments sync failed: ${err.message}`);
      errors.push(`Media Comments Error: ${err.message}`);
    }

    return {
      syncedCount: directSynced + commentSynced,
      directSynced,
      commentSynced,
      errors
    };
  }

  /**
   * Sub-routine 1: Direct Messages Sync (cần quyền instagram_manage_messages)
   */
  async syncDirectMessages(auth, brandId, socialAccountId, instagramUserId) {
    let synced = 0;
    const conversationsRes = await instagramGraphGateway.getConversations(auth, instagramUserId);
    const conversations = conversationsRes?.data || [];

    for (const conv of conversations) {
      const threadId = conv.id;
      const messages = conv.messages?.data || [];

      for (const msg of messages) {
        const inboxItemData = {
          brandId,
          socialAccountId,
          platform: this.platform,
          itemType: 'DIRECT_MESSAGE',
          platformItemId: msg.id,
          platformThreadId: threadId,
          senderId: msg.from?.id || 'unknown',
          senderName: msg.from?.name || msg.from?.username || 'Instagram User',
          content: msg.message || '',
          timestamp: new Date(msg.created_time || Date.now()),
          rawJson: JSON.stringify(msg)
        };

        await inboxRepository.upsertInboxItem(inboxItemData);
        synced++;
      }
    }

    return synced;
  }

  /**
   * Sub-routine 2: Media Comments Sync (cần quyền instagram_manage_comments)
   */
  async syncMediaComments(auth, brandId, socialAccountId, instagramUserId) {
    let synced = 0;
    // Tìm các bài viết Instagram đã xuất bản của brand/account
    const mediaList = await inboxRepository.getRecentPublishedMedia(brandId, socialAccountId, this.platform);

    for (const media of mediaList) {
      const mediaId = media.platformPostId || media.id;
      if (!mediaId) continue;

      const commentsRes = await instagramGraphGateway.getMediaComments(auth, mediaId);
      const comments = commentsRes?.data || [];

      for (const comment of comments) {
        const inboxItemData = {
          brandId,
          socialAccountId,
          platform: this.platform,
          itemType: 'COMMENT',
          platformItemId: comment.id,
          platformPostId: mediaId,
          senderId: comment.from?.id || comment.username || 'unknown',
          senderName: comment.username || comment.from?.name || 'Instagram User',
          content: comment.text || '',
          timestamp: new Date(comment.timestamp || Date.now()),
          rawJson: JSON.stringify(comment)
        };

        await inboxRepository.upsertInboxItem(inboxItemData);
        synced++;
      }
    }

    return synced;
  }

  async reply(brandId, parentPlatformItemId, text, socialAccountId = null, attachmentUrl = null) {
    const authInfo = await socialAuthFactory.getAuthClient(brandId, this.platform, socialAccountId);
    if (!authInfo) throw new Error('Instagram account authentication failed');

    const { auth, account } = authInfo;
    const response = await instagramGraphGateway.replyToComment(auth, parentPlatformItemId, text);

    const inbox = await inboxRepository.findOrCreateInbox(brandId);
    const parentInDb = await inboxRepository.findInboxItemByPlatformId(parentPlatformItemId);

    return inboxRepository.createInboxItem({
      inboxId: inbox.id,
      platform: PLATFORMS.INSTAGRAM,
      type: 'COMMENT',
      platformItemId: response.id,
      parentItemId: parentInDb?.id,
      authorId: account.platformAccountId || account.id,
      authorName: account.displayName || account.username || 'Instagram User',
      authorAvatarUrl: account.profilePictureUrl || null,
      content: text,
      mediaUrls: attachmentUrl || null,
      relatedPostId: parentInDb?.relatedPostId,
      platformCreatedAt: new Date(),
      syncedAt: new Date(),
      status: 'READ',
      socialAccountId: account.id
    });
  }

  async createComment(brandId, postId, text, socialAccountId = null, attachmentUrl = null) {
    const authInfo = await socialAuthFactory.getAuthClient(brandId, this.platform, socialAccountId);
    if (!authInfo) throw new Error('Instagram account authentication failed');

    const { auth, account } = authInfo;
    const response = await instagramGraphGateway.createComment(auth, postId, text);

    const inbox = await inboxRepository.findOrCreateInbox(brandId);

    return inboxRepository.createInboxItem({
      inboxId: inbox.id,
      platform: PLATFORMS.INSTAGRAM,
      type: 'COMMENT',
      platformItemId: response.id,
      authorId: account.platformAccountId || account.id,
      authorName: account.displayName || account.username || 'Instagram User',
      authorAvatarUrl: account.profilePictureUrl || null,
      content: text,
      mediaUrls: attachmentUrl || null,
      relatedPostId: postId,
      platformCreatedAt: new Date(),
      syncedAt: new Date(),
      status: 'READ',
      socialAccountId: account.id
    });
  }

  async deleteReply(brandId, platformItemId, socialAccountId = null) {
    const authInfo = await socialAuthFactory.getAuthClient(brandId, this.platform, socialAccountId);
    if (!authInfo) throw new Error('Instagram account authentication failed');

    const { auth } = authInfo;
    return await instagramGraphGateway.deleteComment(auth, platformItemId);
  }
}

module.exports = InstagramInboxSyncAdapter;
