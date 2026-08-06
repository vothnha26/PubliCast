import { PLATFORMS } from './platforms';
import { POST_TYPE } from './postTypes';
import { VALIDATION_RULES } from './platformValidation.constants';

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
      { id: 'reel', label: 'Reel' },
      { id: 'story', label: 'Story' }
    ],
    // Album is no longer a selectable post type — ≥2 photos (no video mixed
    // in) auto-routes to Facebook's album/carousel strategy server-side
    // (facebook-post.service.js) based on how many photos are actually
    // selected, not a manual toggle here.
    getPostType: (subType, hasMedia, isVideo) => {
      if (subType === 'story') return POST_TYPE.STORY;
      if (subType === 'reel') return POST_TYPE.REEL;
      return (hasMedia && isVideo) ? POST_TYPE.VIDEO : POST_TYPE.IMAGE;
    },
    validationRules: {
      reel: [
        VALIDATION_RULES.FACEBOOK.REEL_MEDIA_REQUIRED,
        VALIDATION_RULES.FACEBOOK.REEL_MUST_BE_VIDEO,
        VALIDATION_RULES.FACEBOOK.REEL_DURATION_RANGE,
        VALIDATION_RULES.FACEBOOK.REEL_MUST_BE_VERTICAL
      ],
      story: [
        VALIDATION_RULES.FACEBOOK.STORY_MEDIA_REQUIRED,
        VALIDATION_RULES.FACEBOOK.STORY_MAX_DURATION,
        VALIDATION_RULES.FACEBOOK.STORY_MUST_BE_VERTICAL
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
        VALIDATION_RULES.INSTAGRAM.MEDIA_REQUIRED
      ],
      reel: [
        VALIDATION_RULES.INSTAGRAM.REEL_MUST_BE_VIDEO,
        VALIDATION_RULES.INSTAGRAM.REEL_DURATION_RANGE,
        VALIDATION_RULES.INSTAGRAM.REEL_MUST_BE_VERTICAL
      ],
      story: [
        VALIDATION_RULES.INSTAGRAM.STORY_MAX_DURATION,
        VALIDATION_RULES.INSTAGRAM.STORY_MUST_BE_VERTICAL
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
        VALIDATION_RULES.YOUTUBE.MEDIA_REQUIRED,
        VALIDATION_RULES.YOUTUBE.MUST_BE_VIDEO,
        VALIDATION_RULES.YOUTUBE.TITLE_REQUIRED_AND_INVALID,
        VALIDATION_RULES.YOUTUBE.AUDIENCE_REQUIRED
      ],
      short: [
        VALIDATION_RULES.YOUTUBE.SHORT_DURATION_EXCEEDED,
        VALIDATION_RULES.YOUTUBE.SHORT_INVALID_ORIENTATION
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
        VALIDATION_RULES.TIKTOK.MEDIA_REQUIRED
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
        VALIDATION_RULES.TELEGRAM.CAPTION_MAX_LIMIT
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
        VALIDATION_RULES.THREADS.CAPTION_MAX_LIMIT
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
          check: ({ caption }) => VALIDATION_RULES.BLUESKY.GRAPHEME_LIMIT_EXCEEDED.check({ caption, graphemeSegmenter }),
          message: ({ caption }) => VALIDATION_RULES.BLUESKY.GRAPHEME_LIMIT_EXCEEDED.message({ caption, graphemeSegmenter })
        },
        VALIDATION_RULES.BLUESKY.MEDIA_LIMIT_EXCEEDED
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
        VALIDATION_RULES.REDDIT.TITLE_OR_CAPTION_REQUIRED,
        VALIDATION_RULES.REDDIT.TITLE_MAX_LIMIT,
        VALIDATION_RULES.REDDIT.BODY_MAX_LIMIT
      ]
    }
  },
  [PLATFORMS.TWITCH]: {
    id: PLATFORMS.TWITCH,
    name: 'Twitch',
    defaultType: 'post',
    supportedTypes: [
      { id: 'post', label: 'Broadcast' }
    ],
    getPostType: () => POST_TYPE.VIDEO,
    validationRules: {
      _always: [
        VALIDATION_RULES.TWITCH.NO_MEDIA_SUPPORT,
        VALIDATION_RULES.TWITCH.STREAM_TITLE_MAX_LIMIT,
        VALIDATION_RULES.TWITCH.CHAT_MAX_LIMIT
      ]
    }
  }
};
