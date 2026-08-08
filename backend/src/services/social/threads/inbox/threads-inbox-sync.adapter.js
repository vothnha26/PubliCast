const BaseInboxSyncAdapter = require('../../../../core/inbox/base-inbox-sync.adapter');
const threadsGateway = require('../threads.gateway');
const inboxRepository = require('../../../../repositories/social/inbox.repository');
const socialAuthFactory = require('../../../../core/auth/social-auth.factory');
const { PLATFORMS } = require('../../../../utils/constants');
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
    // Threads API inbox sync implementation stub
    return 0;
  }

  async createComment(brandId, socialAccountId, threadId, content) {
    const authInfo = await socialAuthFactory.getAuthClient(brandId, this.platform, socialAccountId);
    if (!authInfo) throw new Error('Threads account authentication failed');

    const { auth, account } = authInfo;
    const accessToken = auth.pageAccessToken || auth.accessToken;
    const userId = account.platformAccountId || account.id;

    const res = await threadsGateway.createComment(userId, accessToken, threadId, content);
    return {
      id: res.id,
      content,
      createdAt: new Date()
    };
  }

  async reply(brandId, socialAccountId, commentId, content) {
    return this.createComment(brandId, socialAccountId, commentId, content);
  }

  async deleteReply(brandId, socialAccountId, commentId) {
    const authInfo = await socialAuthFactory.getAuthClient(brandId, this.platform, socialAccountId);
    if (!authInfo) throw new Error('Threads account authentication failed');

    const { auth } = authInfo;
    const accessToken = auth.pageAccessToken || auth.accessToken;

    return threadsGateway.deletePost(commentId, accessToken);
  }
}

module.exports = ThreadsInboxSyncAdapter;
