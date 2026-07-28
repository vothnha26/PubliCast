const facebookGateway = require('./facebook.gateway');
const socialAccountRepository = require('../../../repositories/social/social-account.repository');
const inboxRepository = require('../../../repositories/social/inbox.repository');
const { PLATFORMS, INBOX_STATUS, INBOX_TYPES } = require('../../../utils/constants');
const { filterRealAccount, processComment, processReplies } = require('./facebook-comment.util');

class FacebookCommentService {
  async fetchChannelComments(brandId) {
    const { account, pageId, pageAccessToken } = await this._getAccountAndToken(brandId);
    const inbox = await inboxRepository.findOrCreateInbox(brandId);

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

    await inboxRepository.updateInboxLastSync(inbox.id);
    return inboxItems;
  }

  async replyToComment(brandId, parentCommentId, text) {
    const { account, pageAccessToken } = await this._getAccountAndToken(brandId);
    const response = await facebookGateway.replyToComment(parentCommentId, text, pageAccessToken);
    
    const inbox = await inboxRepository.findOrCreateInbox(brandId);
    const parentInDb = await inboxRepository.findInboxItemByPlatformId(parentCommentId);

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
      relatedPostId: parentInDb?.relatedPostId,
      platformCreatedAt: new Date(),
      syncedAt: new Date(),
      status: INBOX_STATUS.READ,
      socialAccountId: account.id
    });
  }

  async _getAccountAndToken(brandId) {
    const socialAccounts = await socialAccountRepository.findByBrandAndPlatform(brandId, PLATFORMS.FACEBOOK);
    const account = filterRealAccount(socialAccounts);
    if (!account) throw new Error('Facebook account not connected');
    
    return {
      account,
      pageId: account.platformAccountId,
      pageAccessToken: account.accessToken
    };
  }
}

module.exports = new FacebookCommentService();
