const BaseInboxSyncAdapter = require('../../../../core/inbox/base-inbox-sync.adapter');
const youtubeGateway = require('../youtube.gateway');
const googleOAuthService = require('../../google-oauth.service');
const { YOUTUBE_COMMENT_SYNC } = require('../youtube.constants');
const { parseGoogleApiError } = require('../youtube-error.util');
const socialAccountRepository = require('../../../../repositories/social/social-account.repository');
const inboxRepository = require('../../../../repositories/social/inbox.repository');
const { PLATFORMS, INBOX_STATUS, INBOX_TYPES } = require('../../../../utils/constants');

class YouTubeInboxSyncAdapter extends BaseInboxSyncAdapter {
  get platform() {
    return PLATFORMS.YOUTUBE;
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

  async syncPostComments(brandId, videoId, inbox) {
    if (!videoId || videoId.length !== 11) return [];
    const { account, auth } = await this._getAccountAndAuth(brandId);
    const inboxItems = [];

    try {
      const response = await youtubeGateway.getCommentThreadsByVideoId(auth, videoId, 100);
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
    } catch (err) {
      const { reason } = parseGoogleApiError(err);
      if (reason === 'commentsDisabled') {
        return inboxItems;
      }
      console.warn(`[YouTubeInboxSyncAdapter] syncPostComments failed for video ${videoId}:`, err.message);
    }

    return inboxItems;
  }

  async reply(brandId, parentPlatformItemId, text, socialAccountId = null, attachmentUrl = null) {
    const { account, auth } = await this._getAccountAndAuth(brandId, socialAccountId);
    
    // 1. Check if parent in DB exists
    const parentInDb = await inboxRepository.findInboxItemByPlatformId(parentPlatformItemId);
    
    // 2. YouTube API only allows replying to top-level comments (IDs starting with Ug...)
    // If user clicked reply on a sub-comment, resolve top-level parent's platformItemId.
    let targetTopLevelPlatformId = parentPlatformItemId;
    if (parentInDb && parentInDb.parentItemId) {
      const topLevelParent = await inboxRepository.findById(parentInDb.parentItemId);
      if (topLevelParent && topLevelParent.platformItemId) {
        targetTopLevelPlatformId = topLevelParent.platformItemId;
      }
    }

    // 3. If target is a Video ID (11 chars not starting with Ug), post as top-level comment thread
    const isVideoId = parentPlatformItemId && parentPlatformItemId.length === 11 && !parentPlatformItemId.startsWith('Ug');
    if (isVideoId) {
      return this.createComment(brandId, parentPlatformItemId, text, socialAccountId, attachmentUrl);
    }

    try {
      const response = await youtubeGateway.insertCommentReply(auth, targetTopLevelPlatformId, text);
      const newComment = response.data;

      const inbox = await inboxRepository.findOrCreateInbox(brandId);

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
    } catch (err) {
      if (err.message && (err.message.includes('insufficient permissions') || err.status === 403)) {
        throw new Error('Gửi phản hồi thất bại: YouTube yêu cầu tài khoản phải kết nối lại OAuth với đầy đủ quyền Quản lý Kênh, hoặc Video/Bình luận này bị khóa tương tác.');
      }
      throw err;
    }
  }

  async createComment(brandId, videoId, text, socialAccountId = null, attachmentUrl = null) {
    const { account, auth } = await this._getAccountAndAuth(brandId, socialAccountId);

    try {
      const response = await youtubeGateway.insertCommentThread(auth, videoId, text);
      const newThread = response.data;
      const newComment = newThread.snippet.topLevelComment;

      const inbox = await inboxRepository.findOrCreateInbox(brandId);

      return inboxRepository.createInboxItem({
        inboxId: inbox.id,
        platform: PLATFORMS.YOUTUBE,
        type: INBOX_TYPES.COMMENT,
        platformItemId: newComment.id,
        authorId: account.platformAccountId,
        authorName: account.displayName,
        authorAvatarUrl: account.profilePictureUrl,
        content: newComment.snippet.textDisplay,
        relatedPostId: videoId,
        platformCreatedAt: new Date(newComment.snippet.publishedAt),
        syncedAt: new Date(),
        status: INBOX_STATUS.READ,
        socialAccountId: account.id
      });
    } catch (err) {
      if (err.message && (err.message.includes('insufficient permissions') || err.status === 403)) {
        throw new Error('Tạo bình luận thất bại: Quyền hạn tài khoản YouTube không đủ (cần kết nối lại tài khoản và tích chọn cấp quyền quản trị Kênh) hoặc Video này bị khóa bình luận.');
      }
      throw err;
    }
  }

  async updateReply(brandId, platformItemId, text, socialAccountId = null) {
    const { auth } = await this._getAccountAndAuth(brandId, socialAccountId);
    return await youtubeGateway.updateComment(auth, platformItemId, text);
  }

  async deleteReply(brandId, platformItemId, socialAccountId = null) {
    const { auth } = await this._getAccountAndAuth(brandId, socialAccountId);
    return await youtubeGateway.deleteComment(auth, platformItemId);
  }

  async _getAccountAndAuth(brandId, socialAccountId = null) {
    const socialAccount = await socialAccountRepository.findAuthContextByBrandAndPlatform(brandId, PLATFORMS.YOUTUBE);
    if (!socialAccount || socialAccount.length === 0) throw new Error('YouTube account not connected');

    const account = (socialAccountId && socialAccount.find(acc => acc.id === socialAccountId)) || socialAccount.find(acc =>
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

module.exports = YouTubeInboxSyncAdapter;
