/**
 * Chuẩn hóa dữ liệu bài viết thô (từ nhiều nguồn: published feed, planner
 * calendar, list view...) thành shape PostPreview thống nhất trước khi
 * điều hướng sang PostAnalyticsDetailPage. Xem interface.js — PostPreview.
 */
export function mapToPostPreview(rawPost, platform) {
  return {
    id: rawPost.id || rawPost.platformPostId || rawPost.videoId || "",
    title: rawPost.title || rawPost.message || rawPost.caption || "Bài viết không có tiêu đề",
    thumbnail: rawPost.thumbnail || rawPost.thumbnailUrl || (rawPost.mediaUrls && rawPost.mediaUrls[0]) || "",
    platform: platform.toLowerCase(),
    publishedAt: rawPost.publishedAt || rawPost.createdAt || rawPost.date || new Date().toISOString(),
    status: rawPost.status || "published"
  };
}
