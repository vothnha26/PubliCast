const BaseInboxSyncAdapter = require('../../../../core/inbox/base-inbox-sync.adapter');
const threadsGateway = require('../threads.gateway');
const socialAuthFactory = require('../../../../core/auth/social-auth.factory');
const inboxRepository = require('../../../../repositories/social/inbox.repository');
const prisma = require('../../../../config/prisma');
const { PLATFORMS, INBOX_TYPES, INBOX_STATUS } = require('../../../../utils/constants');
const logger = require('../../../../utils/logger');

/**
 * ThreadsInboxSyncAdapter
 * Adapter đồng bộ Inbox (Replies & Direct Messages) cho Threads.
 */
class ThreadsInboxSyncAdapter extends BaseInboxSyncAdapter {
  get platform() {
    return PLATFORMS.THREADS;
  }

  async sync(brandId, socialAccountId) {
    const authInfo = await socialAuthFactory.getAuthClient(brandId, this.platform, socialAccountId);
    if (!authInfo) return { syncedCount: 0, errors: ['No auth client available'] };

    const { auth, account } = authInfo;
    const threadsUserId = account.platformAccountId || account.id;

    let repliesSynced = 0;
    const errors = [];

    try {
      repliesSynced = await this.syncReplies(auth, brandId, socialAccountId, threadsUserId);
    } catch (err) {
      logger.error(`[ThreadsInboxSyncAdapter] Replies sync failed: ${err.message}`);
      errors.push(`Replies Sync Error: ${err.message}`);
    }

    return {
      syncedCount: repliesSynced,
      repliesSynced,
      errors
    };
  }

  async syncReplies(auth, brandId, socialAccountId, threadsUserId) {
    return 0;
  }

  async _resolveRealPlatformId(id) {
    if (!id) return null;
    const strId = String(id).trim();
    if (/^\d+$/.test(strId)) {
      return strId;
    }

    // 1. Tìm trong InboxItem
    try {
      const inboxItem = await prisma.inboxItem.findFirst({
        where: { OR: [{ id: strId }, { platformItemId: strId }] }
      });
      if (inboxItem && inboxItem.platformItemId && /^\d+$/.test(String(inboxItem.platformItemId))) {
        return String(inboxItem.platformItemId);
      }
    } catch (e) {
      logger.debug(`[ThreadsInboxSyncAdapter] InboxItem lookup skipped for ${strId}`);
    }

    // 2. Tìm trong Post
    try {
      const post = await prisma.post.findFirst({
        where: { OR: [{ id: strId }, { platformPostId: { contains: strId } }] }
      });
      if (post && post.platformPostId) {
        const rawPlatformId = String(post.platformPostId).trim();
        if (/^\d+$/.test(rawPlatformId)) {
          return rawPlatformId;
        }
        const matches = rawPlatformId.match(/\d{14,20}/g);
        if (matches && matches.length > 0) {
          return matches[0];
        }
      }
    } catch (e) {
      logger.debug(`[ThreadsInboxSyncAdapter] Post lookup skipped for ${strId}`);
    }

    return null;
  }

  /**
   * Order matching BaseInboxSyncAdapter: (brandId, postId, text, socialAccountId = null, attachmentUrl = null)
   */
  async createComment(brandId, postId, text, socialAccountId = null, attachmentUrl = null) {
    const authInfo = await socialAuthFactory.getAuthClient(brandId, this.platform, socialAccountId);
    if (!authInfo) throw new Error('Threads account authentication failed');

    const realPostId = await this._resolveRealPlatformId(postId);
    if (!realPostId) {
      throw new Error(`Không tìm thấy ID bài viết Threads hợp lệ để gửi phản hồi (ID: ${postId}). Bài đăng có thể chưa được đồng bộ từ Threads.`);
    }

    const { auth, account } = authInfo;
    const accessToken = auth.pageAccessToken || auth.accessToken;
    const userId = account.platformAccountId || account.id;

    const res = await threadsGateway.createComment(userId, accessToken, realPostId, text);

    const inbox = await inboxRepository.findOrCreateInbox(brandId);
    const parentInDb = await inboxRepository.findInboxItemByPlatformId(realPostId);

    const newItem = await inboxRepository.createInboxItem({
      inboxId: inbox.id,
      platform: PLATFORMS.THREADS,
      type: INBOX_TYPES.COMMENT,
      platformItemId: res.id,
      parentItemId: parentInDb?.id || null,
      authorId: account.platformAccountId || account.id,
      authorName: account.displayName || 'Threads User',
      authorAvatarUrl: account.profilePictureUrl || null,
      content: text,
      mediaUrls: attachmentUrl || null,
      relatedPostId: parentInDb?.relatedPostId || (typeof postId === 'string' ? postId : null),
      platformCreatedAt: new Date(),
      syncedAt: new Date(),
      status: INBOX_STATUS.READ
    });

    return newItem;
  }

  /**
   * Order matching BaseInboxSyncAdapter: (brandId, parentPlatformItemId, text, socialAccountId = null, attachmentUrl = null)
   */
  async reply(brandId, parentPlatformItemId, text, socialAccountId = null, attachmentUrl = null) {
    return this.createComment(brandId, parentPlatformItemId, text, socialAccountId, attachmentUrl);
  }

  /**
   * Order matching BaseInboxSyncAdapter: (brandId, platformItemId, socialAccountId = null)
   */
  async deleteReply(brandId, platformItemId, socialAccountId = null) {
    const authInfo = await socialAuthFactory.getAuthClient(brandId, this.platform, socialAccountId);
    if (!authInfo) throw new Error('Threads account authentication failed');

    const realPlatformId = (await this._resolveRealPlatformId(platformItemId)) || platformItemId;

    const { auth } = authInfo;
    const accessToken = auth.pageAccessToken || auth.accessToken;

    return threadsGateway.deletePost(realPlatformId, accessToken);
  }
}

module.exports = ThreadsInboxSyncAdapter;
