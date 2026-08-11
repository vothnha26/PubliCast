import { PLATFORMS } from "../constants/platforms";

/**
 * Normalizes a published-videos/posts API response into
 * { items, nextPageToken, prevPageToken } — every platform's backend
 * endpoint ends up calling the exact same underlying service method
 * (SocialPlatformFactory's per-platform getPublishedVideos, see
 * channel-insights-summary.service.js's doc comment), but each platform's
 * response shape and field names differ slightly, and Bluesky's needs a
 * field-by-field remap. This is the single place that difference lives,
 * shared between useChannelInsights.js's summary-seeded first page and its
 * own fetchPublishedVideos for page 2+.
 */
export function normalizePublishedVideosResponse(platform, res) {
  if (!res) return { items: [], nextPageToken: null, prevPageToken: null };

  if (platform === PLATFORMS.BLUESKY) {
    const postsList = Array.isArray(res) ? res : (res?.data || []);
    const items = postsList.map((p) => ({
      id: p.id,
      message: p.message || "",
      date: p.date,
      mediaUrl: p.mediaUrl || null,
      reach: p.reach || 0,
      views: p.views || 0,
      likes: p.likes || 0,
      comments: p.comments || 0,
    }));
    return { items, nextPageToken: res?.nextPageToken || null, prevPageToken: res?.prevPageToken || null };
  }

  if (platform === PLATFORMS.TIKTOK) {
    return {
      items: res?.videos || res || [],
      nextPageToken: res?.nextPageToken || null,
      prevPageToken: res?.prevPageToken || null,
    };
  }

  if (
    platform === PLATFORMS.FACEBOOK ||
    platform === PLATFORMS.INSTAGRAM ||
    platform === PLATFORMS.THREADS
  ) {
    return {
      items: res || [],
      nextPageToken: res?.nextPageToken || null,
      prevPageToken: res?.prevPageToken || null,
    };
  }

  // YouTube (and any future platform using the shared getPublishedVideos
  // shape directly).
  return {
    items: res.videos || [],
    nextPageToken: res.nextPageToken || null,
    prevPageToken: res.prevPageToken || null,
  };
}
