const instagramGateway = require('./instagram.gateway');
const socialAccountRepository = require('../../../repositories/social/social-account.repository');
const inboxRepository = require('../../../repositories/social/inbox.repository');
const { PLATFORMS, INBOX_STATUS, INBOX_TYPES, SYSTEM_LABELS } = require('../../../utils/constants');

class InstagramCommentService {
  async fetchChannelComments(brandId) {
    const { account, igAccountId, accessToken } = await this._getAccountAndToken(brandId);
    const inbox = await inboxRepository.findOrCreateInbox(brandId);

    if (accessToken && accessToken.startsWith('mock-')) {
      await inboxRepository.updateInboxLastSync(inbox.id);
      return [];
    }

    try {
      const feedResult = await instagramGateway.getInstagramMediaFeed(igAccountId, accessToken, null, 10);
      const inboxItems = [];

      for (const post of feedResult.data || []) {
        const comments = await instagramGateway.getMediaComments(post.id, accessToken);
        for (const comment of comments) {
          const item = await this._processComment(comment, post.id, account, inbox);
          inboxItems.push(item);

          if (comment.replies && comment.replies.data) {
            await this._processReplies(comment.replies.data, item.id, post.id, account, inbox);
          }
        }
      }

      await inboxRepository.updateInboxLastSync(inbox.id);
      return inboxItems;
    } catch (error) {
      console.error(`[Instagram Comments] Error fetching comments:`, error.message);
      return [];
    }
  }

  async replyToComment(brandId, parentCommentId, text) {
    const { account, accessToken } = await this._getAccountAndToken(brandId);
    
    let response;
    if (accessToken && accessToken.startsWith('mock-')) {
      response = { id: `mock_reply_${Date.now()}` };
    } else {
      response = await instagramGateway.replyToComment(parentCommentId, text, accessToken);
    }
    
    const inbox = await inboxRepository.findOrCreateInbox(brandId);
    const parentInDb = await inboxRepository.findInboxItemByPlatformId(parentCommentId);

    return inboxRepository.createInboxItem({
      inboxId: inbox.id,
      platform: PLATFORMS.INSTAGRAM,
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
    const socialAccount = await socialAccountRepository.findByBrandAndPlatform(brandId, PLATFORMS.INSTAGRAM);
    if (!socialAccount || socialAccount.length === 0) throw new Error('Instagram account not connected');
    
    const account = socialAccount[0];
    return {
      account,
      igAccountId: account.platformAccountId,
      accessToken: account.accessToken
    };
  }

  async _processComment(comment, postId, account, inbox) {
    const authorId = comment.from?.id || (comment.from?.username) || SYSTEM_LABELS.UNKNOWN || 'unknown';
    const authorName = comment.from?.username || comment.from?.name || 'Instagram User';
    const authorAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=60';

    return await inboxRepository.upsertInboxItem(
      { platformItemId: comment.id },
      {
        content: comment.text || '',
        authorName,
        authorAvatarUrl: authorAvatar,
        syncedAt: new Date(),
        socialAccountId: account.id
      },
      {
        inboxId: inbox.id,
        platform: PLATFORMS.INSTAGRAM,
        type: INBOX_TYPES.COMMENT,
        platformItemId: comment.id,
        authorId,
        authorName,
        authorAvatarUrl: authorAvatar,
        content: comment.text || '',
        relatedPostId: postId,
        platformCreatedAt: new Date(comment.timestamp),
        syncedAt: new Date(),
        status: INBOX_STATUS.UNREAD,
        socialAccountId: account.id
      }
    );
  }

  async _processReplies(replies, parentDbId, postId, account, inbox) {
    for (const reply of replies) {
      const replyAuthorId = reply.from?.id || reply.from?.username || SYSTEM_LABELS.UNKNOWN || 'unknown';
      const replyAuthorName = reply.from?.username || reply.from?.name || 'Instagram User';
      const replyAuthorAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=60';

      await inboxRepository.upsertInboxItem(
        { platformItemId: reply.id },
        {
          content: reply.text || '',
          authorName: replyAuthorName,
          authorAvatarUrl: replyAuthorAvatar,
          socialAccountId: account.id
        },
        {
          inboxId: inbox.id,
          platform: PLATFORMS.INSTAGRAM,
          type: INBOX_TYPES.COMMENT,
          platformItemId: reply.id,
          parentItemId: parentDbId,
          authorId: replyAuthorId,
          authorName: replyAuthorName,
          authorAvatarUrl: replyAuthorAvatar,
          content: reply.text || '',
          relatedPostId: postId,
          platformCreatedAt: new Date(reply.timestamp),
          syncedAt: new Date(),
          status: INBOX_STATUS.READ,
          socialAccountId: account.id
        }
      );
    }
  }
}

module.exports = new InstagramCommentService();
