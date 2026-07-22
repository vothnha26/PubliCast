/**
 * Centralize all constants to avoid Magic Strings across the application.
 * Following SOLID principles for better maintainability.
 */

const PLATFORMS = {
  YOUTUBE: 'YOUTUBE',
  FACEBOOK: 'FACEBOOK',
  INSTAGRAM: 'INSTAGRAM',
  TIKTOK: 'TIKTOK',
  LINKEDIN: 'LINKEDIN',
  TWITTER_X: 'TWITTER_X',
  TELEGRAM: 'TELEGRAM',
  DISCORD: 'DISCORD',
  THREADS: 'THREADS'
};

const USER_ROLES = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  STAFF: 'STAFF',
  USER: 'USER',
  EDITOR: 'EDITOR',
  VIEWER: 'VIEWER',
  ANALYST: 'ANALYST',
  STREAM_MANAGER: 'STREAM_MANAGER',
  CONTENT_MANAGER: 'CONTENT_MANAGER',
  CONTENT_CREATOR: 'CONTENT_CREATOR',
  STREAM_OPERATOR: 'STREAM_OPERATOR',
  CLIENT: 'CLIENT'
};

const USER_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  BANNED: 'BANNED'
};

const AUTH_PROVIDERS = {
  LOCAL: 'LOCAL',
  GOOGLE: 'GOOGLE',
  FACEBOOK: 'FACEBOOK',
  INSTAGRAM: 'INSTAGRAM',
  TIKTOK: 'TIKTOK',
  LINKEDIN: 'LINKEDIN'
};

const INBOX_STATUS = {
  UNREAD: 'UNREAD',
  READ: 'READ',
  RESOLVED: 'RESOLVED',
  OPEN: 'OPEN',
  SPAM: 'SPAM',
  ARCHIVED: 'ARCHIVED'
};

const INBOX_TYPES = {
  COMMENT: 'COMMENT',
  DIRECT_MESSAGE: 'DIRECT_MESSAGE',
  MENTION: 'MENTION',
  REVIEW: 'REVIEW'
};

const POST_STATUS = {
  DRAFT: 'DRAFT',
  SCHEDULED: 'SCHEDULED',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  PUBLISHED: 'PUBLISHED',
  PUBLISHING: 'PUBLISHING',
  RETRYING: 'RETRYING',
  FAILED: 'FAILED',
  REJECTED: 'REJECTED',
  PAUSED: 'PAUSED'
};

/**
 * Trạng thái của workflow record trong DB.
 * Phân biệt với REVIEW_ACTION (input từ reviewer).
 */
const WORKFLOW_STATUS = {
  PENDING:         'PENDING',
  APPROVED:        'APPROVED',
  REJECTED:        'REJECTED',
  REVISION_NEEDED: 'REVISION_NEEDED'
};

/**
 * Hành động reviewer gửi lên — input từ client.
 * Giá trị hiện tại trùng WORKFLOW_STATUS nhưng tách biệt về ngữ nghĩa.
 */
const REVIEW_ACTION = {
  APPROVED:        'APPROVED',
  REJECTED:        'REJECTED',
  REVISION_NEEDED: 'REVISION_NEEDED'
};

/** Chính sách phê duyệt workflow. */
const WORKFLOW_POLICY = {
  AT_LEAST_ONE: 'AT_LEAST_ONE',
  ALL:          'ALL'
};

/** Trạng thái thành viên trong team/brand. */
const TEAM_STATUS = {
  ACTIVE:  'ACTIVE',
  INACTIVE: 'INACTIVE',
  PENDING:  'PENDING'
};

const PERMISSION_KEYS = {
  CREATE_POSTS:        'CREATE_POSTS',
  PUBLISH_POSTS:       'PUBLISH_POSTS',   // Not yet wired to a route; reserved for splitting "publish" out of APPROVE_POSTS later.
  APPROVE_POSTS:       'APPROVE_POSTS',
  DELETE_POSTS:        'DELETE_POSTS',
  MANAGE_ROLES:        'MANAGE_ROLES',
  INVITE_MEMBERS:      'INVITE_MEMBERS', // Not yet wired to a route; MANAGE_TEAM currently covers invite.
  MANAGE_CONNECTIONS:  'MANAGE_CONNECTIONS',
  MANAGE_MEDIA:        'MANAGE_MEDIA',
  CREATE_LIVESTREAM:   'CREATE_LIVESTREAM',
  MANAGE_BILLING:      'MANAGE_BILLING',
  // Keep legacy keys
  MANAGE_TEAM:     'MANAGE_TEAM',
  MANAGE_BRAND:    'MANAGE_BRAND',
  VIEW_ANALYTICS:  'VIEW_ANALYTICS'
};

const ERROR_MESSAGES = {
  REGISTRATION_SUCCESS: 'Registration successful. Please check your email for activation OTP.',
  LOGIN_SUCCESS: 'Login successful',
  EMAIL_ALREADY_EXISTS: 'Email already exists',
  OTP_EXPIRED: 'OTP has expired',
  INVALID_OTP: 'Invalid OTP',
  ACTIVATION_SUCCESS: 'Account activated successfully',
  INVALID_EMAIL: 'Invalid email address',
  ACCOUNT_NOT_ACTIVATED: 'Account not activated. Please verify your email first.',
  ACCOUNT_BANNED: 'Your account has been banned',
  INVALID_PASSWORD: 'Invalid email or password',
  FORGOT_PASSWORD_OTP_SENT: 'OTP sent if email exists',
  RESET_PASSWORD_OTP_EXPIRED: 'OTP has expired, please request again',
  RESET_PASSWORD_OTP_LOCKED: 'Too many wrong attempts. Please request a new OTP.',
  RESET_PASSWORD_INVALID_OTP: 'Invalid OTP',
  NEW_PASSWORD_SAME_AS_OLD: 'New password must differ from old',
  RESET_PASSWORD_SUCCESS: 'Password reset successfully',
  USER_NOT_FOUND: 'User not found',
  INVALID_RESET_TOKEN: 'Mã khôi phục mật khẩu không hợp lệ hoặc đã được sử dụng.',
  RESET_TOKEN_EXPIRED: 'Đường dẫn khôi phục mật khẩu đã hết hạn.',
  RESET_LINK_SENT: 'Đường dẫn đặt lại mật khẩu đã được gửi đến email của bạn.',

  INVALID_APPROVAL_POLICY: 'Chính sách phê duyệt không hợp lệ.',
  EMPTY_REVIEWERS: 'Cần chọn ít nhất một người duyệt.',

  GOOGLE_ACCOUNT_NOT_LINKED: 'Tài khoản Google này chưa được liên kết. Vui lòng đăng ký bằng email/mật khẩu trước.'
};

// Machine-readable error codes (set on Error.code), distinct from ERROR_MESSAGES
// (human-readable text). Consumers branch on these instead of matching message text.
const ERROR_CODES = {
  GOOGLE_ACCOUNT_NOT_LINKED: 'GOOGLE_ACCOUNT_NOT_LINKED'
};

const AUTOLIST_TYPES = {
  SOURCE: {
    MANUAL: 'MANUAL',
    RSS: 'RSS',
    DRIVE: 'DRIVE'
  },
  SCHEDULE: {
    INTERVAL: 'INTERVAL',
    SPECIFIC: 'SPECIFIC'
  }
};

const SEPARATORS = {
  COMMA: ','
};

const splitMediaUrls = (str) => {
  if (!str) return [];
  return str.split(/,(?=\s*https?:\/\/|\s*\/uploads|\s*\/media|\s*\/temp|\s*[a-zA-Z]:\\|\s*\\|\s*\/)/i).map(m => m.trim()).filter(Boolean);
};


const BILLING_CYCLES = {
  MONTHLY: 'MONTHLY',
  ANNUAL: 'ANNUAL'
};

const SUBSCRIPTION_STATUS = {
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED'
};

const INVOICE_STATUS = {
  PAID: 'PAID',
  UNPAID: 'UNPAID'
};

const POST_TYPES = {
  VIDEO: 'VIDEO',
  IMAGE: 'IMAGE',
  CAROUSEL: 'CAROUSEL',
  REEL: 'REEL',
  STORY: 'STORY',
  TEXT: 'TEXT',
  SHORT: 'SHORT'
};

const SYSTEM_PLANS = {
  FREE: 'FREE',
  BASIC: 'BASIC',
  PRO: 'PRO',
  BUSINESS: 'BUSINESS'
};

const ANALYTICS = {
  COOLDOWN_HOURS: parseInt(process.env.SOCIAL_SYNC_COOLDOWN_HOURS) || 12,
  // Mốc bắt đầu "lifetime" — trước ngày này YouTube Analytics không có data chi tiết theo video
  LIFETIME_START_DATE: '2020-01-01',
  GRANULARITY: {
    DAILY: 'DAILY',
    WEEKLY: 'WEEKLY',
    MONTHLY: 'MONTHLY'
  },
  TYPES: {
    YOUTUBE_DETAILED: 'YOUTUBE_DETAILED',
    FACEBOOK_DETAILED: 'FACEBOOK_DETAILED',
    TIKTOK_DETAILED: 'TIKTOK_DETAILED',
    INSTAGRAM_DETAILED: 'INSTAGRAM_DETAILED',
    LINKEDIN_DETAILED: 'LINKEDIN_DETAILED',
    TELEGRAM_DETAILED: 'TELEGRAM_DETAILED',
    DISCORD_DETAILED: 'DISCORD_DETAILED'
  },
  METRICS: {
    FACEBOOK: {
      VIEWS: 'page_media_view',
      IMPRESSIONS: 'page_total_media_view_unique',
      FOLLOWS: 'page_daily_follows_unique',
      ENGAGEMENTS: 'page_post_engagements',
      ACTIONS: 'page_total_actions',
      POST_REACH: 'post_total_media_view_unique',
      POST_VIEWS: 'post_media_view',
      POST_CLICKS: 'post_clicks_by_type'
    },
    YOUTUBE: {
      VIEWS: 'views',
      MINUTES_WATCHED: 'estimatedMinutesWatched',
      AVERAGE_VIEW_DURATION: 'averageViewDuration',
      AVERAGE_VIEW_PERCENTAGE: 'averageViewPercentage',
      UNIQUE_VIEWERS: 'uniqueViewers',
      SUBSCRIBERS_GAINED: 'subscribersGained',
      SUBSCRIBERS_LOST: 'subscribersLost',
      VIEWER_PERCENTAGE: 'viewerPercentage'
    }
  },
  DIMENSIONS: {
    YOUTUBE: {
      TRAFFIC_SOURCE: 'insightTrafficSourceType',
      TRAFFIC_SOURCE_DETAIL: 'insightTrafficSourceDetail',
      COUNTRY: 'country',
      DAY: 'day',
      AGE_GROUP: 'ageGroup',
      GENDER: 'gender',
      DEVICE_TYPE: 'deviceType',
      VIDEO: 'video'
    }
  },
  SORT: {
    YOUTUBE: {
      VIEWS_DESC:            '-views',
      DAY_ASC:               'day',
      MINUTES_WATCHED_DESC:  '-estimatedMinutesWatched'
    }
  }
};

const SOCIAL_TECHNICAL = {
  FB_ATTACHMENT: {
    ALBUM: 'album',
    VIDEO: 'video',
    VIDEO_INLINE: 'video_inline',
    PHOTO: 'photo',
    STATUS: 'status'
  },
  ATTACHMENT_TYPES: {
    VIDEO: 'video',
    IMAGE: 'image',
    PHOTO: 'photo'
  },
  YOUTUBE_RESOURCE: {
    VIDEO: 'video',
    CHANNEL: 'channel',
    PLAYLIST: 'playlist'
  },
  YOUTUBE_PART: {
    SNIPPET: 'snippet',
    STATISTICS: 'statistics',
    CONTENT_DETAILS: 'contentDetails',
    STATUS: 'status',
    REPLIES: 'replies'
  },
  TIKTOK_SCOPES: [
    'user.info.basic',
    'user.info.stats', // Đã xin cấp quyền
    // 'video.list',      // Yêu cầu cấp quyền thêm trên TikTok Developer
    'video.upload'     // Đổi từ video.publish sang video.upload theo cấu hình của người dùng
  ],
  INBOX_LABELS: {
    ME: 'me',
    THEM: 'them'
  }
};

const YOUTUBE_PRIVACY = {
  PRIVATE: 'private',
  PUBLIC: 'public',
  UNLISTED: 'unlisted'
};

const YOUTUBE_CATEGORIES = {
  PEOPLE_BLOGS: '22',
  ENTERTAINMENT: '24',
  EDUCATION: '27',
  SCIENCE_TECH: '28',
  GAMING: '20'
};

const NOTIFICATION_TYPES = {
  STREAM: 'stream',
  CONTENT: 'content',
  TEAM: 'team',
  PLATFORM: 'platform',
  SYSTEM: 'system'
};

const DEFAULT_CONFIG = {
  LOCALE: 'vi-VN',
  TIMEZONE: 'Asia/Ho_Chi_Minh',
  LANGUAGE: 'vi',
  TIME: '12:00',
  CURRENCY: 'USD',
  UNTITLED_POST: 'Untitled Post',
  NO_CONTENT: 'No content',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173'
};

const DISCORD_API = {
  BASE_URL: 'https://discord.com/api/v10',
  CDN_AVATAR: 'https://cdn.discordapp.com/avatars',
  CHANNEL_TYPES: {
    TEXT: 0,
    DM: 1,
    NEWS: 5
  },
  MESSAGE_LIMIT: 50
};

const FACEBOOK_API = {
  GRAPH_URL: 'https://graph.facebook.com',
  VIDEO_BASE_URL: 'https://graph-video.facebook.com',
  // Build avatar URL: /v25.0/{userId}/picture?type=small
  avatarUrl: (version, userId) => `https://graph.facebook.com/${version}/${userId}/picture?type=small`,
  // Build OAuth dialog URL
  dialogUrl: (version, appId, redirectUri, state, scope) =>
    `https://www.facebook.com/${version}/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scope}`
};

const TIKTOK_API = {
  BASE_URL: 'https://open.tiktokapis.com',
  AUTH_URL: 'https://www.tiktok.com/v2/auth/authorize'
};

const YOUTUBE_API = {
  BASE_URL: 'https://www.youtube.com',
  videoUrl: (videoId) => `https://www.youtube.com/watch?v=${videoId}`
};

const GOOGLE_SCOPES = {
  YOUTUBE: 'https://www.googleapis.com/auth/youtube',
  YOUTUBE_READONLY: 'https://www.googleapis.com/auth/youtube.readonly',
  YOUTUBE_FORCE_SSL: 'https://www.googleapis.com/auth/youtube.force-ssl',
  YT_ANALYTICS_READONLY: 'https://www.googleapis.com/auth/yt-analytics.readonly',
  USERINFO_EMAIL: 'https://www.googleapis.com/auth/userinfo.email',
  USERINFO_PROFILE: 'https://www.googleapis.com/auth/userinfo.profile',
  DRIVE_READONLY: 'https://www.googleapis.com/auth/drive.readonly'
};

const FACEBOOK_SCOPES = {
  FACEBOOK: [
    'pages_show_list',
    'pages_read_engagement',
    'pages_read_user_content',
    'read_insights',
    'pages_manage_engagement',
    'business_management',
    'pages_manage_posts'
  ].join(','),
  INSTAGRAM: [
    'pages_show_list',
    'instagram_basic',
    'instagram_manage_comments',
    'instagram_manage_insights',
    'instagram_content_publish',
    'pages_read_engagement',
    'business_management'
  ].join(',')
};

const API_VERSIONS = {
  FACEBOOK: 'v25.0',
  YOUTUBE: 'v3',
  YOUTUBE_ANALYTICS: 'v2',
  TIKTOK: 'v2'
};

const MEDIA_EXTENSIONS = {
  VIDEO: ['.mp4', '.mov', '.avi', '.mkv', '.webm'],
  IMAGE: ['.jpg', '.jpeg', '.png', '.gif', '.webp']
};

const AUDIT_CONFIG = {
  SYSTEM_ACTOR: 'System',
  ROOT_ROLE: 'Root',
  DEFAULT_STATUS: 'success'
};

const WORKSPACE_DEFAULTS = {
  BRAND_NAME: 'New Workspace',
  DEFAULT_TIME: '12:00',
  UNTITLED: 'Untitled',
  FB_POST_FALLBACK: 'Facebook Post',
  YT_POST_FALLBACK: 'New YouTube Post'
};

const SYSTEM_LABELS = {
  ALL: 'All',
  ALL_PLATFORMS: 'All Platforms',
  ALL_STATUSES: 'All Statuses',
  SYSTEM: 'System',
  UNKNOWN: 'Unknown',
  NEW: 'New',
  RENEWAL: 'Renewal'
};

const SEARCH_PATHS = {
  ADMIN_AUDIT: '/admin/audit',
  DASHBOARD: '/dashboard',
  SETTINGS: '/settings'
};

const NOTIFICATION_LABELS = {
  ACTION: {
    MONITOR: 'Monitor',
    REVIEW: 'Review',
    RECONNECT: 'Reconnect',
    VIEW_TEAM: 'View Team',
    MANAGE: 'Manage',
    VIEW: 'View'
  },
  TIME: {
    JUST_NOW: 'Just now',
    MIN_AGO: 'min ago',
    HOUR_AGO: 'h ago',
    DAY_AGO: 'd ago'
  }
};

const PRODUCT_IDS = {
  YOUTUBE_ANALYTICS: 'youtube_analytics',
  FACEBOOK_MANAGEMENT: 'facebook_management',
  TIKTOK_CREATIVE: 'tiktok_creative',
  INSTAGRAM_INSIGHTS: 'instagram_insights',
  AI_CONTENT_ENGINE: 'ai_content_engine',
  AI_BEST_TIME: 'ai_best_time',
  ADS_MANAGER: 'ads_manager',
  UNIFIED_INBOX: 'unified_inbox',
  CUSTOM_LINKS: 'custom_links',
  GOOGLE_DRIVE: 'google_drive'
};

const REPORT_FORMATS = {
  PDF: 'PDF',
  CSV: 'CSV',
  LOOKER_STUDIO: 'LOOKER_STUDIO'
};

const REPORT_FREQUENCIES = {
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY'
};

const REDIS_NAMESPACES = {
  WEBHOOK_DEDUP: 'wh:mid',
  RATE_LIMIT: 'rl',
  SYNC_CACHE: 'sync',
  SMART_LINK_VISITOR: 'sl:visitor'
};

const REDIS_TTL = {
  WEBHOOK_DEDUP_SEC: 600,
  VIDEO_INSIGHTS_SEC: 7200, // 2 giờ
  SMART_LINK_VISITOR_SEC: 86400, // 24 giờ — 1 IP tính là 1 unique visitor/ngày cho 1 SmartLink
  AUTO_REPLY_RATE_LIMIT_WINDOW_SEC: 60
};

// Max auto-replies (1 LLM call + 1 platform reply each) allowed per social
// account per REDIS_TTL.AUTO_REPLY_RATE_LIMIT_WINDOW_SEC — a comment flood
// with no cap meant unbounded LLM cost and risked Meta's anti-spam block on
// the page (#100).
const AUTO_REPLY_RATE_LIMIT_PER_WINDOW = 10;

/**
 * Map YouTube Analytics API values → label tiếng Việt + màu hiển thị.
 * Dùng cho video-insights endpoint (traffic source, device type, demographics).
 */
const YT_VIDEO_INSIGHTS = {
  /**
   * Key constants cho traffic source type — tránh magic string 'YT_SEARCH' v.v.
   * Dùng trong filters API query.
   */
  TRAFFIC_SOURCE_TYPES: {
    SHORTS:           'SHORTS',
    YT_SEARCH:        'YT_SEARCH',
    YT_CHANNEL:       'YT_CHANNEL',
    EXT_URL:          'EXT_URL',
    SUBSCRIBER:       'SUBSCRIBER',
    NO_LINK_EMBEDDED: 'NO_LINK_EMBEDDED',
    NOTIFICATION:     'NOTIFICATION',
    YT_OTHER_PAGE:    'YT_OTHER_PAGE',
    RELATED_VIDEO:    'RELATED_VIDEO',
    END_SCREEN:       'END_SCREEN',
    PLAYLIST:         'PLAYLIST',
    UNKNOWN:          'UNKNOWN'
  },
  TRAFFIC_SOURCE: {
    SHORTS:             { label: 'Trang video ngắn',  color: '#BEF264' },
    YT_SEARCH:          { label: 'YouTube Tìm kiếm', color: '#8E9BEE' },
    YT_CHANNEL:         { label: 'Trang kênh',        color: '#F9A8D4' },
    EXT_URL:            { label: 'Website ngoài',     color: '#FCD34D' },
    SUBSCRIBER:         { label: 'Người đăng ký',    color: '#6EE7B7' },
    NO_LINK_EMBEDDED:   { label: 'Video nhúng',       color: '#93C5FD' },
    NOTIFICATION:       { label: 'Thông báo',         color: '#F87171' },
    YT_OTHER_PAGE:      { label: 'Trang YT khác',     color: '#94A3B8' },
    RELATED_VIDEO:      { label: 'Video liên quan',   color: '#C4B5FD' },
    END_SCREEN:         { label: 'Màn hình cuối',     color: '#FCA5A5' },
    PLAYLIST:           { label: 'Danh sách phát',    color: '#6EE7F7' },
    UNKNOWN:            { label: 'Khác',              color: '#D1D5DB' }
  },
  DEVICE_TYPE: {
    MOBILE_PHONE: { label: 'Điện thoại',  color: '#10B981' },
    COMPUTER:     { label: 'Máy tính',    color: '#6366F1' },
    TV:           { label: 'TV',          color: '#F59E0B' },
    TABLET:       { label: 'Máy tính bảng', color: '#EC4899' },
    GAME_CONSOLE: { label: 'Game console', color: '#A78BFA' },
    UNKNOWN:      { label: 'Khác',        color: '#D1D5DB' }
  },
  DEMOGRAPHICS: {
    GENDER: {
      MALE:   { label: 'Nam', color: '#818CF8' },
      FEMALE: { label: 'Nữ', color: '#F472B6' }
    }
  },
  /**
   * Map country code → tên hiển thị tiếng Việt.
   * Đặt ở đây để nhất quán với TRAFFIC_SOURCE, DEVICE_TYPE (data tách khỏi logic).
   * Nếu code không có trong map → service trả nguyên code (fallback an toàn).
   */
  COUNTRY_NAMES: {
    VN: 'Việt Nam',    US: 'Hoa Kỳ',       GB: 'Anh',
    JP: 'Nhật Bản',   KR: 'Hàn Quốc',     CN: 'Trung Quốc',
    IN: 'Ấn Độ',      DE: 'Đức',           FR: 'Pháp',
    BR: 'Brazil',     CA: 'Canada',         AU: 'Úc',
    SG: 'Singapore',  TH: 'Thái Lan',       PH: 'Philippines',
    MY: 'Malaysia',   ID: 'Indonesia',      TW: 'Đài Loan',
    HK: 'Hồng Kông', NL: 'Hà Lan',         ES: 'Tây Ban Nha',
    IT: 'Ý',          RU: 'Nga',            MX: 'Mexico',
    AR: 'Argentina',  SA: 'Ả Rập Xê Út',    AE: 'UAE',
    NG: 'Nigeria',    EG: 'Ai Cập',         ZA: 'Nam Phi',
    PK: 'Pakistan',   BD: 'Bangladesh',      MM: 'Myanmar',
    KH: 'Campuchia',  LA: 'Lào'
  }
};

const TOKEN_REFRESH = {
  LOOKHEAD_DAYS: 3,
  SCHEDULER_INTERVAL_MS: 12 * 60 * 60 * 1000,
  STARTUP_DELAY_MS: 60000
};

const VIDEO_EDITOR = {
  PROVIDERS: {
    GEMINI: 'GEMINI',
    MOCK: 'MOCK'
  },
  MOODS: {
    UPBEAT: 'upbeat',
    CHILL: 'chill',
    CORPORATE: 'corporate',
    EPIC: 'epic'
  },
  DEFAULT_TRIM_DURATION: 10
};

/** YouTube Quota Optimization - Distributed Lock & Cache Strategy */
const QUOTA_TTL_STRATEGY = {
  YOUTUBE_ANALYTICS: {
    DAILY_LIMIT: 10000,
    THRESHOLDS: [
      { usagePct: 0.8, ttlSec: 12 * 3600 },  // 80%+ usage → Cache 12 hours
      { usagePct: 0.5, ttlSec: 6 * 3600 }    // 50%+ usage → Cache 6 hours
    ],
    DEFAULT_TTL_SEC: 2 * 3600                 // Default → Cache 2 hours
  },
  // TokApi (RapidAPI) hashtag lookup has a very tight monthly quota on the
  // BASIC plan — cap daily calls hard rather than risk exhausting the whole
  // month's budget from a burst of tracking/refresh requests.
  TOKAPI_HASHTAG: {
    DAILY_LIMIT: 20
  }
};

const LOCK_CONFIG = {
  YOUTUBE_INSIGHTS: {
    PREFIX: 'lock:yt:video-insights:',
    TTL_SEC: 30,              // Lock expires after 30s (prevent deadlock on slow API)
    POLL_INTERVAL_MS: 200,    // Check cache every 200ms while waiting
    POLL_TIMEOUT_MS: 5000,    // Wait max 5s for background fetch
    API_TIMEOUT_MS: 15000     // Google API call timeout 15s
  },
  REPORT_SCHEDULER: {
    KEY: 'lock:report-scheduler:daily-scan',
    // Covers one full scanAndSendReports() pass across every brand's config —
    // generous ceiling so a slow run (many brands, slow email delivery)
    // doesn't get treated as crashed and re-triggered by another instance.
    TTL_SEC: 20 * 60
  },
  TIKTOK_REFRESH: {
    PREFIX: 'lock:tiktok-refresh:',
    TTL_SEC: 30,              // Long enough for one refreshAccessToken call + DB write
    POLL_INTERVAL_MS: 200,    // While waiting for the lock winner to finish
    POLL_TIMEOUT_MS: 5000
  }
};

module.exports = {
  PLATFORMS,
  USER_ROLES,
  USER_STATUS,
  AUTH_PROVIDERS,
  INBOX_STATUS,
  INBOX_TYPES,
  POST_STATUS,
  WORKFLOW_STATUS,
  REVIEW_ACTION,
  WORKFLOW_POLICY,
  TEAM_STATUS,
  PERMISSION_KEYS,
  ERROR_MESSAGES,
  ERROR_CODES,
  AUTOLIST_TYPES,
  SEPARATORS,
  BILLING_CYCLES,
  SUBSCRIPTION_STATUS,
  INVOICE_STATUS,
  ANALYTICS,
  POST_TYPES,
  SYSTEM_PLANS,
  YOUTUBE_PRIVACY,
  YOUTUBE_CATEGORIES,
  NOTIFICATION_TYPES,
  DEFAULT_CONFIG,
  DISCORD_API,
  FACEBOOK_API,
  TIKTOK_API,
  YOUTUBE_API,
  GOOGLE_SCOPES,
  FACEBOOK_SCOPES,
  API_VERSIONS,
  MEDIA_EXTENSIONS,
  AUDIT_CONFIG,
  SOCIAL_TECHNICAL,
  WORKSPACE_DEFAULTS,
  SYSTEM_LABELS,
  SEARCH_PATHS,
  NOTIFICATION_LABELS,
  PRODUCT_IDS,
  REPORT_FORMATS,
  REPORT_FREQUENCIES,
  REDIS_NAMESPACES,
  REDIS_TTL,
  AUTO_REPLY_RATE_LIMIT_PER_WINDOW,
  YT_VIDEO_INSIGHTS,
  TOKEN_REFRESH,
  VIDEO_EDITOR,
  QUOTA_TTL_STRATEGY,
  LOCK_CONFIG,
  splitMediaUrls
};

