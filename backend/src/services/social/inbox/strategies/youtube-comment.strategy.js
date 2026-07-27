const BaseSyncStrategy = require('./base.strategy');
const youtubeGateway = require('../../youtube/youtube.gateway');
const googleOAuthService = require('../../google-oauth.service');
const { YOUTUBE_COMMENT_SYNC } = require('../../youtube/youtube.constants');
const { parseGoogleApiError } = require('../../youtube/youtube-error.util');
const socialAccountRepository = require('../../../../repositories/social/social-account.repository');
const inboxRepository = require('../../../../repositories/social/inbox.repository');
const { PLATFORMS, INBOX_STATUS, INBOX_TYPES } = require('../../../../utils/constants');

class YoutubeCommentSyncStrategy extends BaseSyncStrategy {
  supports(platform) {
    return platform.toUpperCase() === PLATFORMS.YOUTUBE;
  }

  async sync(brandId, inbox) {
    const { account, auth } = await this._getAccountAndAuth(brandId);
    const inboxItems = [];
    let pageToken = null;
    let pageCount = 0;

    try {
      do {
        const response = await youtubeGateway.getCommentThreads(auth, account.platformAccountId, 100, pageToken);
        if (response.data && response.data.items) {
          for (const thread of response.data.items) {
            const comment = thread.snippet.topLevelComment;
            const item = await this._processComment(comment, account, inbox);
            inboxItems.push(item);

            if (thread.replies && thread.replies.comments) {
              await this._processReplies(thread.replies.comments, item.id, account, inbox);
            }
          }
        }
        pageToken = response.data?.nextPageToken || null;
        pageCount++;
      } while (pageToken && pageCount < YOUTUBE_COMMENT_SYNC.MAX_PAGES_PER_SYNC);
    } catch (err) {
      const { reason } = parseGoogleApiError(err);
      if (reason === 'commentsDisabled') {
        return inboxItems;
      }
      throw err;
    }

    return inboxItems;
  }

  supportsReply(item) {
    return item.platform === PLATFORMS.YOUTUBE && item.type === INBOX_TYPES.COMMENT;
  }

  async reply(brandId, parentPlatformItemId, text) {
    const { account, auth } = await this._getAccountAndAuth(brandId);
    const response = await youtubeGateway.insertCommentReply(auth, parentPlatformItemId, text);
    const newComment = response.data;

    const inbox = await inboxRepository.findOrCreateInbox(brandId);
    const parentInDb = await inboxRepository.findInboxItemByPlatformId(parentPlatformItemId);

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
      status: INBOX_STATUS.READ,
      socialAccountId: account.id
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

  async updateReply(brandId, platformItemId, text) {
    const { auth } = await this._getAccountAndAuth(brandId);
    return await youtubeGateway.updateComment(auth, platformItemId, text);
  }

  async deleteReply(brandId, platformItemId) {
    const { auth } = await this._getAccountAndAuth(brandId);
    return await youtubeGateway.deleteComment(auth, platformItemId);
  }
}

module.exports = YoutubeCommentSyncStrategy;
