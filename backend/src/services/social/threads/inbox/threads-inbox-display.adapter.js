const BaseInboxDisplayAdapter = require('../../../../core/inbox/base-inbox-display.adapter');
const socialPlatformFactory = require('../../social-platform.factory');
const { PLATFORMS } = require('../../../../utils/constants');

/**
 * ThreadsInboxDisplayAdapter
 * Adapter chuẩn hóa hiển thị Threads bài viết & bình luận trong Unified Inbox.
 */
class ThreadsInboxDisplayAdapter extends BaseInboxDisplayAdapter {
  get platform() {
    return PLATFORMS.THREADS;
  }

  supportsAutoReply() {
    return true;
  }

  async fetchPlatformPosts(brandId, socialAccountIds = [], options = {}) {
    const service = socialPlatformFactory.getService(PLATFORMS.THREADS);
    const posts = [];

    const idsToFetch = socialAccountIds.length > 0 ? socialAccountIds : [null];
    for (const saId of idsToFetch) {
      try {
        const res = await service.getPublishedVideos(brandId, null, 50, saId);
        const threadsPosts = (res?.data || []).map(p => ({
          id: p.id,
          title: p.text?.slice(0, 60) || p.message?.slice(0, 60) || null,
          thumbnailUrl: p.mediaUrl || p.thumbnailUrl || null,
          platform: PLATFORMS.THREADS,
          publishedAt: p.date || p.createdAt || null,
          postUrl: p.postUrl || p.permalink || this.buildPostUrl(p.id),
          socialAccountId: saId,
          likes: parseInt(p.like_count || p.likes || 0, 10),
          comments: parseInt(p.reply_count || p.comments || 0, 10),
          shares: parseInt(p.repost_count || p.shares || 0, 10),
          views: parseInt(p.views || 0, 10)
        }));
        posts.push(...threadsPosts);
      } catch (err) {
        console.error(`[ThreadsInboxDisplayAdapter] Failed to fetch posts for account ${saId}:`, err.message);
      }
    }

    return posts;
  }

  buildThumbnail(item, dbPost, trackedVideo) {
    if (trackedVideo?.thumbnailUrl) return trackedVideo.thumbnailUrl;
    if (item?.videoContext?.thumbnailUrl && !item.videoContext.thumbnailUrl.includes('dicebear')) {
      return item.videoContext.thumbnailUrl;
    }
    if (dbPost?.mediaUrls && Array.isArray(dbPost.mediaUrls) && dbPost.mediaUrls.length > 0) {
      return dbPost.mediaUrls[0];
    }
    return null;
  }

  buildPostUrl(postId) {
    if (!postId) return null;
    if (typeof postId === 'string' && (postId.startsWith('http://') || postId.startsWith('https://'))) {
      return postId;
    }
    return `https://www.threads.net/post/${postId}`;
  }
}

module.exports = ThreadsInboxDisplayAdapter;
