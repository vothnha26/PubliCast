/**
 * Platform Validation Constants & Message Templates
 * Centralized registry of validation error messages and limits across all supported social networks.
 * Eliminates all magic strings and hardcoded literals.
 */

// Facebook Reel/Story duration+resolution+frameRate limits are meant to
// match the backend's copy (backend/src/config/facebook-reel.constants.js,
// which reads the canonical PubliCast/shared/facebook-limits.json) so the
// two validators can't drift apart — this is what caused the Story
// max-duration bug (frontend hardcoded 15s, the real Meta limit is 60s,
// backend already had it right). This is a local copy, not an import of the
// monorepo-root shared/ file: the frontend now builds as a standalone repo
// (publicast-frontend) with no access to files outside this directory. Keep
// both copies in sync by hand when Meta's limits change.
import facebookLimits from './facebook-limits.json';

export const PLATFORM_LIMIT_THRESHOLDS = {
  FACEBOOK: {
    ALBUM_MIN_MEDIA: 2,
    REEL_MIN_DURATION: facebookLimits.REEL.MIN_DURATION_SECONDS,
    REEL_MAX_DURATION: facebookLimits.REEL.MAX_DURATION_SECONDS,
    STORY_MAX_DURATION: facebookLimits.STORY.MAX_DURATION_SECONDS
  },
  INSTAGRAM: {
    REEL_MIN_DURATION: 3,
    REEL_MAX_DURATION: 900,
    STORY_MAX_DURATION: 15,
    // Meta's Content Publishing docs: "Carousels are limited to 10 images,
    // videos, or a mix of the two."
    CAROUSEL_MAX_MEDIA: 10
  },
  YOUTUBE: {
    TITLE_MAX_LENGTH: 100,
    SHORT_MAX_DURATION: 180
  },
  TELEGRAM: {
    MEDIA_CAPTION_MAX_LENGTH: 1024,
    TEXT_CAPTION_MAX_LENGTH: 4096
  },
  THREADS: {
    POST_MAX_LENGTH: 500
  },
  BLUESKY: {
    MAX_GRAPHEMES: 300,
    MAX_IMAGES: 4
  },
  REDDIT: {
    TITLE_MAX_LENGTH: 300,
    BODY_MAX_LENGTH: 40000
  },
  TWITCH: {
    STREAM_TITLE_MAX_LENGTH: 140,
    CHAT_MAX_LENGTH: 500
  }
};

/**
 * Validation Predicate Helpers
 * Standardized reusable helper predicates to eliminate repeated raw boolean checks.
 */
export const isVideoMetadataAvailable = (videoDuration) => typeof videoDuration === 'number' && videoDuration > 0;
export const isVideoDimensionsValid = (videoWidth, videoHeight) => Boolean(videoWidth > 0 && videoHeight > 0);
export const isHorizontalOrSquareVideo = (videoWidth, videoHeight) => isVideoDimensionsValid(videoWidth, videoHeight) && videoWidth >= videoHeight;

export const PLATFORM_VALIDATION_MESSAGES = {
  FACEBOOK: {
    ALBUM_MIN_MEDIA: `Facebook Album -> Add at least ${PLATFORM_LIMIT_THRESHOLDS.FACEBOOK.ALBUM_MIN_MEDIA} images.`,
    REEL_MEDIA_REQUIRED: "Reel -> Add at least 1 video.",
    REEL_MUST_BE_VIDEO: "Facebook Reel must be a video file.",
    REEL_DURATION_RANGE: (duration) => `Facebook Reels must be between ${PLATFORM_LIMIT_THRESHOLDS.FACEBOOK.REEL_MIN_DURATION} and ${PLATFORM_LIMIT_THRESHOLDS.FACEBOOK.REEL_MAX_DURATION} seconds. (Current: ${Number(duration).toFixed(1)}s)`,
    REEL_MUST_BE_VERTICAL: "Facebook Reels must be vertical (9:16 aspect ratio). Current ratio is horizontal or square.",
    STORY_MEDIA_REQUIRED: "Auto publish (story) -> Add at least 1 image or video.",
    STORY_MAX_DURATION: (duration) => `Facebook Story videos should be ${PLATFORM_LIMIT_THRESHOLDS.FACEBOOK.STORY_MAX_DURATION} seconds or less. (Current: ${Number(duration).toFixed(1)}s)`,
    STORY_MUST_BE_VERTICAL: "Facebook Story videos should be vertical (9:16 aspect ratio)."
  },

  INSTAGRAM: {
    MEDIA_REQUIRED: "Instagram requires at least one photo or video to publish a post.",
    REEL_MUST_BE_VIDEO: "Instagram Reel must be a video.",
    REEL_DURATION_RANGE: (duration) => `Instagram Reels must be between ${PLATFORM_LIMIT_THRESHOLDS.INSTAGRAM.REEL_MIN_DURATION} seconds and 15 minutes. (Current: ${Number(duration).toFixed(1)}s)`,
    REEL_MUST_BE_VERTICAL: "Instagram Reels must be vertical (9:16 aspect ratio).",
    STORY_MAX_DURATION: (duration) => `Instagram Story videos should be ${PLATFORM_LIMIT_THRESHOLDS.INSTAGRAM.STORY_MAX_DURATION} seconds or less. (Current: ${Number(duration).toFixed(1)}s)`,
    STORY_MUST_BE_VERTICAL: "Instagram Story videos should be vertical (9:16 aspect ratio).",
    CAROUSEL_MAX_MEDIA: (count) => `Instagram carousel posts support a maximum of ${PLATFORM_LIMIT_THRESHOLDS.INSTAGRAM.CAROUSEL_MAX_MEDIA} images/videos. (Current: ${count})`
  },

  YOUTUBE: {
    MEDIA_REQUIRED: "YouTube -> Add at least 1 video.",
    MUST_BE_VIDEO: "YouTube publication must be a video file.",
    TITLE_REQUIRED_AND_INVALID: `Video or short title is required and must be shorter than ${PLATFORM_LIMIT_THRESHOLDS.YOUTUBE.TITLE_MAX_LENGTH} characters. The characters < or > are not allowed.`,
    AUDIENCE_REQUIRED: "It is necessary to select the audience of the video.",
    SHORT_DURATION_EXCEEDED: (duration) => `Short \u2192 Video length can't exceed ${PLATFORM_LIMIT_THRESHOLDS.YOUTUBE.SHORT_MAX_DURATION} seconds. These videos don't meet the requirements: #1 (${Number(duration).toFixed(1)}s).`,
    SHORT_INVALID_ORIENTATION: "Short \u2192 Invalid video orientation, only vertical is allowed. These videos don't meet this requirement: #1."
  },

  TIKTOK: {
    MEDIA_REQUIRED: "TikTok -> Add at least 1 image or video."
  },

  TELEGRAM: {
    CAPTION_MAX_LIMIT: (hasMedia, count) => {
      const limit = hasMedia ? PLATFORM_LIMIT_THRESHOLDS.TELEGRAM.MEDIA_CAPTION_MAX_LENGTH : PLATFORM_LIMIT_THRESHOLDS.TELEGRAM.TEXT_CAPTION_MAX_LENGTH;
      return `Telegram post caption with ${hasMedia ? 'media' : 'text only'} must be ${limit} characters or less. (Current: ${count})`;
    }
  },

  THREADS: {
    CAPTION_MAX_LIMIT: (count) => `Bài đăng Threads phải có độ dài dưới ${PLATFORM_LIMIT_THRESHOLDS.THREADS.POST_MAX_LENGTH} ký tự. (Hiện tại: ${count})`
  },

  BLUESKY: {
    GRAPHEME_LIMIT_EXCEEDED: (count) => `Bluesky post exceeds ${PLATFORM_LIMIT_THRESHOLDS.BLUESKY.MAX_GRAPHEMES} graphemes. (Current: ${count})`,
    MEDIA_LIMIT_EXCEEDED: (count) => `Bluesky posts allow a maximum of ${PLATFORM_LIMIT_THRESHOLDS.BLUESKY.MAX_IMAGES} images. (Current: ${count})`
  },

  REDDIT: {
    TITLE_OR_CAPTION_REQUIRED: `Reddit post requires a title (max ${PLATFORM_LIMIT_THRESHOLDS.REDDIT.TITLE_MAX_LENGTH} characters).`,
    TITLE_MAX_LIMIT: (count) => `Reddit post title cannot exceed ${PLATFORM_LIMIT_THRESHOLDS.REDDIT.TITLE_MAX_LENGTH} characters. (Current: ${count})`,
    BODY_MAX_LIMIT: (count) => `Reddit body text cannot exceed ${PLATFORM_LIMIT_THRESHOLDS.REDDIT.BODY_MAX_LENGTH.toLocaleString()} characters. (Current: ${count})`
  },

  TWITCH: {
    NO_MEDIA_SUPPORT: "Twitch does not support media attachments for scheduled posts.",
    STREAM_TITLE_MAX_LIMIT: (count) => `Stream title must be ${PLATFORM_LIMIT_THRESHOLDS.TWITCH.STREAM_TITLE_MAX_LENGTH} characters or less. (Current: ${count})`,
    CHAT_MAX_LIMIT: (count) => `Chat message must be ${PLATFORM_LIMIT_THRESHOLDS.TWITCH.CHAT_MAX_LENGTH} characters or less. (Current: ${count})`
  }
};

/**
 * Pre-defined Rule Specification Registry (Rule Engine Pattern)
 * Bundles pre-packaged { check, message } objects to eliminate inline code repetition in registry files.
 */
export const VALIDATION_RULES = {
  FACEBOOK: {
    ALBUM_MIN_MEDIA: {
      check: ({ mediaCount }) => !mediaCount || mediaCount < PLATFORM_LIMIT_THRESHOLDS.FACEBOOK.ALBUM_MIN_MEDIA,
      message: () => PLATFORM_VALIDATION_MESSAGES.FACEBOOK.ALBUM_MIN_MEDIA
    },
    REEL_MEDIA_REQUIRED: {
      check: ({ hasMedia }) => !hasMedia,
      message: () => PLATFORM_VALIDATION_MESSAGES.FACEBOOK.REEL_MEDIA_REQUIRED
    },
    REEL_MUST_BE_VIDEO: {
      check: ({ hasMedia, isVideo }) => hasMedia && !isVideo,
      message: () => PLATFORM_VALIDATION_MESSAGES.FACEBOOK.REEL_MUST_BE_VIDEO
    },
    REEL_DURATION_RANGE: {
      check: ({ videoDuration }) => isVideoMetadataAvailable(videoDuration) && (videoDuration < PLATFORM_LIMIT_THRESHOLDS.FACEBOOK.REEL_MIN_DURATION || videoDuration > PLATFORM_LIMIT_THRESHOLDS.FACEBOOK.REEL_MAX_DURATION),
      message: ({ videoDuration }) => PLATFORM_VALIDATION_MESSAGES.FACEBOOK.REEL_DURATION_RANGE(videoDuration)
    },
    REEL_MUST_BE_VERTICAL: {
      check: ({ videoWidth, videoHeight }) => isHorizontalOrSquareVideo(videoWidth, videoHeight),
      message: () => PLATFORM_VALIDATION_MESSAGES.FACEBOOK.REEL_MUST_BE_VERTICAL
    },
    STORY_MEDIA_REQUIRED: {
      check: ({ hasMedia }) => !hasMedia,
      message: () => PLATFORM_VALIDATION_MESSAGES.FACEBOOK.STORY_MEDIA_REQUIRED
    },
    STORY_MAX_DURATION: {
      check: ({ isVideo, videoDuration }) => isVideo && videoDuration > PLATFORM_LIMIT_THRESHOLDS.FACEBOOK.STORY_MAX_DURATION,
      message: ({ videoDuration }) => PLATFORM_VALIDATION_MESSAGES.FACEBOOK.STORY_MAX_DURATION(videoDuration)
    },
    STORY_MUST_BE_VERTICAL: {
      check: ({ isVideo, videoWidth, videoHeight }) => isVideo && isHorizontalOrSquareVideo(videoWidth, videoHeight),
      message: () => PLATFORM_VALIDATION_MESSAGES.FACEBOOK.STORY_MUST_BE_VERTICAL
    }
  },

  INSTAGRAM: {
    MEDIA_REQUIRED: {
      check: ({ hasMedia }) => !hasMedia,
      message: () => PLATFORM_VALIDATION_MESSAGES.INSTAGRAM.MEDIA_REQUIRED
    },
    REEL_MUST_BE_VIDEO: {
      check: ({ hasMedia, isVideo }) => hasMedia && !isVideo,
      message: () => PLATFORM_VALIDATION_MESSAGES.INSTAGRAM.REEL_MUST_BE_VIDEO
    },
    REEL_DURATION_RANGE: {
      check: ({ videoDuration }) => isVideoMetadataAvailable(videoDuration) && (videoDuration < PLATFORM_LIMIT_THRESHOLDS.INSTAGRAM.REEL_MIN_DURATION || videoDuration > PLATFORM_LIMIT_THRESHOLDS.INSTAGRAM.REEL_MAX_DURATION),
      message: ({ videoDuration }) => PLATFORM_VALIDATION_MESSAGES.INSTAGRAM.REEL_DURATION_RANGE(videoDuration)
    },
    REEL_MUST_BE_VERTICAL: {
      check: ({ videoWidth, videoHeight }) => isHorizontalOrSquareVideo(videoWidth, videoHeight),
      message: () => PLATFORM_VALIDATION_MESSAGES.INSTAGRAM.REEL_MUST_BE_VERTICAL
    },
    STORY_MAX_DURATION: {
      check: ({ isVideo, videoDuration }) => isVideo && videoDuration > PLATFORM_LIMIT_THRESHOLDS.INSTAGRAM.STORY_MAX_DURATION,
      message: ({ videoDuration }) => PLATFORM_VALIDATION_MESSAGES.INSTAGRAM.STORY_MAX_DURATION(videoDuration)
    },
    CAROUSEL_MAX_MEDIA: {
      check: ({ mediaCount }) => mediaCount > PLATFORM_LIMIT_THRESHOLDS.INSTAGRAM.CAROUSEL_MAX_MEDIA,
      message: ({ mediaCount }) => PLATFORM_VALIDATION_MESSAGES.INSTAGRAM.CAROUSEL_MAX_MEDIA(mediaCount)
    },
    STORY_MUST_BE_VERTICAL: {
      check: ({ isVideo, videoWidth, videoHeight }) => isVideo && isHorizontalOrSquareVideo(videoWidth, videoHeight),
      message: () => PLATFORM_VALIDATION_MESSAGES.INSTAGRAM.STORY_MUST_BE_VERTICAL
    }
  },

  YOUTUBE: {
    MEDIA_REQUIRED: {
      check: ({ hasMedia }) => !hasMedia,
      message: () => PLATFORM_VALIDATION_MESSAGES.YOUTUBE.MEDIA_REQUIRED
    },
    MUST_BE_VIDEO: {
      check: ({ hasMedia, isVideo }) => hasMedia && !isVideo,
      message: () => PLATFORM_VALIDATION_MESSAGES.YOUTUBE.MUST_BE_VIDEO
    },
    TITLE_REQUIRED_AND_INVALID: {
      check: ({ youtubeTitle }) => {
        if (!youtubeTitle || !youtubeTitle.trim()) return true;
        return youtubeTitle.length > PLATFORM_LIMIT_THRESHOLDS.YOUTUBE.TITLE_MAX_LENGTH || /[<>]/.test(youtubeTitle);
      },
      message: () => PLATFORM_VALIDATION_MESSAGES.YOUTUBE.TITLE_REQUIRED_AND_INVALID
    },
    AUDIENCE_REQUIRED: {
      check: ({ youtubeMadeForKids }) => typeof youtubeMadeForKids !== 'boolean',
      message: () => PLATFORM_VALIDATION_MESSAGES.YOUTUBE.AUDIENCE_REQUIRED
    },
    SHORT_DURATION_EXCEEDED: {
      check: ({ videoDuration }) => videoDuration > PLATFORM_LIMIT_THRESHOLDS.YOUTUBE.SHORT_MAX_DURATION,
      message: ({ videoDuration }) => PLATFORM_VALIDATION_MESSAGES.YOUTUBE.SHORT_DURATION_EXCEEDED(videoDuration)
    },
    SHORT_INVALID_ORIENTATION: {
      check: ({ videoWidth, videoHeight }) => isHorizontalOrSquareVideo(videoWidth, videoHeight),
      message: () => PLATFORM_VALIDATION_MESSAGES.YOUTUBE.SHORT_INVALID_ORIENTATION
    }
  },

  TIKTOK: {
    MEDIA_REQUIRED: {
      check: ({ hasMedia }) => !hasMedia,
      message: () => PLATFORM_VALIDATION_MESSAGES.TIKTOK.MEDIA_REQUIRED
    }
  },

  TELEGRAM: {
    CAPTION_MAX_LIMIT: {
      check: ({ caption, hasMedia }) => {
        const limit = hasMedia ? PLATFORM_LIMIT_THRESHOLDS.TELEGRAM.MEDIA_CAPTION_MAX_LENGTH : PLATFORM_LIMIT_THRESHOLDS.TELEGRAM.TEXT_CAPTION_MAX_LENGTH;
        return caption && caption.length > limit;
      },
      message: ({ caption, hasMedia }) => PLATFORM_VALIDATION_MESSAGES.TELEGRAM.CAPTION_MAX_LIMIT(hasMedia, caption ? caption.length : 0)
    }
  },

  THREADS: {
    CAPTION_MAX_LIMIT: {
      check: ({ caption }) => caption && caption.length > PLATFORM_LIMIT_THRESHOLDS.THREADS.POST_MAX_LENGTH,
      message: ({ caption }) => PLATFORM_VALIDATION_MESSAGES.THREADS.CAPTION_MAX_LIMIT(caption ? caption.length : 0)
    }
  },

  BLUESKY: {
    GRAPHEME_LIMIT_EXCEEDED: {
      check: ({ caption, graphemeSegmenter }) => {
        if (!caption) return false;
        const count = graphemeSegmenter ? [...graphemeSegmenter.segment(caption)].length : Array.from(caption).length;
        return count > PLATFORM_LIMIT_THRESHOLDS.BLUESKY.MAX_GRAPHEMES;
      },
      message: ({ caption, graphemeSegmenter }) => {
        const count = caption ? (graphemeSegmenter ? [...graphemeSegmenter.segment(caption)].length : Array.from(caption).length) : 0;
        return PLATFORM_VALIDATION_MESSAGES.BLUESKY.GRAPHEME_LIMIT_EXCEEDED(count);
      }
    },
    MEDIA_LIMIT_EXCEEDED: {
      check: ({ mediaCount }) => mediaCount > PLATFORM_LIMIT_THRESHOLDS.BLUESKY.MAX_IMAGES,
      message: ({ mediaCount }) => PLATFORM_VALIDATION_MESSAGES.BLUESKY.MEDIA_LIMIT_EXCEEDED(mediaCount)
    }
  },

  REDDIT: {
    TITLE_OR_CAPTION_REQUIRED: {
      check: ({ title, caption }) => !title && !caption,
      message: () => PLATFORM_VALIDATION_MESSAGES.REDDIT.TITLE_OR_CAPTION_REQUIRED
    },
    TITLE_MAX_LIMIT: {
      check: ({ title }) => title && title.length > PLATFORM_LIMIT_THRESHOLDS.REDDIT.TITLE_MAX_LENGTH,
      message: ({ title }) => PLATFORM_VALIDATION_MESSAGES.REDDIT.TITLE_MAX_LIMIT(title ? title.length : 0)
    },
    BODY_MAX_LIMIT: {
      check: ({ caption }) => caption && caption.length > PLATFORM_LIMIT_THRESHOLDS.REDDIT.BODY_MAX_LENGTH,
      message: ({ caption }) => PLATFORM_VALIDATION_MESSAGES.REDDIT.BODY_MAX_LIMIT(caption ? caption.length : 0)
    }
  },

  TWITCH: {
    NO_MEDIA_SUPPORT: {
      check: ({ hasMedia }) => !!hasMedia,
      message: () => PLATFORM_VALIDATION_MESSAGES.TWITCH.NO_MEDIA_SUPPORT
    },
    STREAM_TITLE_MAX_LIMIT: {
      check: ({ title }) => title && title.length > PLATFORM_LIMIT_THRESHOLDS.TWITCH.STREAM_TITLE_MAX_LENGTH,
      message: ({ title }) => PLATFORM_VALIDATION_MESSAGES.TWITCH.STREAM_TITLE_MAX_LIMIT(title ? title.length : 0)
    },
    CHAT_MAX_LIMIT: {
      check: ({ caption }) => caption && caption.length > PLATFORM_LIMIT_THRESHOLDS.TWITCH.CHAT_MAX_LENGTH,
      message: ({ caption }) => PLATFORM_VALIDATION_MESSAGES.TWITCH.CHAT_MAX_LIMIT(caption ? caption.length : 0)
    }
  }
};
