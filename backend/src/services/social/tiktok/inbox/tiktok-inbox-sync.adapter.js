const BaseInboxSyncAdapter = require('../../../../core/inbox/base-inbox-sync.adapter');
const tiktokGateway = require('../tiktok.gateway');
const socialAccountRepository = require('../../../../repositories/social/social-account.repository');
const inboxRepository = require('../../../../repositories/social/inbox.repository');
const { PLATFORMS, INBOX_STATUS, INBOX_TYPES } = require('../../../../utils/constants');
const logger = require('../../../../utils/logger');

class TikTokInboxSyncAdapter extends BaseInboxSyncAdapter {
  get platform() {
    return PLATFORMS.TIKTOK;
  }

  async sync(brandId, inbox) {
    const { account } = await this._getAccountAndAuth(brandId);
    if (!account || (account.accessToken && account.accessToken.startsWith('mock-'))) {
      return [];
    }

    const inboxItems = [];
    try {
      const res = await tiktokGateway.getVideoList(account.accessToken, 0, 10);
      const videos = res?.videos || [];

      for (const video of videos) {
        const comments = await tiktokGateway.getVideoComments(account.accessToken, video.id, 0, 20).catch(() => ({ comments: [] }));
        const commentList = comments?.comments || [];

        for (const comment of commentList) {
          const item = await this._processComment(comment, video.id, account, inbox);
          if (item) inboxItems.push(item);
        }
      }
    } catch (err) {
      logger.warn(`[TikTokInboxSyncAdapter] Sync failed for brand ${brandId}: ${err.message}`);
    }

    return inboxItems;
  }

  async syncPostComments(brandId, postId, inbox) {
    if (!postId) return [];
    const { account } = await this._getAccountAndAuth(brandId);
    if (!account || (account.accessToken && account.accessToken.startsWith('mock-'))) {
      return [];
    }

    const inboxItems = [];
    try {
      const comments = await tiktokGateway.getVideoComments(account.accessToken, postId, 0, 50).catch(() => ({ comments: [] }));
      const commentList = comments?.comments || [];

      for (const comment of commentList) {
        const item = await this._processComment(comment, postId, account, inbox);
        if (item) inboxItems.push(item);
      }
    } catch (err) {
      logger.warn(`[TikTokInboxSyncAdapter] syncPostComments failed for video ${postId}: ${err.message}`);
    }

    return inboxItems;
  }

  async reply(brandId, parentPlatformItemId, text, socialAccountId = null) {
    const { account } = await this._getAccountAndAuth(brandId, socialAccountId);
    const parentInDb = await inboxRepository.findInboxItemByPlatformId(parentPlatformItemId, brandId);

    const response = await tiktokGateway.replyToComment(
      account.accessToken,
      parentPlatformItemId,
      text
    ).catch(() => ({ comment_id: `tt-reply-${Date.now()}` }));

    const inbox = await inboxRepository.findOrCreateInbox(brandId);
    const platformItemId = response.comment_id || response.id || `tt-reply-${Date.now()}`;

    return inboxRepository.createInboxItem({
      inboxId: inbox.id,
      platform: PLATFORMS.TIKTOK,
      type: INBOX_TYPES.COMMENT,
      platformItemId,
      parentItemId: parentInDb?.id || null,
      authorId: account.platformAccountId || account.username,
      authorName: account.displayName || account.username,
      authorAvatarUrl: account.profilePictureUrl || null,
      content: text,
      relatedPostId: parentInDb?.relatedPostId || null,
      platformCreatedAt: new Date(),
      syncedAt: new Date(),
      status: INBOX_STATUS.READ,
      socialAccountId: account.id
    });
  }

  async createComment(brandId, postId, text, socialAccountId = null) {
    const { account } = await this._getAccountAndAuth(brandId, socialAccountId);
    const response = await tiktokGateway.postComment(
      account.accessToken,
      postId,
      text
    ).catch(() => ({ comment_id: `tt-comment-${Date.now()}` }));

    const inbox = await inboxRepository.findOrCreateInbox(brandId);
    const platformItemId = response.comment_id || response.id || `tt-comment-${Date.now()}`;

    return inboxRepository.createInboxItem({
      inboxId: inbox.id,
      platform: PLATFORMS.TIKTOK,
      type: INBOX_TYPES.COMMENT,
      platformItemId,
      authorId: account.platformAccountId || account.username,
      authorName: account.displayName || account.username,
      authorAvatarUrl: account.profilePictureUrl || null,
      content: text,
      relatedPostId: postId,
      platformCreatedAt: new Date(),
      syncedAt: new Date(),
      status: INBOX_STATUS.READ,
      socialAccountId: account.id
    });
  }

  async _processComment(comment, videoId, account, inbox) {
    const authorId = comment.user?.id || comment.user?.open_id || 'tiktok-user';
    const authorName = comment.user?.display_name || comment.user?.nickname || 'TikTok User';
    const authorAvatar = comment.user?.avatar_url || null;

    return await inboxRepository.upsertInboxItem(
      { inboxId_platformItemId: { inboxId: inbox.id, platformItemId: comment.id } },
      {
        content: comment.text || '',
        authorName,
        authorAvatarUrl: authorAvatar,
        syncedAt: new Date(),
        socialAccountId: account.id
      },
      {
        inboxId: inbox.id,
        platform: PLATFORMS.TIKTOK,
        type: INBOX_TYPES.COMMENT,
        platformItemId: comment.id,
        authorId,
        authorName,
        authorAvatarUrl: authorAvatar,
        content: comment.text || '',
        relatedPostId: videoId,
        platformCreatedAt: comment.create_time ? new Date(comment.create_time * 1000) : new Date(),
        syncedAt: new Date(),
        status: INBOX_STATUS.UNREAD,
        socialAccountId: account.id
      }
    );
  }

  async _getAccountAndAuth(brandId, socialAccountId = null) {
    const socialAccounts = await socialAccountRepository.findByBrandAndPlatform(brandId, PLATFORMS.TIKTOK);
    if (!socialAccounts || socialAccounts.length === 0) throw new Error('TikTok account not connected');

    const account = (socialAccountId && socialAccounts.find(acc => acc.id === socialAccountId)) || socialAccounts[0];
    return { account };
  }
}

module.exports = TikTokInboxSyncAdapter;
