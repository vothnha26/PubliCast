const BaseInboxDisplayAdapter = require('../../../../core/inbox/base-inbox-display.adapter');
const socialPlatformFactory = require('../../social-platform.factory');
const { PLATFORMS } = require('../../../../utils/constants');

class FacebookInboxDisplayAdapter extends BaseInboxDisplayAdapter {
  get platform() {
    return PLATFORMS.FACEBOOK;
  }

  supportsAutoReply() {
    return true;
  }

  async fetchPlatformPosts(brandId, socialAccountIds = [], options = {}) {
    const service = socialPlatformFactory.getService(PLATFORMS.FACEBOOK);

    // One DB round-trip per connected account — a brand with several
    // Facebook pages was paying their sum sequentially. Promise.allSettled
    // runs them concurrently instead (same pattern as _fetchAllPlatformPosts
    // above this call, which already parallelizes across platforms).
    const idsToFetch = socialAccountIds.length > 0 ? socialAccountIds : [null];
    const results = await Promise.allSettled(
      idsToFetch.map(saId => service.getPublishedVideos(brandId, null, 50, saId))
    );

    const posts = [];
    results.forEach((result, idx) => {
      const saId = idsToFetch[idx];
      if (result.status !== 'fulfilled') {
        console.error(`[FacebookInboxDisplayAdapter] Failed to fetch posts for account ${saId}:`, result.reason?.message || result.reason);
        return;
      }
      const fbPosts = (result.value?.data || []).map(p => ({
        id: p.id,
        title: p.message?.slice(0, 60) || null,
        thumbnailUrl: p.mediaUrl || null,
        platform: PLATFORMS.FACEBOOK,
        publishedAt: p.date || null,
        postUrl: p.postUrl || this.buildPostUrl(p.id),
        socialAccountId: saId,
        views: parseInt(p.video_views || p.views || 0, 10),
        likes: parseInt(p.reactions?.summary?.total_count || p.reactions || p.likes || 0, 10),
        comments: parseInt(p.comments?.summary?.total_count || p.comments || 0, 10),
        shares: parseInt(p.shares?.count || p.shares || 0, 10),
        clicks: parseInt(p.clicks || 0, 10),
        reach: parseInt(p.reach || p.impressions || 0, 10),
      }));
      posts.push(...fbPosts);
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
    if (!postId) return null;
    return `https://www.facebook.com/${postId}`;
  }
}

module.exports = FacebookInboxDisplayAdapter;
