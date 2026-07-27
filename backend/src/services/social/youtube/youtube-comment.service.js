const youtubeGateway = require('./youtube.gateway');
const googleOAuthService = require('../google-oauth.service');
const socialAccountRepository = require('../../../repositories/social/social-account.repository');
const inboxRepository = require('../../../repositories/social/inbox.repository');
const { PLATFORMS, INBOX_STATUS, INBOX_TYPES } = require('../../../utils/constants');

class YouTubeCommentService {
  async fetchChannelComments(brandId) {
    const { account, auth } = await this._getAccountAndAuth(brandId);
    const inbox = await inboxRepository.findOrCreateInbox(brandId);

    const response = await youtubeGateway.getCommentThreads(auth, account.platformAccountId);
    if (!response.data.items) return [];

    const inboxItems = [];
    for (const thread of response.data.items) {
      const comment = thread.snippet.topLevelComment;
      const item = await this._processComment(comment, account, inbox);
      inboxItems.push(item);

      if (thread.replies && thread.replies.comments) {
        await this._processReplies(thread.replies.comments, item.id, account, inbox);
      }
    }

    await inboxRepository.updateInboxLastSync(inbox.id);
    return inboxItems;
  }

  async replyToComment(brandId, parentCommentId, text) {
    const { account, auth } = await this._getAccountAndAuth(brandId);
    const response = await youtubeGateway.insertCommentReply(auth, parentCommentId, text);
    const newComment = response.data;

    const inbox = await inboxRepository.findOrCreateInbox(brandId);
    const parentInDb = await inboxRepository.findInboxItemByPlatformId(parentCommentId);

    return inboxRepository.createInboxItem({
      inboxId: inbox.id,
      platform: PLATFORMS.YOUTUBE,
      type: INBOX_TYPES.COMMENT,
      platformItemId: newComment.id,
      parentItemId: parentInDb?.id,
      authorId: account.platformAccountId,
      authorName: account.displayName,
      authorAvatarUrl: account.profilePictureUrl,
      content: newComment.snippet.textDisplay,
      relatedPostId: parentInDb?.relatedPostId,
      platformCreatedAt: new Date(newComment.snippet.publishedAt),
      syncedAt: new Date(),
      status: INBOX_STATUS.READ
    });
  }

  async _getAccountAndAuth(brandId) {
    const socialAccount = await socialAccountRepository.findByBrandAndPlatform(brandId, PLATFORMS.YOUTUBE);
    if (!socialAccount || socialAccount.length === 0) throw new Error('YouTube account not connected');

    const account = socialAccount.find(acc => 
      !(acc.accessToken && acc.accessToken.startsWith('mock-')) &&
      !(acc.platformAccountId && acc.platformAccountId.startsWith('mock-'))
    ) || socialAccount[0];
    const auth = googleOAuthService.createClient();
    auth.setCredentials({ access_token: account.accessToken });
    
    return { account, auth };
  }

  async _processComment(comment, account, inbox) {
    return await inboxRepository.upsertInboxItem(
      { platformItemId: comment.id },
      {
        content: comment.snippet.textDisplay,
        authorName: comment.snippet.authorDisplayName,
        authorAvatarUrl: comment.snippet.authorProfileImageUrl,
        syncedAt: new Date(),
        socialAccountId: account.id
      },
      {
        inboxId: inbox.id,
        platform: PLATFORMS.YOUTUBE,
        type: INBOX_TYPES.COMMENT,
        platformItemId: comment.id,
        authorId: comment.snippet.authorChannelId.value,
        authorName: comment.snippet.authorDisplayName,
        authorAvatarUrl: comment.snippet.authorProfileImageUrl,
        content: comment.snippet.textDisplay,
        relatedPostId: comment.snippet.videoId,
        platformCreatedAt: new Date(comment.snippet.publishedAt),
        syncedAt: new Date(),
        status: INBOX_STATUS.UNREAD,
        socialAccountId: account.id
      }
    );
  }

  async _processReplies(replies, parentDbId, account, inbox) {
    for (const reply of replies) {
      await inboxRepository.upsertInboxItem(
        { platformItemId: reply.id },
        {
          content: reply.snippet.textDisplay,
          authorName: reply.snippet.authorDisplayName,
          authorAvatarUrl: reply.snippet.authorProfileImageUrl,
          socialAccountId: account.id
        },
        {
          inboxId: inbox.id,
          platform: PLATFORMS.YOUTUBE,
          type: INBOX_TYPES.COMMENT,
          platformItemId: reply.id,
          parentItemId: parentDbId,
          authorId: reply.snippet.authorChannelId.value,
          authorName: reply.snippet.authorDisplayName,
          authorAvatarUrl: reply.snippet.authorProfileImageUrl,
          content: reply.snippet.textDisplay,
          relatedPostId: reply.snippet.videoId,
          platformCreatedAt: new Date(reply.snippet.publishedAt),
          syncedAt: new Date(),
          status: INBOX_STATUS.READ,
          socialAccountId: account.id
        }
      );
    }
  }
}

module.exports = new YouTubeCommentService();
