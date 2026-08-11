const BaseInboxDisplayAdapter = require('../../../../core/inbox/base-inbox-display.adapter');
const socialPlatformFactory = require('../../social-platform.factory');
const { PLATFORMS } = require('../../../../utils/constants');

class TikTokInboxDisplayAdapter extends BaseInboxDisplayAdapter {
  get platform() {
    return PLATFORMS.TIKTOK;
  }

  supportsAutoReply() {
    return true;
  }

  async fetchPlatformPosts(brandId, socialAccountIds = [], options = {}) {
    const service = socialPlatformFactory.getService(PLATFORMS.TIKTOK);

    // One DB round-trip per connected account — a brand with several
    // TikTok accounts was paying their sum sequentially. Promise.allSettled
    // runs them concurrently instead.
    const idsToFetch = socialAccountIds.length > 0 ? socialAccountIds : [null];
    const results = await Promise.allSettled(
      idsToFetch.map(saId => service.getPublishedVideos(brandId, null, 50, saId))
    );

    const posts = [];
    results.forEach((result, idx) => {
      const saId = idsToFetch[idx];
      if (result.status !== 'fulfilled') {
        console.error(`[TikTokInboxDisplayAdapter] Failed to fetch posts for account ${saId}:`, result.reason?.message || result.reason);
        return;
      }
      const tiktokPosts = (result.value?.videos || []).map(p => ({
        id: p.id,
        title: p.title || p.video_description || null,
        thumbnailUrl: p.thumbnailUrl || p.cover_image_url || null,
        platform: PLATFORMS.TIKTOK,
        publishedAt: p.publishedAt || p.create_time || null,
        postUrl: p.postUrl || this.buildPostUrl(p.id),
        socialAccountId: saId,
        views: parseInt(p.views || 0, 10),
        likes: parseInt(p.likes || 0, 10),
        comments: parseInt(p.comments || 0, 10),
        shares: parseInt(p.shares || 0, 10)
      }));
      posts.push(...tiktokPosts);
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
    return `https://www.tiktok.com/video/${postId}`;
  }
}

module.exports = TikTokInboxDisplayAdapter;
