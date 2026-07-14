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
  CREATE_POSTS:    'CREATE_POSTS',
  PUBLISH_POSTS:   'PUBLISH_POSTS',
  APPROVE_POSTS:   'APPROVE_POSTS',
  DELETE_POSTS:    'DELETE_POSTS',
  MANAGE_ROLES:    'MANAGE_ROLES',
  INVITE_MEMBERS:  'INVITE_MEMBERS',
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
  USER_NOT_FOUND: 'User not found'
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
      SUBSCRIBERS_GAINED: 'subscribersGained',
      SUBSCRIBERS_LOST: 'subscribersLost',
      VIEWER_PERCENTAGE: 'viewerPercentage'
    }
  },
  DIMENSIONS: {
    YOUTUBE: {
      TRAFFIC_SOURCE: 'insightTrafficSourceType',
      COUNTRY: 'country',
      DAY: 'day',
      AGE_GROUP: 'ageGroup',
      GENDER: 'gender',
      VIDEO: 'video'
    }
  },
  SORT: {
    YOUTUBE: {
      VIEWS_DESC: '-views',
      DAY_ASC: 'day'
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
  SYNC_CACHE: 'sync'
};

const REDIS_TTL = {
  WEBHOOK_DEDUP_SEC: 600
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
  TOKEN_REFRESH,
  VIDEO_EDITOR,
  splitMediaUrls
};

