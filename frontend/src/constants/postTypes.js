/**
 * POST_TYPE — Loại nội dung bài đăng, đồng bộ với backend enum.
 */
export const POST_TYPE = {
  VIDEO: 'VIDEO',
  SHORT: 'SHORT',
  REEL: 'REEL',
  STORY: 'STORY',
  IMAGE: 'IMAGE',
  CAROUSEL: 'CAROUSEL',
};

/**
 * YOUTUBE_TYPE — Sub-type UI dành riêng cho YouTube.
 */
export const YOUTUBE_TYPE = {
  VIDEO: 'video',
  SHORT: 'short',
};

/**
 * FACEBOOK_TYPE — Sub-type UI dành riêng cho Facebook.
 */
export const FACEBOOK_TYPE = {
  POST: 'post',
  REEL: 'reel',
  STORY: 'story',
  ALBUM: 'album',
};

/**
 * INSTAGRAM_TYPE — Sub-type UI dành riêng cho Instagram.
 */
export const INSTAGRAM_TYPE = {
  POST: 'post',
  REEL: 'reel',
  STORY: 'story',
};

/**
 * TIKTOK_PRIVACY — Privacy setting cho TikTok posts.
 */
export const TIKTOK_PRIVACY = {
  PUBLIC: 'public',
  FRIENDS: 'friends',
  PRIVATE: 'private',
};

/**
 * APPROVAL_POLICY — Chính sách phê duyệt workflow.
 */
export const APPROVAL_POLICY = {
  AT_LEAST_ONE: 'AT_LEAST_ONE',
  ALL_REQUIRED: 'ALL_REQUIRED',
};

/** YouTube default category: People & Blogs */
export const YOUTUBE_DEFAULT_CATEGORY_ID = '22';
