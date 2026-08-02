const BaseSyncStrategy = require('./base.strategy');
const socialAccountRepository = require('../../../../repositories/social/social-account.repository');
const inboxRepository = require('../../../../repositories/social/inbox.repository');
const { PLATFORMS, INBOX_STATUS, INBOX_TYPES } = require('../../../../utils/constants');

class TiktokCommentSyncStrategy extends BaseSyncStrategy {
  supports(platform) {
    return platform.toUpperCase() === PLATFORMS.TIKTOK || platform.toUpperCase() === 'TIKTOK';
  }

  async sync(brandId, inbox) {
    // Comment sync is disabled: fetching comments requires TikTok's
    // Research API (/v2/research/video/comment/list/), a separate product
    // from the Content Posting API this app is actually approved for.
    // Every call returns access_token_invalid regardless of token
    // freshness — not a bug, TikTok simply hasn't granted this app that
    // scope. Video/post listing (tiktok-video.service.js) is unaffected
    // and keeps working normally; only comment sync is off until Research
    // API access is granted.
    return [];
  }

  supportsReply(item) {
    return (item.platform === 'TIKTOK' || item.platform === 'tiktok') && item.type === INBOX_TYPES.COMMENT;
  }

  async reply(brandId, parentPlatformItemId, text, socialAccountId = null) {
    const socialAccount = await socialAccountRepository.findByBrandAndPlatform(brandId, 'TIKTOK');
    if (!socialAccount || socialAccount.length === 0) throw new Error('TikTok account not connected');

    const account = (socialAccountId && socialAccount.find(acc => acc.id === socialAccountId)) || socialAccount[0];
    const inbox = await inboxRepository.findOrCreateInbox(brandId);
    const parentInDb = await inboxRepository.findInboxItemByPlatformId(parentPlatformItemId);

    const newCommentId = `tt_reply_${Date.now()}`;

    return await inboxRepository.createInboxItem({
      inboxId: inbox.id,
      platform: 'TIKTOK',
      type: INBOX_TYPES.COMMENT,
      platformItemId: newCommentId,
      parentItemId: parentInDb?.id,
      authorId: account.platformAccountId || 'my_tiktok_id',
      authorName: account.displayName || 'Shop Owner',
      authorAvatarUrl: account.profilePictureUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=100&q=80',
      content: text,
      relatedPostId: parentInDb?.relatedPostId,
      platformCreatedAt: new Date(),
      syncedAt: new Date(),
      status: INBOX_STATUS.READ,
      socialAccountId: account.id
    });
  }

  async updateReply(brandId, platformItemId, text) {
    return { success: true };
  }

  async deleteReply(brandId, platformItemId) {
    return { success: true };
  }
}

module.exports = TiktokCommentSyncStrategy;
