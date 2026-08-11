const BaseInboxDisplayAdapter = require('../../../../core/inbox/base-inbox-display.adapter');
const socialPlatformFactory = require('../../social-platform.factory');
const { PLATFORMS } = require('../../../../utils/constants');

class YouTubeInboxDisplayAdapter extends BaseInboxDisplayAdapter {
  get platform() {
    return PLATFORMS.YOUTUBE;
  }

  async fetchPlatformPosts(brandId, socialAccountIds = [], options = {}) {
    const service = socialPlatformFactory.getService(PLATFORMS.YOUTUBE);

    // One DB round-trip per connected channel — a brand with several
    // YouTube channels was paying their sum sequentially. Promise.allSettled
    // runs them concurrently instead.
    const idsToFetch = socialAccountIds.length > 0 ? socialAccountIds : [null];
    const results = await Promise.allSettled(
      idsToFetch.map(saId => service.getPublishedVideos(brandId, null, 50, saId))
    );

    const posts = [];
    results.forEach((result, idx) => {
      const saId = idsToFetch[idx];
      if (result.status !== 'fulfilled') {
        console.error(`[YouTubeInboxDisplayAdapter] Failed to fetch videos for account ${saId}:`, result.reason?.message || result.reason);
        return;
      }
      const videos = (result.value?.videos || [])
        .filter(v => v.privacyStatus !== 'private')
        .map(v => ({
          id: v.id,
          title: v.title || null,
          thumbnailUrl: v.thumbnailUrl || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
          platform: PLATFORMS.YOUTUBE,
          publishedAt: v.publishedAt || null,
          postUrl: this.buildPostUrl(v.id),
          socialAccountId: saId,
          views: parseInt(v.views || 0, 10),
          likes: parseInt(v.likes || 0, 10),
          comments: parseInt(v.comments || 0, 10),
        }));
      posts.push(...videos);
    });

    return posts;
  }

  buildThumbnail(item, dbPost, trackedVideo) {
    if (trackedVideo?.thumbnailUrl) return trackedVideo.thumbnailUrl;
    if (item?.videoContext?.thumbnailUrl && !item.videoContext.thumbnailUrl.includes('dicebear')) {
      return item.videoContext.thumbnailUrl;
    }

    const postId = item?.relatedPostId || item?.videoContext?.id || trackedVideo?.videoId || dbPost?.id;
    if (postId) {
      return `https://i.ytimg.com/vi/${postId}/hqdefault.jpg`;
    }

    return null;
  }

  buildPostUrl(postId) {
    if (!postId) return null;
    return `https://www.youtube.com/watch?v=${postId}`;
  }
}

module.exports = YouTubeInboxDisplayAdapter;
