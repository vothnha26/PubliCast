const facebookGateway = require('./facebook.gateway');
const socialAccountRepository = require('../../../repositories/social/social-account.repository');
const inboxRepository = require('../../../repositories/social/inbox.repository');
const { PLATFORMS, INBOX_STATUS, INBOX_TYPES, API_VERSIONS, SYSTEM_LABELS, FACEBOOK_API } = require('../../../utils/constants');

class FacebookCommentService {
  async fetchChannelComments(brandId) {
    const { account, pageId, pageAccessToken } = await this._getAccountAndToken(brandId);
    const inbox = await inboxRepository.findOrCreateInbox(brandId);

    const feed = await facebookGateway.getPageFeed(pageId, pageAccessToken, 10);
    const inboxItems = [];

    for (const post of feed) {
      const comments = await facebookGateway.getPostComments(post.id, pageAccessToken);
      for (const comment of comments) {
        const item = await this._processComment(comment, post.id, account, inbox);
        inboxItems.push(item);

        if (comment.comments && comment.comments.data) {
          await this._processReplies(comment.comments.data, item.id, post.id, account, inbox);
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
    const socialAccount = await socialAccountRepository.findByBrandAndPlatform(brandId, PLATFORMS.FACEBOOK);
    if (!socialAccount || socialAccount.length === 0) throw new Error('Facebook account not connected');
    
    const account = socialAccount[0];
    return {
      account,
      pageId: account.platformAccountId,
      pageAccessToken: account.accessToken
    };
  }

  async _processComment(comment, postId, account, inbox) {
    const authorId = comment.from?.id || SYSTEM_LABELS.UNKNOWN.toLowerCase();
    const authorName = comment.from?.name || 'Facebook User';
    const authorAvatar = FACEBOOK_API.avatarUrl(API_VERSIONS.FACEBOOK, authorId);

    return await inboxRepository.upsertInboxItem(
      { platformItemId: comment.id },
      {
        content: comment.message,
        authorName,
        authorAvatarUrl: authorAvatar,
        syncedAt: new Date(),
        socialAccountId: account.id
      },
      {
        inboxId: inbox.id,
        platform: PLATFORMS.FACEBOOK,
        type: INBOX_TYPES.COMMENT,
        platformItemId: comment.id,
        authorId,
        authorName,
        authorAvatarUrl: authorAvatar,
        content: comment.message,
        relatedPostId: postId,
        platformCreatedAt: new Date(comment.created_time),
        syncedAt: new Date(),
        status: INBOX_STATUS.UNREAD,
        socialAccountId: account.id
      }
    );
  }

  async _processReplies(replies, parentDbId, postId, account, inbox) {
    for (const reply of replies) {
      const replyAuthorId = reply.from?.id || SYSTEM_LABELS.UNKNOWN.toLowerCase();
      const replyAuthorName = reply.from?.name || 'Facebook User';
      const replyAuthorAvatar = FACEBOOK_API.avatarUrl(API_VERSIONS.FACEBOOK, replyAuthorId);

      await inboxRepository.upsertInboxItem(
        { platformItemId: reply.id },
        {
          content: reply.message,
          authorName: replyAuthorName,
          authorAvatarUrl: replyAuthorAvatar,
          socialAccountId: account.id
        },
        {
          inboxId: inbox.id,
          platform: PLATFORMS.FACEBOOK,
          type: INBOX_TYPES.COMMENT,
          platformItemId: reply.id,
          parentItemId: parentDbId,
          authorId: replyAuthorId,
          authorName: replyAuthorName,
          authorAvatarUrl: replyAuthorAvatar,
          content: reply.message,
          relatedPostId: postId,
          platformCreatedAt: new Date(reply.created_time),
          syncedAt: new Date(),
          status: INBOX_STATUS.READ,
          socialAccountId: account.id
        }
      );
    }
  }
}

module.exports = new FacebookCommentService();
