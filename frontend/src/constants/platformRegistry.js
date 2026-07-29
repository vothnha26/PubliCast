import { PLATFORMS } from './platforms';
import { POST_TYPE } from './postTypes';

const graphemeSegmenter = typeof Intl !== 'undefined' && Intl.Segmenter
  ? new Intl.Segmenter('en', { granularity: 'grapheme' })
  : null;

export const PLATFORM_CONFIGS = {
  [PLATFORMS.FACEBOOK]: {
    id: PLATFORMS.FACEBOOK,
    name: 'Facebook',
    defaultType: 'post',
    supportedTypes: [
      { id: 'post', label: 'Feed Post' },
      { id: 'album', label: 'Album' },
      { id: 'reel', label: 'Reel' },
      { id: 'story', label: 'Story' }
    ],
    getPostType: (subType, hasMedia, isVideo) => {
      if (subType === 'album') return POST_TYPE.CAROUSEL;
      if (subType === 'story') return POST_TYPE.STORY;
      if (subType === 'reel') return POST_TYPE.REEL;
      return (hasMedia && isVideo) ? POST_TYPE.VIDEO : POST_TYPE.IMAGE;
    },
    validationRules: {
      album: [
        {
          check: ({ mediaCount }) => !mediaCount || mediaCount < 2,
          message: () => "Facebook Album -> Add at least 2 images."
        }
      ],
      reel: [
        {
          check: ({ hasMedia }) => !hasMedia,
          message: () => "Reel -> Add at least 1 video."
        },
        {
          check: ({ hasMedia, isVideo }) => hasMedia && !isVideo,
          message: () => "Facebook Reel must be a video file."
        },
        {
          check: ({ videoDuration }) => videoDuration > 0 && (videoDuration < 3 || videoDuration > 90),
          message: ({ videoDuration }) => `Facebook Reels must be between 3 and 90 seconds. (Current: ${videoDuration.toFixed(1)}s)`
        },
        {
          check: ({ videoWidth, videoHeight }) => videoWidth > 0 && videoHeight > 0 && videoWidth >= videoHeight,
          message: () => "Facebook Reels must be vertical (9:16 aspect ratio). Current ratio is horizontal or square."
        }
      ],
      story: [
        {
          check: ({ hasMedia }) => !hasMedia,
          message: () => "Auto publish (story) -> Add at least 1 image or video."
        },
        {
          check: ({ isVideo, videoDuration }) => isVideo && videoDuration > 15,
          message: ({ videoDuration }) => `Facebook Story videos should be 15 seconds or less. (Current: ${videoDuration.toFixed(1)}s)`
        },
        {
          check: ({ isVideo, videoWidth, videoHeight }) => isVideo && videoWidth > 0 && videoHeight > 0 && videoWidth >= videoHeight,
          message: () => "Facebook Story videos should be vertical (9:16 aspect ratio)."
        }
      ]
    }
  },
  [PLATFORMS.INSTAGRAM]: {
    id: PLATFORMS.INSTAGRAM,
    name: 'Instagram',
    defaultType: 'post',
    supportedTypes: [
      { id: 'post', label: 'Feed Post' },
      { id: 'reel', label: 'Reel' },
      { id: 'story', label: 'Story' }
    ],
    getPostType: (subType, hasMedia, isVideo) => {
      if (subType === 'story') return POST_TYPE.STORY;
      if (subType === 'reel') return POST_TYPE.REEL;
      return (hasMedia && isVideo) ? POST_TYPE.VIDEO : POST_TYPE.IMAGE;
    },
    validationRules: {
      _always: [
        {
          check: ({ hasMedia }) => !hasMedia,
          message: () => "Instagram requires at least one photo or video to publish a post."
        }
      ],
      reel: [
        {
          check: ({ hasMedia, isVideo }) => hasMedia && !isVideo,
          message: () => "Instagram Reel must be a video."
        },
        {
          check: ({ videoDuration }) => videoDuration > 0 && (videoDuration < 3 || videoDuration > 900),
          message: ({ videoDuration }) => `Instagram Reels must be between 3 seconds and 15 minutes. (Current: ${videoDuration.toFixed(1)}s)`
        },
        {
          check: ({ videoWidth, videoHeight }) => videoWidth > 0 && videoHeight > 0 && videoWidth >= videoHeight,
          message: () => "Instagram Reels must be vertical (9:16 aspect ratio)."
        }
      ],
      story: [
        {
          check: ({ isVideo, videoDuration }) => isVideo && videoDuration > 15,
          message: ({ videoDuration }) => `Instagram Story videos should be 15 seconds or less. (Current: ${videoDuration.toFixed(1)}s)`
        },
        {
          check: ({ isVideo, videoWidth, videoHeight }) => isVideo && videoWidth > 0 && videoHeight > 0 && videoWidth >= videoHeight,
          message: () => "Instagram Story videos should be vertical (9:16 aspect ratio)."
        }
      ],
      post: []
    }
  },
  [PLATFORMS.YOUTUBE]: {
    id: PLATFORMS.YOUTUBE,
    name: 'YouTube',
    defaultType: 'video',
    supportedTypes: [
      { id: 'video', label: 'Video' },
      { id: 'short', label: 'Short' }
    ],
    getPostType: (subType) => {
      return subType === 'short' ? POST_TYPE.SHORT : POST_TYPE.VIDEO;
    },
    validationRules: {
      _always: [
        {
          check: ({ hasMedia }) => !hasMedia,
          message: () => "YouTube -> Add at least 1 video."
        },
        {
          check: ({ hasMedia, isVideo }) => hasMedia && !isVideo,
          message: () => "YouTube publication must be a video file."
        }
      ],
      short: [
        {
          check: ({ videoDuration }) => videoDuration > 60,
          message: ({ videoDuration }) => `YouTube Shorts must be 60 seconds or less. (Current: ${videoDuration.toFixed(1)}s)`
        },
        {
          check: ({ videoWidth, videoHeight }) => videoWidth > 0 && videoHeight > 0 && videoWidth > videoHeight,
          message: () => "YouTube Shorts must be vertical or square. Current ratio is horizontal."
        }
      ]
    }
  },
  [PLATFORMS.TIKTOK]: {
    id: PLATFORMS.TIKTOK,
    name: 'TikTok',
    defaultType: 'video',
    supportedTypes: [
      { id: 'video', label: 'Video' }
    ],
    getPostType: () => {
      return POST_TYPE.VIDEO;
    },
    validationRules: {
      _always: [
        {
          check: ({ hasMedia }) => !hasMedia,
          message: () => "TikTok -> Add at least 1 image or video."
        }
      ]
    }
  },
  [PLATFORMS.TELEGRAM]: {
    id: PLATFORMS.TELEGRAM,
    name: 'Telegram',
    defaultType: 'post',
    supportedTypes: [
      { id: 'post', label: 'Channel Post' }
    ],
    getPostType: (subType, hasMedia, isVideo) => {
      return (hasMedia && isVideo) ? POST_TYPE.VIDEO : POST_TYPE.IMAGE;
    },
    validationRules: {
      _always: [
        {
          check: ({ caption, hasMedia }) => {
            const limit = hasMedia ? 1024 : 4096;
            return caption && caption.length > limit;
          },
          message: ({ caption, hasMedia }) => {
            const limit = hasMedia ? 1024 : 4096;
            return `Telegram post caption with ${hasMedia ? 'media' : 'text only'} must be ${limit} characters or less. (Current: ${caption ? caption.length : 0})`;
          }
        }
      ]
    }
  },
  [PLATFORMS.THREADS]: {
    id: PLATFORMS.THREADS,
    name: 'Threads',
    defaultType: 'post',
    limits: {
      text: { maxLength: 500 }
    },
    supportedTypes: [
      { id: 'post', label: 'Threads Post' }
    ],
    getPostType: (subType, hasMedia, isVideo) => {
      return (hasMedia && isVideo) ? POST_TYPE.VIDEO : POST_TYPE.IMAGE;
    },
    validationRules: {
      _always: [
        {
          check: ({ caption }) => caption && caption.length > 500,
          message: ({ caption }) => `Bài đăng Threads phải có độ dài dưới 500 ký tự. (Hiện tại: ${caption ? caption.length : 0})`
        }
      ]
    }
  },
  [PLATFORMS.BLUESKY]: {
    id: PLATFORMS.BLUESKY,
    name: 'Bluesky',
    defaultType: 'post',
    supportedTypes: [
      { id: 'post', label: 'Post' }
    ],
    getPostType: (subType, hasMedia, isVideo) => {
      return (hasMedia && isVideo) ? POST_TYPE.VIDEO : POST_TYPE.IMAGE;
    },
    validationRules: {
      _always: [
        {
          check: ({ caption }) => {
            if (!caption) return false;
            const count = graphemeSegmenter ? [...graphemeSegmenter.segment(caption)].length : Array.from(caption).length;
            return count > 300;
          },
          message: ({ caption }) => {
            const count = caption ? (graphemeSegmenter ? [...graphemeSegmenter.segment(caption)].length : Array.from(caption).length) : 0;
            return `Bluesky post exceeds 300 graphemes. (Current: ${count})`;
          }
        },
        {
          check: ({ mediaCount }) => mediaCount > 4,
          message: ({ mediaCount }) => `Bluesky posts allow a maximum of 4 images. (Current: ${mediaCount})`
        }
      ]
    }
  },
  [PLATFORMS.REDDIT]: {
    id: PLATFORMS.REDDIT,
    name: 'Reddit',
    defaultType: 'post',
    supportedTypes: [
      { id: 'post', label: 'Subreddit Post' }
    ],
    getPostType: (subType, hasMedia, isVideo) => {
      return (hasMedia && isVideo) ? POST_TYPE.VIDEO : POST_TYPE.IMAGE;
    },
    validationRules: {
      _always: [
        {
          check: ({ title, caption }) => !title && !caption,
          message: () => "Reddit post requires a title (max 300 characters)."
        },
        {
          check: ({ title }) => title && title.length > 300,
          message: ({ title }) => `Reddit post title cannot exceed 300 characters. (Current: ${title ? title.length : 0})`
        },
        {
          check: ({ caption }) => caption && caption.length > 40000,
          message: ({ caption }) => `Reddit body text cannot exceed 40,000 characters. (Current: ${caption ? caption.length : 0})`
        }
      ]
    }
  },
  [PLATFORMS.TWITCH]: {
    id: PLATFORMS.TWITCH,
    name: 'Twitch',
    defaultType: 'live',
    supportedTypes: [
      { id: 'live', label: 'Livestream Chat' }
    ],
    getPostType: () => POST_TYPE.VIDEO,
    validationRules: {
      _always: [
        {
          check: ({ hasMedia }) => !!hasMedia,
          message: () => "Twitch does not support media attachments for scheduled posts. Use Livestream Chat or Stream Title instead."
        },
        {
          check: ({ title }) => title && title.length > 140,
          message: ({ title }) => `Stream title must be 140 characters or less. (Current: ${title ? title.length : 0})`
        },
        {
          check: ({ caption }) => caption && caption.length > 500,
          message: ({ caption }) => `Chat message must be 500 characters or less. (Current: ${caption ? caption.length : 0})`
        }
      ]
    }
  }
};
