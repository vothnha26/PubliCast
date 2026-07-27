/**
 * YouTube Platform Specific Constants & Technical Constraints
 * 
 * Centralized Single Source of Truth for YouTube Data API v3 integration.
 */

/**
 * YouTube API URLs and Endpoints helper
 */
const YOUTUBE_API = Object.freeze({
  BASE_URL: 'https://www.youtube.com',
  videoUrl: (videoId) => `https://www.youtube.com/watch?v=${videoId}`
});

/**
 * YouTube Comment Threads moderation status parameters
 * @see {@link guide/youtube/reference_api/commentThreads.md} — moderationStatus parameter
 */
const YOUTUBE_MODERATION_STATUS = Object.freeze({
  PUBLISHED: 'published',
  HELD_FOR_REVIEW: 'heldForReview',
  LIKELY_SPAM: 'likelySpam',
  REJECTED: 'rejected'
});

/**
 * YouTube Search API type parameters
 * @see {@link guide/youtube/reference_api/search.md} — type parameter
 */
const YOUTUBE_SEARCH_TYPES = Object.freeze({
  VIDEO: 'video',
  CHANNEL: 'channel',
  PLAYLIST: 'playlist'
});

/**
 * Các giới hạn kỹ thuật chính thức từ YouTube Data API v3 (Technical Constraints)
 * 
 * Tài liệu tham khảo chính thức:
 * @see {@link https://developers.google.com/youtube/v3/docs/videos/insert | Google API: Videos insert}
 * @see {@link https://developers.google.com/youtube/v3/docs/thumbnails/set | Google API: Thumbnails set}
 * @see {@link https://developers.google.com/youtube/v3/docs/watermarks/set | Google API: Watermarks set}
 * @see {@link https://developers.google.com/youtube/v3/docs/channelBanners/insert | Google API: ChannelBanners insert}
 * @see {@link https://developers.google.com/youtube/v3/docs/playlistImages/insert | Google API: PlaylistImages insert}
 * 
 * Tài liệu nội bộ dự án:
 * @see {@link guide/youtube/youtube_api_specifications.md | Bảng đối chiếu PubliCast YouTube API Specs}
 */
const YOUTUBE_CONSTRAINTS = Object.freeze({
  // --- Media upload size limits ---
  /** @type {number} 256GB - Giới hạn file video upload tối đa */
  VIDEO_MAX_SIZE_BYTES: 256 * 1024 * 1024 * 1024,
  /** @type {number} 2MB - Giới hạn dung lượng ảnh Custom Thumbnail */
  THUMBNAIL_MAX_SIZE_BYTES: 2 * 1024 * 1024,
  /** @type {number} 10MB - Giới hạn dung lượng ảnh Channel Watermark */
  WATERMARK_MAX_SIZE_BYTES: 10 * 1024 * 1024,
  /** @type {number} 2048px - Chiều rộng tối thiểu của Channel Banner */
  BANNER_MIN_WIDTH_PX: 2048,
  /** @type {number} 1152px - Chiều cao tối thiểu của Channel Banner */
  BANNER_MIN_HEIGHT_PX: 1152,
  /** @type {number} 2560px - Chiều rộng khuyến nghị của Channel Banner */
  BANNER_RECOMMENDED_WIDTH_PX: 2560,
  /** @type {number} 1440px - Chiều cao khuyến nghị của Channel Banner */
  BANNER_RECOMMENDED_HEIGHT_PX: 1440,
  /** @type {number} 2MB - Giới hạn dung lượng ảnh Playlist Thumbnail */
  PLAYLIST_IMAGE_MAX_SIZE_BYTES: 2 * 1024 * 1024,

  // --- Metadata character limits (snippet fields) ---
  /** @type {number} 100 ký tự - Độ dài tiêu đề video tối đa */
  TITLE_MAX_LENGTH: 100,
  /** @type {number} 5000 ký tự - Độ dài mô tả video tối đa */
  DESCRIPTION_MAX_LENGTH: 5000,
  /** @type {number} 500 ký tự - Tổng độ dài tất cả các tag tối đa */
  TAGS_MAX_TOTAL_LENGTH: 500,

  // --- Accepted MIME types ---
  /** @type {readonly string[]} Danh sách MIME types được chấp nhận cho video */
  VIDEO_MIME_TYPES: Object.freeze(['video/*', 'application/octet-stream']),
  /** @type {readonly string[]} Danh sách MIME types được chấp nhận cho hình ảnh */
  IMAGE_MIME_TYPES: Object.freeze(['image/jpeg', 'image/png', 'application/octet-stream'])
});

/**
 * YouTube PubSubHubbub (WebSub) Protocol Constants
 * @see {@link guide/youtube/youtube_api_specifications.md | PubSubHubbub Specification}
 * @see {@link https://developers.google.com/youtube/v3/guides/push_notifications | Google Push Notifications Guide}
 */
const YOUTUBE_PUBSUB = Object.freeze({
  HUB_URL: 'https://pubsubhubbub.appspot.com/subscribe',
  topicUrl: (channelId) => `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${channelId}`,
  MODE: Object.freeze({
    SUBSCRIBE: 'subscribe',
    UNSUBSCRIBE: 'unsubscribe'
  }),
  STATUS: Object.freeze({
    PENDING: 'PENDING',
    SUBSCRIBED: 'SUBSCRIBED',
    EXPIRED: 'EXPIRED',
    FAILED: 'FAILED'
  }),
  /** Default Lease Time: 864,000 seconds (10 days) */
  DEFAULT_LEASE_SECONDS: 864000,
  /** Refresh subscription when remaining lease time is under 48 hours */
  RENEWAL_THRESHOLD_MS: 48 * 60 * 60 * 1000
});

module.exports = {
  YOUTUBE_API,
  YOUTUBE_MODERATION_STATUS,
  YOUTUBE_SEARCH_TYPES,
  YOUTUBE_CONSTRAINTS,
  YOUTUBE_PUBSUB
};
