/**
 * Frontend Platform Capabilities Specification
 * Single Source of Truth chứa cấu hình mặc định (configurable), quy tắc cố định (fixed)
 * và Strategy Hooks (stateKeys, subTypeField, hydrate, validateCustom, buildOverride).
 */

const formatOverrideMediaUrls = (mediaUrls) => {
  return (mediaUrls || [])
    .map((item) => (typeof item === 'string' ? item : (item?.path || item?.url || item?.previewUrl)))
    .filter((url) => typeof url === 'string' && url.trim() !== '' && !url.startsWith('blob:'));
};

export const PLATFORM_SPECS = {
  // ═══════════════ FACEBOOK ═══════════════
  FACEBOOK_POST: {
    platform: 'FACEBOOK_POST',
    maxCaptionLength: 63206,
    maxFileSizeMb: 100,
    allowedFormats: 'mp4,mov,png,jpg,jpeg',
    allowedMediaTypes: 'ALL',
    requiredFields: [],
    requireCaptionOrMedia: true,
    albumMinMedia: 2,
    lockOnPublishedEdit: true,

    stateKeys: { type: 'facebookType' },
    subTypeField: 'facebookType',
    hydrate: (opts) => ({ type: opts.facebookType || 'post' }),
    validateCustom: (ctx) => {
      const errors = [];
      if (ctx.mediaCount === 1 && ctx.mediaItems?.[0] && !ctx.isVideo) {
        // Facebook post single image is valid
      } else if (ctx.mediaCount > 1 && ctx.mediaCount < 2) {
        errors.push('Facebook Album -> Add at least 2 images.');
      }
      return errors;
    },
    buildOverride: (entry, rawMediaUrls) => {
      const mediaCaptions = Array.isArray(entry.mediaUrls)
        ? entry.mediaUrls.map((item) => (typeof item === 'object' ? item?.caption || '' : ''))
        : undefined;
      const hasMediaCaptions = mediaCaptions && mediaCaptions.some((c) => Boolean(c));

      return {
        caption: entry.useTemplate ? undefined : (entry.caption || ''),
        mediaUrls: entry.useTemplate ? undefined : rawMediaUrls,
        ...(entry.settings && Object.keys(entry.settings).length > 0 || hasMediaCaptions
          ? {
              settings: {
                ...(entry.settings && typeof entry.settings === 'object' ? entry.settings : {}),
                ...(hasMediaCaptions ? { mediaCaptions } : {})
              }
            }
          : {})
      };
    }
  },

  FACEBOOK_REEL: {
    platform: 'FACEBOOK_REEL',
    maxCaptionLength: 63206,
    maxVideoDuration: 90,
    minVideoDuration: 3,
    minWidth: 540,
    minHeight: 960,
    minFrameRate: 24,
    maxFrameRate: 60,
    allowedMediaTypes: 'VIDEO',
    requiredFields: ['video'],
    orientation: 'VERTICAL',
    allowedAspectRatio: '9:16',
    thumbnailMaxSizeBytes: 10 * 1024 * 1024,
    thumbnailUrlPattern: '^https?://',
    collaboratorIdPattern: '^\\d+$',
    placeIdPattern: '^\\d+$',
    maxReelsPer24h: 30,
    maxCollaboratorInvitesPer24h: 10,
    lockOnPublishedEdit: true,

    stateKeys: {
      type: 'facebookType',
      title: 'facebookTitle',
      reelThumbnail: 'facebookReelThumbnail'
    },
    subTypeField: 'facebookType',
    hydrate: (opts) => ({
      type: opts.facebookType || 'reel',
      title: opts.facebookTitle || '',
      reelThumbnail: opts.facebookReelThumbnail || ''
    }),
    validateCustom: (ctx) => {
      const errors = [];
      const { videoDuration, hasMedia, isVideo } = ctx;
      if (!hasMedia || !isVideo) {
        errors.push('Facebook Reels require a video file.');
      } else if (videoDuration && (videoDuration < 3 || videoDuration > 90)) {
        errors.push(`Facebook Reels duration must be between 3 and 90 seconds (Current: ${Number(videoDuration).toFixed(1)}s).`);
      }
      return errors;
    },
    buildOverride: (entry, rawMediaUrls) => ({
      caption: entry.useTemplate ? undefined : (entry.caption || ''),
      mediaUrls: entry.useTemplate ? undefined : rawMediaUrls,
      options: { facebookReelThumbnail: entry.reelThumbnail },
      ...(entry.settings && Object.keys(entry.settings).length > 0 ? { settings: entry.settings } : {})
    })
  },

  FACEBOOK_STORY: {
    platform: 'FACEBOOK_STORY',
    maxVideoDuration: 60,
    minVideoDuration: 1,
    minWidth: 540,
    minHeight: 960,
    minFrameRate: 24,
    maxFrameRate: 60,
    allowedMediaTypes: 'ALL',
    requiredFields: ['media'],
    orientation: 'VERTICAL',
    lockOnPublishedEdit: true,

    stateKeys: { type: 'facebookType' },
    subTypeField: 'facebookType',
    hydrate: (opts) => ({ type: opts.facebookType || 'story' }),
    validateCustom: (ctx) => {
      const errors = [];
      const { hasMedia, isVideo, videoDuration } = ctx;
      if (!hasMedia) {
        errors.push('Facebook Stories require a photo or video file.');
      }
      if (isVideo && videoDuration > 60) {
        errors.push(`Facebook Story videos should be 60 seconds or less. (Current: ${Number(videoDuration).toFixed(1)}s)`);
      }
      return errors;
    },
    buildOverride: (entry, rawMediaUrls) => ({
      caption: entry.useTemplate ? undefined : (entry.caption || ''),
      mediaUrls: entry.useTemplate ? undefined : rawMediaUrls
    })
  },

  // ═══════════════ INSTAGRAM ═══════════════
  INSTAGRAM_POST: {
    platform: 'INSTAGRAM_POST',
    maxCaptionLength: 2200,
    maxFileSizeMb: 100,
    allowedMediaTypes: 'ALL',
    requiredFields: ['media'],
    maxCarouselItems: 10,

    stateKeys: {
      type: 'instagramType',
      collaborators: 'instagramCollaborators',
      audio: 'instagramAudio',
      showOnFeed: 'instagramShowOnFeed'
    },
    subTypeField: 'instagramType',
    hydrate: (opts) => ({
      type: opts.instagramType || 'post',
      collaborators: opts.instagramCollaborators || [],
      audio: opts.instagramAudio || null,
      showOnFeed: opts.instagramShowOnFeed !== undefined ? opts.instagramShowOnFeed : true
    }),
    validateCustom: (ctx) => {
      const errors = [];
      if (!ctx.hasMedia) {
        errors.push('Instagram requires at least one photo or video to publish a post.');
      } else if (ctx.mediaCount > 10) {
        errors.push(`Instagram carousel posts support a maximum of 10 images/videos. (Current: ${ctx.mediaCount})`);
      }
      return errors;
    },
    buildOverride: (entry, rawMediaUrls) => ({
      caption: entry.useTemplate ? undefined : (entry.caption || ''),
      mediaUrls: entry.useTemplate ? undefined : rawMediaUrls,
      ...(entry.settings && Object.keys(entry.settings).length > 0 ? { settings: entry.settings } : {})
    })
  },

  INSTAGRAM_REEL: {
    platform: 'INSTAGRAM_REEL',
    maxCaptionLength: 2200,
    maxVideoDuration: 900,
    minVideoDuration: 3,
    allowedMediaTypes: 'VIDEO',
    requiredFields: ['media'],
    orientation: 'VERTICAL',
    maxCarouselItems: 10,

    stateKeys: {
      type: 'instagramType',
      collaborators: 'instagramCollaborators',
      audio: 'instagramAudio',
      showOnFeed: 'instagramShowOnFeed'
    },
    subTypeField: 'instagramType',
    hydrate: (opts) => ({
      type: opts.instagramType || 'reel',
      collaborators: opts.instagramCollaborators || [],
      audio: opts.instagramAudio || null,
      showOnFeed: opts.instagramShowOnFeed !== undefined ? opts.instagramShowOnFeed : true
    }),
    validateCustom: (ctx) => {
      const errors = [];
      const { hasMedia, isVideo, videoDuration } = ctx;
      if (!hasMedia || !isVideo) {
        errors.push('Instagram Reel must be a video.');
      } else if (videoDuration && (videoDuration < 3 || videoDuration > 900)) {
        errors.push(`Instagram Reels must be between 3 seconds and 15 minutes. (Current: ${Number(videoDuration).toFixed(1)}s)`);
      }
      return errors;
    },
    buildOverride: (entry, rawMediaUrls) => ({
      caption: entry.useTemplate ? undefined : (entry.caption || ''),
      mediaUrls: entry.useTemplate ? undefined : rawMediaUrls,
      ...(entry.settings && Object.keys(entry.settings).length > 0 ? { settings: entry.settings } : {})
    })
  },

  INSTAGRAM_STORY: {
    platform: 'INSTAGRAM_STORY',
    maxVideoDuration: 15,
    allowedMediaTypes: 'ALL',
    requiredFields: ['media'],
    orientation: 'VERTICAL',

    stateKeys: { type: 'instagramType' },
    subTypeField: 'instagramType',
    hydrate: (opts) => ({ type: opts.instagramType || 'story' }),
    validateCustom: (ctx) => {
      const errors = [];
      const { hasMedia, isVideo, videoDuration } = ctx;
      if (!hasMedia) {
        errors.push('Instagram requires at least one photo or video to publish a post.');
      }
      if (isVideo && videoDuration > 15) {
        errors.push(`Instagram Story videos should be 15 seconds or less. (Current: ${Number(videoDuration).toFixed(1)}s)`);
      }
      return errors;
    },
    buildOverride: (entry, rawMediaUrls) => ({
      caption: entry.useTemplate ? undefined : (entry.caption || ''),
      mediaUrls: entry.useTemplate ? undefined : rawMediaUrls
    })
  },

  // ═══════════════ YOUTUBE ═══════════════
  YOUTUBE_VIDEO: {
    platform: 'YOUTUBE_VIDEO',
    maxCaptionLength: 5000,
    maxFileSizeMb: 262144,
    allowedMediaTypes: 'VIDEO',
    requiredFields: ['video', 'title'],
    maxTitleLength: 100,
    titleForbiddenChars: '<>',
    requiresAudienceSelection: true,
    thumbnailMaxSizeBytes: 2 * 1024 * 1024,
    thumbnailAllowedMimeTypes: ['image/jpeg', 'image/png', 'application/octet-stream'],
    videoMimeTypes: ['video/*', 'application/octet-stream'],
    tagsMaxTotalLength: 500,

    stateKeys: {
      type: 'youtubeType',
      title: 'youtubeTitle',
      madeForKids: 'youtubeMadeForKids',
      privacy: 'youtubePrivacy',
      categoryId: 'youtubeCategory',
      playlistId: 'youtubePlaylistId',
      tags: 'youtubeTags',
      firstComment: 'youtubeFirstComment',
      thumbnail: 'youtubeThumbnail'
    },
    subTypeField: 'youtubeType',
    hydrate: (opts) => ({
      type: opts.youtubeType || 'video',
      title: opts.youtubeTitle || '',
      madeForKids: typeof opts.madeForKids === 'boolean' ? opts.madeForKids : null,
      privacy: opts.privacyStatus || 'public',
      categoryId: opts.categoryId || '22',
      playlistId: opts.playlistId || '',
      tags: opts.tags || '',
      firstComment: opts.firstComment || '',
      thumbnail: opts.youtubeThumbnail || ''
    }),
    validateCustom: (ctx) => {
      const errors = [];
      const { hasMedia, isVideo, youtubeTitle, youtubeMadeForKids } = ctx;
      if (!hasMedia || !isVideo) {
        errors.push('YouTube uploads require a video file.');
      }
      if (!youtubeTitle || !youtubeTitle.trim() || youtubeTitle.length > 100 || /[<>]/.test(youtubeTitle)) {
        errors.push('Video or short title is required and must be shorter than 100 characters. The characters < or > are not allowed.');
      }
      if (typeof youtubeMadeForKids !== 'boolean') {
        errors.push('It is necessary to select the audience of the video.');
      }
      return errors;
    },
    buildOverride: (entry, rawMediaUrls) => ({
      caption: entry.useTemplate ? undefined : (entry.caption || ''),
      mediaUrls: entry.useTemplate ? undefined : rawMediaUrls,
      ...(entry.settings && Object.keys(entry.settings).length > 0 ? { settings: entry.settings } : {})
    })
  },

  YOUTUBE_SHORT: {
    platform: 'YOUTUBE_SHORT',
    maxCaptionLength: 5000,
    maxVideoDuration: 180,
    allowedMediaTypes: 'VIDEO',
    requiredFields: ['video', 'title'],
    maxTitleLength: 100,
    titleForbiddenChars: '<>',
    requiresAudienceSelection: true,
    orientation: 'VERTICAL',
    thumbnailMaxSizeBytes: 2 * 1024 * 1024,
    thumbnailAllowedMimeTypes: ['image/jpeg', 'image/png', 'application/octet-stream'],

    stateKeys: {
      type: 'youtubeType',
      title: 'youtubeTitle',
      madeForKids: 'youtubeMadeForKids',
      privacy: 'youtubePrivacy',
      categoryId: 'youtubeCategory',
      playlistId: 'youtubePlaylistId',
      tags: 'youtubeTags',
      firstComment: 'youtubeFirstComment',
      thumbnail: 'youtubeThumbnail'
    },
    subTypeField: 'youtubeType',
    hydrate: (opts) => ({
      type: opts.youtubeType || 'short',
      title: opts.youtubeTitle || '',
      madeForKids: typeof opts.madeForKids === 'boolean' ? opts.madeForKids : null,
      privacy: opts.privacyStatus || 'public',
      categoryId: opts.categoryId || '22',
      playlistId: opts.playlistId || '',
      tags: opts.tags || '',
      firstComment: opts.firstComment || '',
      thumbnail: opts.youtubeThumbnail || ''
    }),
    validateCustom: (ctx) => {
      const errors = [];
      const { hasMedia, isVideo, youtubeTitle, youtubeMadeForKids, videoDuration, videoWidth, videoHeight } = ctx;
      if (!hasMedia || !isVideo) {
        errors.push('YouTube uploads require a video file.');
      }
      if (!youtubeTitle || !youtubeTitle.trim() || youtubeTitle.length > 100 || /[<>]/.test(youtubeTitle)) {
        errors.push('Video or short title is required and must be shorter than 100 characters. The characters < or > are not allowed.');
      }
      if (typeof youtubeMadeForKids !== 'boolean') {
        errors.push('It is necessary to select the audience of the video.');
      }
      if (videoDuration && videoDuration > 180) {
        errors.push(`Short \u2192 Video length can't exceed 180 seconds. These videos don't meet the requirements: #1 (${Number(videoDuration).toFixed(1)}s).`);
      }
      if (videoWidth && videoHeight && videoWidth >= videoHeight) {
        errors.push('Short \u2192 Invalid video orientation, only vertical is allowed. These videos don\'t meet this requirement: #1.');
      }
      return errors;
    },
    buildOverride: (entry, rawMediaUrls) => ({
      caption: entry.useTemplate ? undefined : (entry.caption || ''),
      mediaUrls: entry.useTemplate ? undefined : rawMediaUrls,
      ...(entry.settings && Object.keys(entry.settings).length > 0 ? { settings: entry.settings } : {})
    })
  },

  // ═══════════════ TIKTOK ═══════════════
  TIKTOK_VIDEO: {
    platform: 'TIKTOK_VIDEO',
    maxCaptionLength: 2200,
    maxFileSizeMb: 100,
    allowedMediaTypes: 'VIDEO',
    requiredFields: ['video'],

    stateKeys: {
      privacy: 'tiktokPrivacy',
      allowComments: 'tiktokAllowComments',
      allowDuet: 'tiktokAllowDuet',
      allowStitch: 'tiktokAllowStitch',
      aiGenerated: 'tiktokAiGenerated',
      commercialContent: 'tiktokCommercialContent'
    },
    subTypeField: null,
    hydrate: (opts) => ({
      privacy: opts.tiktokPrivacy || 'PUBLIC_TO_EVERYONE',
      allowComments: opts.tiktokAllowComments !== undefined ? opts.tiktokAllowComments : true,
      allowDuet: opts.tiktokAllowDuet !== undefined ? opts.tiktokAllowDuet : true,
      allowStitch: opts.tiktokAllowStitch !== undefined ? opts.tiktokAllowStitch : true,
      aiGenerated: opts.tiktokAiGenerated || false,
      commercialContent: opts.tiktokCommercialContent || false
    }),
    validateCustom: (ctx) => {
      const errors = [];
      if (!ctx.hasMedia || !ctx.isVideo) {
        errors.push('TikTok posts require a video file.');
      }
      return errors;
    },
    buildOverride: (entry, rawMediaUrls) => ({
      caption: entry.useTemplate ? undefined : (entry.caption || ''),
      mediaUrls: entry.useTemplate ? undefined : rawMediaUrls,
      ...(entry.settings && Object.keys(entry.settings).length > 0 ? { settings: entry.settings } : {})
    })
  },

  // ═══════════════ THREADS ═══════════════
  THREADS_POST: {
    platform: 'THREADS_POST',
    maxCaptionLength: 500,
    allowedMediaTypes: 'ALL',
    isChainBased: true,
    requireCaptionOrMediaPerItem: true,

    stateKeys: { whoCanReply: 'threadsWhoCanReply' },
    subTypeField: null,
    hydrate: (opts) => ({ whoCanReply: opts.threadsWhoCanReply || 'everyone' }),
    validateCustom: (ctx) => {
      const errors = [];
      const posts = ctx.threadPosts || [];
      const maxLen = ctx.capability?.maxCaptionLength || 500;

      if (posts.length === 0) {
        const text = ctx.caption || '';
        const hasMedia = ctx.hasMedia;
        if (text && text.length > maxLen) {
          errors.push(`Bài đăng Threads phải có độ dài dưới ${maxLen} ký tự. (Hiện tại: ${text.length})`);
        }
        if (!text.trim() && !hasMedia) {
          errors.push('Bài đăng Threads cần có nội dung văn bản hoặc hình ảnh/video.');
        }
        return errors;
      }

      posts.forEach((post, i) => {
        const text = typeof post === 'string' ? post : (post?.text || '');
        const media = typeof post === 'string' ? [] : (post?.mediaUrls || post?.mediaItems || []);
        if (text && text.length > maxLen) {
          errors.push(`Bài đăng Threads (Post ${i + 1}) phải có độ dài dưới ${maxLen} ký tự. (Hiện tại: ${text.length})`);
        }
        const hasText = Boolean(text && text.trim()) || (i === 0 && Boolean(ctx.caption && ctx.caption.trim()));
        const hasMedia = media.length > 0 || (i === 0 && ctx.hasMedia);

        if (!hasText && !hasMedia) {
          errors.push(`Post ${i + 1} trong chuỗi đang trống.`);
        }
      });
      return errors;
    },
    buildOverride: (entry) => {
      const validPosts = (entry.threadPosts || []).filter((p) => {
        const txt = typeof p === 'string' ? p : p?.text;
        const media = typeof p === 'string' ? [] : (p?.mediaUrls || []);
        return (txt && txt.trim()) || media.length > 0;
      });
      if (validPosts.length === 0) return null;
      const firstPostText = typeof validPosts[0] === 'string' ? validPosts[0] : (validPosts[0].text || '');
      const firstPostMedia = typeof validPosts[0] === 'string' ? [] : (validPosts[0].mediaUrls || []);

      return {
        caption: firstPostText,
        mediaUrls: formatOverrideMediaUrls(firstPostMedia),
        threadPosts: validPosts.map((p) => ({
          text: typeof p === 'string' ? p : (p.text || ''),
          mediaUrls: formatOverrideMediaUrls(typeof p === 'string' ? [] : p.mediaUrls)
        }))
      };
    }
  },

  // ═══════════════ BLUESKY ═══════════════
  BLUESKY_POST: {
    platform: 'BLUESKY_POST',
    maxCaptionLength: 300,
    allowedMediaTypes: 'ALL',
    captionCountMethod: 'grapheme',
    requireCaptionOrMedia: true,
    maxMediaItems: 4,

    stateKeys: {},
    subTypeField: null,
    hydrate: () => ({}),
    validateCustom: (ctx) => {
      const errors = [];
      const { caption, graphemeSegmenter, mediaCount } = ctx;
      if (caption) {
        const count = graphemeSegmenter ? [...graphemeSegmenter.segment(caption)].length : Array.from(caption).length;
        if (count > 300) {
          errors.push(`Bluesky post exceeds 300 graphemes. (Current: ${count})`);
        }
      }
      if (mediaCount > 4) {
        errors.push(`Bluesky posts allow a maximum of 4 images. (Current: ${mediaCount})`);
      }
      return errors;
    },
    buildOverride: (entry, rawMediaUrls) => ({
      caption: entry.useTemplate ? undefined : (entry.caption || ''),
      mediaUrls: entry.useTemplate ? undefined : rawMediaUrls
    })
  },

  // ═══════════════ REDDIT ═══════════════
  REDDIT_POST: {
    platform: 'REDDIT_POST',
    maxCaptionLength: 40000,
    allowedMediaTypes: 'ALL',
    requireTitleOrCaption: true,
    maxTitleLength: 300,

    stateKeys: {},
    subTypeField: null,
    hydrate: () => ({}),
    validateCustom: (ctx) => {
      const errors = [];
      const { title, caption } = ctx;
      if (!title && !caption) {
        errors.push('Reddit post requires a title (max 300 characters).');
      }
      if (title && title.length > 300) {
        errors.push(`Reddit post title cannot exceed 300 characters. (Current: ${title.length})`);
      }
      if (caption && caption.length > 40000) {
        errors.push(`Reddit body text cannot exceed 40,000 characters. (Current: ${caption.length})`);
      }
      return errors;
    },
    buildOverride: (entry, rawMediaUrls) => ({
      caption: entry.useTemplate ? undefined : (entry.caption || ''),
      mediaUrls: entry.useTemplate ? undefined : rawMediaUrls
    })
  },

  // ═══════════════ TWITCH ═══════════════
  TWITCH_POST: {
    platform: 'TWITCH_POST',
    maxCaptionLength: 500,
    allowedMediaTypes: 'NONE',
    maxStreamTitleLength: 140,

    stateKeys: {},
    subTypeField: null,
    hydrate: () => ({}),
    validateCustom: (ctx) => {
      const errors = [];
      if (ctx.hasMedia) {
        errors.push('Twitch does not support media attachments for scheduled posts.');
      }
      return errors;
    },
    buildOverride: (entry) => ({
      caption: entry.useTemplate ? undefined : (entry.caption || '')
    })
  }
};
