const BaseInboxSyncAdapter = require('../../../../core/inbox/base-inbox-sync.adapter');
const facebookGateway = require('../facebook.gateway');
const socialAccountRepository = require('../../../../repositories/social/social-account.repository');
const inboxRepository = require('../../../../repositories/social/inbox.repository');
const { PLATFORMS, INBOX_STATUS, INBOX_TYPES } = require('../../../../utils/constants');
const { filterRealAccount, processComment, processReplies } = require('../facebook-comment.util');

class FacebookInboxSyncAdapter extends BaseInboxSyncAdapter {
  get platform() {
    return PLATFORMS.FACEBOOK;
  }

  async sync(brandId, inbox) {
    const { account, pageId, pageAccessToken } = await this._getAccountAndAuth(brandId);
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

  async syncPostComments(brandId, postId, inbox) {
    if (!postId) return [];
    const inboxItems = [];

    try {
      const { account, pageAccessToken } = await this._getAccountAndAuth(brandId);
      const comments = await facebookGateway.getPostComments(postId, pageAccessToken);

      if (Array.isArray(comments)) {
        for (const comment of comments) {
          const item = await processComment(comment, postId, account, inbox);
          inboxItems.push(item);

          if (comment.comments && comment.comments.data) {
            await processReplies(comment.comments.data, item.id, postId, account, inbox);
          }
        }
      }
    } catch (err) {
      console.warn(`[FacebookInboxSyncAdapter] syncPostComments failed for post ${postId}:`, err.message);
    }

    return inboxItems;
  }

  async reply(brandId, parentPlatformItemId, text, socialAccountId = null, attachmentUrl = null) {
    const { account, pageAccessToken } = await this._getAccountAndAuth(brandId, socialAccountId);
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

  async createComment(brandId, postId, text, socialAccountId = null, attachmentUrl = null) {
    const { account, pageAccessToken } = await this._getAccountAndAuth(brandId, socialAccountId);
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

  async updateReply(brandId, platformItemId, text, socialAccountId = null) {
    const { pageAccessToken } = await this._getAccountAndAuth(brandId, socialAccountId);
    return await facebookGateway.updateComment(platformItemId, text, pageAccessToken);
  }

  async deleteReply(brandId, platformItemId, socialAccountId = null) {
    const { pageAccessToken } = await this._getAccountAndAuth(brandId, socialAccountId);
    return await facebookGateway.deleteComment(platformItemId, pageAccessToken);
  }

  async _getAccountAndAuth(brandId, socialAccountId = null) {
    const socialAccounts = await socialAccountRepository.findByBrandAndPlatform(brandId, PLATFORMS.FACEBOOK);
    const account = (socialAccountId && socialAccounts.find(acc => acc.id === socialAccountId)) || filterRealAccount(socialAccounts);
    if (!account) throw new Error('Facebook account not connected');

    return {
      account,
      pageId: account.platformAccountId,
      pageAccessToken: account.accessToken
    };
  }
}

module.exports = FacebookInboxSyncAdapter;
