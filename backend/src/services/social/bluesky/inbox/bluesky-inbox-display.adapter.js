const BaseInboxDisplayAdapter = require('../../../../core/inbox/base-inbox-display.adapter');
const socialPlatformFactory = require('../../social-platform.factory');
const { PLATFORMS } = require('../../../../utils/constants');

/**
 * BlueskyInboxDisplayAdapter
 * Adapter chuẩn hóa hiển thị Bluesky bài viết & bình luận trong Unified Inbox.
 */
class BlueskyInboxDisplayAdapter extends BaseInboxDisplayAdapter {
  get platform() {
    return PLATFORMS.BLUESKY;
  }

  supportsAutoReply() {
    return true;
  }

  async fetchPlatformPosts(brandId, socialAccountIds = [], options = {}) {
    const service = socialPlatformFactory.getService(PLATFORMS.BLUESKY);

    // One DB round-trip per connected account — a brand with several
    // Bluesky accounts was paying their sum sequentially. Promise.allSettled
    // runs them concurrently instead.
    const idsToFetch = socialAccountIds.length > 0 ? socialAccountIds : [null];
    const results = await Promise.allSettled(
      idsToFetch.map(saId => service.getPublishedVideos(brandId, null, 50, saId))
    );

    const posts = [];
    results.forEach((result, idx) => {
      const saId = idsToFetch[idx];
      if (result.status !== 'fulfilled') {
        console.error(`[BlueskyInboxDisplayAdapter] Failed to fetch posts for account ${saId}:`, result.reason?.message || result.reason);
        return;
      }
      const bskyPosts = (result.value?.data || []).map(p => ({
        id: p.id || p.uri,
        title: p.text?.slice(0, 60) || p.message?.slice(0, 60) || null,
        thumbnailUrl: p.mediaUrl || p.thumbnailUrl || null,
        platform: PLATFORMS.BLUESKY,
        publishedAt: p.createdAt || p.date || null,
        postUrl: p.postUrl || this.buildPostUrl(p.id || p.uri),
        socialAccountId: saId,
        likes: parseInt(p.likeCount || p.likes || 0, 10),
        comments: parseInt(p.replyCount || p.comments || 0, 10),
        shares: parseInt(p.repostCount || p.quoteCount || p.shares || 0, 10),
        views: parseInt(p.views || 0, 10)
      }));
      posts.push(...bskyPosts);
    });

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
    if (!postId) return 'https://bsky.app';
    if (typeof postId === 'string') {
      if (postId.startsWith('http://') || postId.startsWith('https://')) return postId;
      const match = postId.match(/^at:\/\/(did:[^/]+)\/app\.bsky\.feed\.post\/([^/]+)$/);
      if (match) {
        const [, did, rkey] = match;
        return `https://bsky.app/profile/${did}/post/${rkey}`;
      }
    }
    return `https://bsky.app`;
  }
}

module.exports = BlueskyInboxDisplayAdapter;
