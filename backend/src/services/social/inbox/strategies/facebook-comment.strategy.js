const BaseSyncStrategy = require('./base.strategy');
const facebookGateway = require('../../facebook/facebook.gateway');
const socialAccountRepository = require('../../../../repositories/social/social-account.repository');
const inboxRepository = require('../../../../repositories/social/inbox.repository');
const { PLATFORMS, INBOX_STATUS, INBOX_TYPES } = require('../../../../utils/constants');
const { filterRealAccount, processComment, processReplies } = require('../../facebook/facebook-comment.util');

class FacebookCommentSyncStrategy extends BaseSyncStrategy {
  supports(platform) {
    return platform.toUpperCase() === PLATFORMS.FACEBOOK;
  }

  async sync(brandId, inbox) {
    const { account, pageId, pageAccessToken } = await this._getAccountAndToken(brandId);
    const feedResult = await facebookGateway.getPageFeed(pageId, pageAccessToken, null, 10);
    const feed = feedResult.data || [];
    const inboxItems = [];

    for (const post of feed) {
      const comments = await facebookGateway.getPostComments(post.id, pageAccessToken);
      for (const comment of comments) {
        const item = await processComment(comment, post.id, account, inbox);
        inboxItems.push(item);

        if (comment.comments && comment.comments.data) {
          await processReplies(comment.comments.data, item.id, post.id, account, inbox);
        }
      }
    }

    return inboxItems;
  }

  supportsReply(item) {
    return item.platform === PLATFORMS.FACEBOOK && item.type === INBOX_TYPES.COMMENT;
  }

  async reply(brandId, parentPlatformItemId, text, socialAccountId = null, attachmentUrl = null) {
    const { account, pageAccessToken } = await this._getAccountAndToken(brandId, socialAccountId);
    const response = await facebookGateway.replyToComment(parentPlatformItemId, text, pageAccessToken, attachmentUrl);

    const inbox = await inboxRepository.findOrCreateInbox(brandId);
    const parentInDb = await inboxRepository.findInboxItemByPlatformId(parentPlatformItemId);

    return inboxRepository.createInboxItem({
      inboxId: inbox.id,
      platform: PLATFORMS.FACEBOOK,
      type: INBOX_TYPES.COMMENT,
      platformItemId: response.id,
      parentItemId: parentInDb?.id,
      authorId: account.platformAccountId,
      authorName: account.displayName,
      authorAvatarUrl: account.profilePictureUrl,
      content: text,
      mediaUrls: attachmentUrl || null,
      relatedPostId: parentInDb?.relatedPostId,
      platformCreatedAt: new Date(),
      syncedAt: new Date(),
      status: INBOX_STATUS.READ,
      socialAccountId: account.id
    });
  }

  supportsNewComment(platform) {
    return platform.toUpperCase() === PLATFORMS.FACEBOOK;
  }

  // Posts a brand-new top-level comment directly on a post (no existing
  // InboxItem/thread needed) — for posts with 0 synced comments, which
  // reply() can't handle since it always targets an existing comment id.
  async createComment(brandId, postId, text, socialAccountId = null, attachmentUrl = null) {
    const { account, pageAccessToken } = await this._getAccountAndToken(brandId, socialAccountId);
    const response = await facebookGateway.createComment(postId, text, pageAccessToken, attachmentUrl);

    const inbox = await inboxRepository.findOrCreateInbox(brandId);

    return inboxRepository.createInboxItem({
      inboxId: inbox.id,
      platform: PLATFORMS.FACEBOOK,
      type: INBOX_TYPES.COMMENT,
      platformItemId: response.id,
      authorId: account.platformAccountId,
      authorName: account.displayName,
      authorAvatarUrl: account.profilePictureUrl,
      content: text,
      mediaUrls: attachmentUrl || null,
      relatedPostId: postId,
      platformCreatedAt: new Date(),
      syncedAt: new Date(),
      status: INBOX_STATUS.READ,
      socialAccountId: account.id
    });
  }

  // socialAccountId picks a specific page when the brand has more than one
  // Facebook page connected; omitted, filterRealAccount picks the first
  // non-mock account (correct as long as the brand only has one, still the
  // common case).
  async _getAccountAndToken(brandId, socialAccountId = null) {
    const socialAccounts = await socialAccountRepository.findByBrandAndPlatform(brandId, PLATFORMS.FACEBOOK);
    const account = (socialAccountId && socialAccounts.find(acc => acc.id === socialAccountId)) || filterRealAccount(socialAccounts);
    if (!account) throw new Error('Facebook account not connected');

    return {
      account,
      pageId: account.platformAccountId,
      pageAccessToken: account.accessToken
    };
  }

  async updateReply(brandId, platformItemId, text, socialAccountId = null) {
    const { pageAccessToken } = await this._getAccountAndToken(brandId, socialAccountId);
    return await facebookGateway.updateComment(platformItemId, text, pageAccessToken);
  }

  async deleteReply(brandId, platformItemId, socialAccountId = null) {
    const { pageAccessToken } = await this._getAccountAndToken(brandId, socialAccountId);
    return await facebookGateway.deleteComment(platformItemId, pageAccessToken);
  }
}

module.exports = FacebookCommentSyncStrategy;
