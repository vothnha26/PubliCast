const BaseInboxSyncAdapter = require('../../../../core/inbox/base-inbox-sync.adapter');
const blueskyGateway = require('../bluesky.gateway');
const socialAuthFactory = require('../../../../core/auth/social-auth.factory');
const inboxRepository = require('../../../../repositories/social/inbox.repository');
const prisma = require('../../../../config/prisma');
const { PLATFORMS, INBOX_TYPES, INBOX_STATUS, BLUESKY_CONSTANTS } = require('../../../../utils/constants');
const logger = require('../../../../utils/logger');

/**
 * BlueskyInboxSyncAdapter
 * Adapter đồng bộ Inbox (Replies & Notifications) cho Bluesky (AT Protocol).
 */
class BlueskyInboxSyncAdapter extends BaseInboxSyncAdapter {
  get platform() {
    return PLATFORMS.BLUESKY;
  }

  async sync(brandId, socialAccountId) {
    const authInfo = await socialAuthFactory.getAuthClient(brandId, this.platform, socialAccountId);
    if (!authInfo) return { syncedCount: 0, errors: ['No auth client available'] };

    const { auth } = authInfo;
    const agent = auth.agent || auth.client;
    if (!agent) return { syncedCount: 0, errors: ['No active Bluesky AT Protocol agent'] };

    let repliesSynced = 0;
    const errors = [];

    try {
      const notificationsRes = await blueskyGateway.listNotifications(agent, { limit: 50 });
      const notifications = notificationsRes.notifications || [];

      const replyNotifications = notifications.filter(
        n => n.reason === 'reply' || n.reason === 'mention' || n.reason === 'quote'
      );

      for (const notif of replyNotifications) {
        try {
          const threadRes = await blueskyGateway.getPostThread(agent, {
            uri: notif.uri,
            depth: 6,
            parentHeight: 10
          });

          if (threadRes && threadRes.$type === BLUESKY_CONSTANTS.RECORD_TYPES.THREAD_VIEW_POST) {
            const extractedPosts = this._extractPostsFromThreadView(threadRes);
            repliesSynced += extractedPosts.length;
          }
        } catch (err) {
          logger.warn(`[BlueskyInboxSyncAdapter] Failed to extract thread for notification ${notif.uri}: ${err.message}`);
        }
      }
    } catch (err) {
      logger.error(`[BlueskyInboxSyncAdapter] Notifications sync failed: ${err.message}`);
      errors.push(`Notifications Sync Error: ${err.message}`);
    }

    return {
      syncedCount: repliesSynced,
      repliesSynced,
      errors
    };
  }

  /**
   * Sync bình luận cho 1 bài viết Bluesky cụ thể bằng API getPostThread
   */
  async syncPostComments(brandId, postId, inbox) {
    const authInfo = await socialAuthFactory.getAuthClient(brandId, this.platform, null);
    if (!authInfo) return [];

    const { auth } = authInfo;
    const agent = auth.agent || auth.client;
    if (!agent) return [];

    const realUri = await this._resolveRealPlatformId(postId);
    if (!realUri || !realUri.startsWith('at://')) return [];

    try {
      const threadRes = await blueskyGateway.getPostThread(agent, {
        uri: realUri,
        depth: 6,
        parentHeight: 10
      });

      if (threadRes && threadRes.$type === BLUESKY_CONSTANTS.RECORD_TYPES.THREAD_VIEW_POST) {
        return this._extractPostsFromThreadView(threadRes);
      }
    } catch (err) {
      logger.warn(`[BlueskyInboxSyncAdapter] syncPostComments failed for post ${realUri}: ${err.message}`);
    }

    return [];
  }

  /**
   * Trích xuất danh sách bài viết/phản hồi từ ThreadViewPost tree một cách đệ quy
   */
  _extractPostsFromThreadView(node, results = []) {
    if (!node || typeof node !== 'object') return results;

    const isNotFound = node.$type === 'app.bsky.feed.defs#notFoundPost' || node.notFound;
    const isBlocked = node.$type === 'app.bsky.feed.defs#blockedPost' || node.blocked;

    if (isNotFound || isBlocked) {
      return results;
    }

    if (node.post && node.post.uri) {
      if (!results.some(p => p.uri === node.post.uri)) {
        results.push(node.post);
      }
    }

    if (node.parent) {
      this._extractPostsFromThreadView(node.parent, results);
    }

    if (Array.isArray(node.replies)) {
      for (const replyView of node.replies) {
        this._extractPostsFromThreadView(replyView, results);
      }
    }

    return results;
  }

  async _resolveRealPlatformId(id) {
    if (!id) return null;
    const strId = String(id).trim();
    if (strId.startsWith('at://')) {
      return strId;
    }

    // 1. Tìm trong InboxItem
    try {
      const inboxItem = await prisma.inboxItem.findFirst({
        where: { OR: [{ id: strId }, { platformItemId: strId }] }
      });
      if (inboxItem && inboxItem.platformItemId && String(inboxItem.platformItemId).startsWith('at://')) {
        return String(inboxItem.platformItemId);
      }
    } catch (e) {
      logger.debug(`[BlueskyInboxSyncAdapter] InboxItem lookup skipped for ${strId}`);
    }

    // 2. Tìm trong Post
    try {
      const post = await prisma.post.findFirst({
        where: { OR: [{ id: strId }, { platformPostId: { contains: strId } }] }
      });
      if (post && post.platformPostId) {
        const rawPlatformId = String(post.platformPostId).trim();
        if (rawPlatformId.startsWith('at://')) {
          return rawPlatformId;
        }
        const match = rawPlatformId.match(/at:\/\/(did:[^"'\s}]+)\/app\.bsky\.feed\.post\/([^"'\s}]+)/);
        if (match) {
          return match[0];
        }
      }
    } catch (e) {
      logger.debug(`[BlueskyInboxSyncAdapter] Post lookup skipped for ${strId}`);
    }

    return null;
  }

  /**
   * Tạo bình luận đầu tiên (Top-level comment) hoặc phản hồi trên bài viết Bluesky
   * Order matching BaseInboxSyncAdapter: (brandId, postId, text, socialAccountId = null, attachmentUrl = null)
   */
  async createComment(brandId, postId, text, socialAccountId = null, attachmentUrl = null) {
    const authInfo = await socialAuthFactory.getAuthClient(brandId, this.platform, socialAccountId);
    if (!authInfo) throw new Error('Bluesky account authentication failed');

    const { auth, account } = authInfo;
    const agent = auth.agent || auth.client;
    if (!agent) throw new Error('No active Bluesky AT Protocol agent');

    const realPostUri = await this._resolveRealPlatformId(postId);

    let replyTo = undefined;
    if (realPostUri && realPostUri.startsWith('at://')) {
      try {
        const thread = await blueskyGateway.getPostThread(agent, { uri: realPostUri });
        if (thread && thread.post && thread.post.cid) {
          const postView = thread.post;
          const recordReply = postView.record?.reply;
          const rootRef = recordReply?.root
            ? { uri: recordReply.root.uri, cid: recordReply.root.cid }
            : { uri: postView.uri, cid: postView.cid };
          const parentRef = { uri: postView.uri, cid: postView.cid };

          replyTo = { root: rootRef, parent: parentRef };
          logger.info(`[BlueskyInboxSyncAdapter] Resolved replyTo refs for ${realPostUri}: root=${rootRef.uri}, parent=${parentRef.uri}`);
        } else {
          logger.warn(`[BlueskyInboxSyncAdapter] getPostThread returned no post or cid for ${realPostUri}`);
        }
      } catch (err) {
        logger.error(`[BlueskyInboxSyncAdapter] Failed to resolve thread parent refs for ${realPostUri}: ${err.message}`);
      }
    } else {
      logger.warn(`[BlueskyInboxSyncAdapter] Cannot resolve AT URI for postId=${postId}`);
    }

    const res = await blueskyGateway.publishPost(agent, {
      text,
      replyTo
    });

    const inbox = await inboxRepository.findOrCreateInbox(brandId);
    const parentInDb = realPostUri ? await inboxRepository.findInboxItemByPlatformId(realPostUri) : null;

    const newItem = await inboxRepository.createInboxItem({
      inboxId: inbox.id,
      platform: PLATFORMS.BLUESKY,
      type: INBOX_TYPES.COMMENT,
      platformItemId: res.id || res.uri,
      parentItemId: parentInDb?.id || null,
      authorId: account.platformAccountId || account.blueskyAccount?.did || account.id,
      authorName: account.displayName || account.blueskyAccount?.handle || 'Bluesky User',
      authorAvatarUrl: account.profilePictureUrl || account.blueskyAccount?.avatar || null,
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
   * Phản hồi một bình luận/bài viết đã có trên Bluesky
   * Order matching BaseInboxSyncAdapter: (brandId, parentPlatformItemId, text, socialAccountId = null, attachmentUrl = null)
   */
  async reply(brandId, parentPlatformItemId, text, socialAccountId = null, attachmentUrl = null) {
    return this.createComment(brandId, parentPlatformItemId, text, socialAccountId, attachmentUrl);
  }

  /**
   * Xóa nội dung trả lời/bài viết trên Bluesky
   * Order matching BaseInboxSyncAdapter: (brandId, platformItemId, socialAccountId = null)
   */
  async deleteReply(brandId, platformItemId, socialAccountId = null) {
    const authInfo = await socialAuthFactory.getAuthClient(brandId, this.platform, socialAccountId);
    if (!authInfo) throw new Error('Bluesky account authentication failed');

    const realPlatformId = (await this._resolveRealPlatformId(platformItemId)) || platformItemId;

    const { auth } = authInfo;
    const agent = auth.agent || auth.client;
    if (!agent) throw new Error('No active Bluesky AT Protocol agent');

    return blueskyGateway.deletePost(agent, realPlatformId);
  }
}

module.exports = BlueskyInboxSyncAdapter;
