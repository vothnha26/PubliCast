import { isVideoPath } from './url.js';
import { PLATFORMS } from '../constants/platforms.js';
import { PLATFORM_SPECS } from '../constants/platformCapability.spec.js';

/**
 * Extract file extension/format from a media item object or URL string.
 */
function getMediaFormat(mediaItem, fallbackFile, fallbackPath, fallbackUrl) {
  if (!mediaItem) {
    const fallbackName = fallbackFile ? fallbackFile.name : (fallbackPath || fallbackUrl || '');
    return fallbackName.split('.').pop().split('?')[0].toLowerCase();
  }
  if (typeof mediaItem === 'string') {
    return mediaItem.split('.').pop().split('?')[0].toLowerCase();
  }
  const name = mediaItem.file?.name || mediaItem.path || mediaItem.previewUrl || '';
  return name.split('.').pop().split('?')[0].toLowerCase();
}

/**
 * Find PLATFORM_SPECS entry for a given platform and subType.
 */
function findSpecForPlatform(platform, subType) {
  const platUpper = platform.toUpperCase();
  const subUpper = (subType || 'POST').toUpperCase();
  const key = `${platUpper}_${subUpper}`;
  if (PLATFORM_SPECS[key]) return PLATFORM_SPECS[key];

  // Fallback prefix search
  const foundKey = Object.keys(PLATFORM_SPECS).find(k => k.startsWith(`${platUpper}_`));
  return foundKey ? PLATFORM_SPECS[foundKey] : null;
}

/**
 * ─── Bước cố định #1: Global guards (không platform-specific) ───
 */
function runGlobalGuards({ isLibrary, selectedPublishId, scheduledDate, editingPost, platform, mediaItems }) {
  const errors = [];
  if (isLibrary || selectedPublishId === 'draft') {
    return { bypass: true, errors };
  }

  if (['schedule', 'review'].includes(selectedPublishId)) {
    if (scheduledDate && new Date(scheduledDate).getTime() < Date.now() - 15 * 60 * 1000) {
      errors.push("Publish date can't be a past date.");
    }
  }

  if (platform && platform.toUpperCase() === 'FACEBOOK' && editingPost?.status?.toUpperCase() === 'PUBLISHED') {
    let originalUrls = [];
    if (Array.isArray(editingPost.mediaUrls)) {
      originalUrls = editingPost.mediaUrls.filter(Boolean);
    } else if (typeof editingPost.mediaUrls === 'string') {
      originalUrls = editingPost.mediaUrls.split(',').map(u => u.trim()).filter(Boolean);
    }

    const currentUrls = (mediaItems || []).map(item => (typeof item === 'string' ? item : item.path)).filter(Boolean);
    const hasNewFiles = (mediaItems || []).some(item => typeof item === 'object' && item.file);

    const isChanged = hasNewFiles ||
                      currentUrls.length !== originalUrls.length ||
                      !currentUrls.every(url => originalUrls.includes(url));

    if (isChanged) {
      errors.push('[FACEBOOK] Facebook does not support updating/modifying media on an already published post.');
    }
  }

  return { bypass: false, errors };
}

/**
 * ─── Bước cố định #2: Capability-driven checks (generic, mọi platform) ───
 */
function runCapabilityChecks(capability, ctx) {
  const errors = [];
  if (!capability) return errors;

  const { hasMedia, isVideo, videoDuration, videoWidth, videoHeight, caption, format, platUpper } = ctx;
  const prefix = `[${platUpper}]`;

  if (capability.isLocked) {
    errors.push(`${prefix} Nền tảng này hiện đang bị khóa: ${capability.lockReason || 'Tạm thời bảo trì'}`);
    return errors;
  }

  if (capability.allowedMediaTypes === 'NONE' && hasMedia) {
    errors.push(`${prefix} Media uploads are not allowed.`);
  }
  if (capability.allowedMediaTypes === 'VIDEO' && hasMedia && !isVideo) {
    errors.push(`${prefix} Only video files are allowed.`);
  }
  if (capability.allowedMediaTypes === 'IMAGE' && hasMedia && isVideo) {
    errors.push(`${prefix} Only image files are allowed.`);
  }

  if (hasMedia && capability.allowedFormats && format) {
    const allowed = capability.allowedFormats.split(',').map(f => f.trim().toLowerCase());
    if (!allowed.includes(format)) {
      errors.push(`${prefix} Format "${format}" is not supported. Supported formats: ${capability.allowedFormats}`);
    }
  }

  if (hasMedia && isVideo && videoDuration) {
    if (capability.minVideoDuration && videoDuration < capability.minVideoDuration) {
      errors.push(`${prefix} Video duration (${Math.round(videoDuration)}s) is shorter than the minimum required ${capability.minVideoDuration}s.`);
    }
    if (capability.maxVideoDuration && videoDuration > capability.maxVideoDuration) {
      errors.push(`${prefix} Video duration (${Math.round(videoDuration)}s) is longer than the maximum allowed ${capability.maxVideoDuration}s.`);
    }
  }

  if (capability.orientation === 'VERTICAL' && isVideo && videoWidth && videoHeight && videoWidth >= videoHeight) {
    errors.push(`${prefix} Must be vertical (9:16 aspect ratio).`);
  }

  const maxLen = capability.maxCaptionLength || capability.maxCharacters;
  if (maxLen && caption && caption.length > maxLen) {
    errors.push(`${prefix} Caption length exceeds the maximum limit of ${maxLen} characters.`);
  }

  return errors;
}

/**
 * ─── RUNNER: validateAccountSlot (Template Method chính) ───
 */
export function validateAccountSlot({
  platform,
  subType,
  capability,
  mediaItems = [],
  captionText = '',
  editingPost,
  videoDuration,
  videoWidth,
  videoHeight,
  youtubeTitle,
  youtubeMadeForKids,
  fallbackFile,
  fallbackPath,
  fallbackUrl,
  accountLabel = '',
  threadPosts
}) {
  const platUpper = platform.toUpperCase();
  const spec = findSpecForPlatform(platform, subType);
  const errors = [];

  const platformHasMedia = mediaItems.length > 0;
  const platformMediaCount = mediaItems.length;
  const firstMediaItem = mediaItems[0];

  const platformIsVid = firstMediaItem
    ? isVideoPath(
        typeof firstMediaItem === 'string' ? firstMediaItem : (firstMediaItem.previewUrl || firstMediaItem.path || ''),
        firstMediaItem?.file
      )
    : isVideoPath(fallbackUrl, fallbackFile);

  const format = getMediaFormat(firstMediaItem, fallbackFile, fallbackPath, fallbackUrl);

  const ctx = {
    platUpper,
    platform,
    subType,
    hasMedia: platformHasMedia,
    isVideo: platformIsVid,
    videoDuration: videoDuration || 0,
    videoWidth: videoWidth || 0,
    videoHeight: videoHeight || 0,
    mediaCount: platformMediaCount,
    mediaItems,
    caption: captionText,
    youtubeTitle,
    youtubeMadeForKids,
    format,
    accountLabel,
    threadPosts,
    capability: capability || spec
  };

  // Global guards
  const { bypass, errors: globalErrs } = runGlobalGuards({
    isLibrary: false,
    selectedPublishId: null,
    editingPost,
    platform,
    mediaItems
  });
  if (bypass) return globalErrs;
  errors.push(...globalErrs);

  // 1. Generic capability checks (LUÔN CHẠY)
  const cap = capability || spec;
  if (cap) {
    errors.push(...runCapabilityChecks(cap, ctx));
  }

  // 2. Strategy custom validation hook (LUÔN CHẠY SONG SONG)
  if (spec && spec.validateCustom) {
    const customErrs = spec.validateCustom(ctx);
    if (Array.isArray(customErrs)) {
      errors.push(...customErrs.map(err => err.startsWith('[') ? err : `[${platUpper}] ${err}`));
    }
  }

  return [...new Set(errors)];
}

/**
 * ─── RUNNER: validatePostForm (Template Method chính cho toàn bộ form) ───
 */
export function validatePostForm({
  isLibrary,
  selectedPublishId,
  scheduledDate,
  selectedPlatforms = [],
  facebookType = 'post',
  youtubeType = 'video',
  instagramType = 'post',
  videoFileUrl,
  videoFile,
  videoDuration,
  videoWidth,
  videoHeight,
  uploadedVideoPath,
  platformLimits = [],
  platformCapabilities = {},
  editingPost,
  youtubeMadeForKids = null,
  postMedia = [],
  captionText = '',
  youtubeTitle = '',
  networkCustom = {},
  selectedAccountIds = [],
  activeBrand = null
}) {
  const globalGuardResult = runGlobalGuards({
    isLibrary,
    selectedPublishId,
    scheduledDate,
    editingPost
  });
  if (globalGuardResult.bypass) return globalGuardResult.errors;

  const errors = [...globalGuardResult.errors];

  const defaultMediaItems = (postMedia && postMedia.length > 0)
    ? postMedia
    : (videoFileUrl || uploadedVideoPath)
      ? [{ previewUrl: videoFileUrl, path: uploadedVideoPath, file: videoFile }]
      : [];

  for (const platform of selectedPlatforms) {
    const platUpper = platform.toUpperCase();
    const platKey = platform.toLowerCase();

    const spec = findSpecForPlatform(platform, facebookType);
    let subType = 'POST';
    if (spec && spec.subTypeField) {
      const formVal = { facebookType, youtubeType, instagramType }[spec.subTypeField];
      if (formVal) subType = formVal.toUpperCase();
    } else if (platform === PLATFORMS.TIKTOK) {
      subType = 'VIDEO';
    }

    const key = `${platUpper}_${subType}`;
    const dbLimit = platformLimits.find(l => l.platform === platUpper && l.subType === subType);
    const apiCap = platformCapabilities[key];
    const specCap = PLATFORM_SPECS[key];
    const capability = apiCap || dbLimit || specCap;

    const entry = networkCustom?.[platKey];
    const slotsToValidate = [];

    const targetAccounts = (activeBrand?.socialAccounts || []).filter(
      sa => (sa.platform || '').toUpperCase() === platUpper && selectedAccountIds.includes(sa.id)
    );

    if (targetAccounts.length > 0) {
      targetAccounts.forEach(acc => {
        const slot = entry?.perAccount?.[acc.id];
        const isSlotCustom = slot?.useTemplate === false;
        const slotSettings = slot?.settings || entry?.settings || {};
        slotsToValidate.push({
          mediaItems: isSlotCustom ? (slot.mediaUrls || []) : (entry?.useTemplate === false ? (entry.mediaUrls || []) : defaultMediaItems),
          caption: isSlotCustom ? (slot.caption || '') : (entry?.useTemplate === false ? (entry.caption || '') : captionText),
          settings: slotSettings,
          accountLabel: targetAccounts.length > 1 ? (acc.displayName || `Account ${acc.id.slice(-4)}`) : '',
          threadPosts: slot?.threadPosts || entry?.threadPosts
        });
      });
    } else if (entry) {
      if (entry.perAccount && Object.keys(entry.perAccount).length > 0) {
        Object.entries(entry.perAccount).forEach(([accId, slot]) => {
          const isSlotCustom = slot?.useTemplate === false;
          slotsToValidate.push({
            mediaItems: isSlotCustom ? (slot.mediaUrls || []) : (entry?.useTemplate === false ? (entry.mediaUrls || []) : defaultMediaItems),
            caption: isSlotCustom ? (slot.caption || '') : (entry?.useTemplate === false ? (entry.caption || '') : captionText),
            settings: slot?.settings || entry.settings || {},
            accountLabel: `Account ${accId.slice(-4)}`,
            threadPosts: slot?.threadPosts || entry?.threadPosts
          });
        });
      } else if (entry.useTemplate === false) {
        slotsToValidate.push({
          mediaItems: entry.mediaUrls || [],
          caption: entry.caption !== undefined ? entry.caption : captionText,
          settings: entry.settings || {},
          accountLabel: '',
          threadPosts: entry.threadPosts
        });
      }
    }

    if (slotsToValidate.length === 0) {
      slotsToValidate.push({
        mediaItems: defaultMediaItems,
        caption: captionText,
        settings: entry?.settings || {},
        accountLabel: '',
        threadPosts: entry?.threadPosts
      });
    }

    for (const slot of slotsToValidate) {
      const slotSettings = slot.settings || {};
      const slotYoutubeTitle = slotSettings.title !== undefined ? slotSettings.title : youtubeTitle;
      const slotYoutubeMadeForKids = slotSettings.madeForKids !== undefined ? slotSettings.madeForKids : youtubeMadeForKids;

      const slotErrors = validateAccountSlot({
        platform,
        subType,
        capability,
        mediaItems: slot.mediaItems,
        captionText: slot.caption,
        editingPost,
        videoDuration,
        videoWidth,
        videoHeight,
        youtubeTitle: slotYoutubeTitle,
        youtubeMadeForKids: slotYoutubeMadeForKids,
        fallbackFile: videoFile,
        fallbackPath: uploadedVideoPath,
        fallbackUrl: videoFileUrl,
        accountLabel: slot.accountLabel,
        threadPosts: slot.threadPosts
      });

      errors.push(...slotErrors);
    }
  }

  return [...new Set(errors)];
}

/**
 * Validates an AutoList post against EVERY selected account of each
 * platform (not just one representative account) — a brand can have 2+
 * YouTube channels with different Title/Audience/etc, and at publish time
 * the backend applies each channel's own preset via networkOverrides, so a
 * post missing e.g. Title on channel B is a real publish-time error even
 * if channel A's preset is fully filled in. Returns the union of errors
 * across all channels of all selected platforms.
 *
 * @param {Object} post - the AutoList post ({ mediaUrls, options, scheduledAt })
 * @param {{facebook: Object[], youtube: Object[], instagram: Object[]}} validationPresets -
 *   one preset-settings object per selected account of that platform
 * @param {string[]} selectedPlatformKeys - unique platform names targeted by the AutoList
 * @param {{file: File, previewUrl: string}[]} pendingMedia - freshly-picked
 *   media not yet uploaded/saved to post.mediaUrls (see AutoListPostCard's
 *   pendingMedia state). Included so a file just picked but not yet saved
 *   is still caught by e.g. "YouTube requires a video file" instead of only
 *   validating after the user clicks Save.
 */
export function validatePostAgainstAllPresets(post, validationPresets, selectedPlatformKeys, pendingMedia = []) {
  const savedMediaUrls = !post.mediaUrls ? [] : (Array.isArray(post.mediaUrls) ? post.mediaUrls : post.mediaUrls.split(',').filter(Boolean));
  const pendingMediaItems = (pendingMedia || []).map(p => ({ path: p.previewUrl, file: p.file }));
  const mediaUrls = [...savedMediaUrls, ...pendingMediaItems];
  const firstMedia = mediaUrls[0];

  const facebookPresets = validationPresets.facebook?.length ? validationPresets.facebook : [{}];
  const youtubePresets = validationPresets.youtube?.length ? validationPresets.youtube : [{}];
  const instagramPresets = validationPresets.instagram?.length ? validationPresets.instagram : [{}];

  const errors = [];
  for (const facebookPreset of facebookPresets) {
    for (const youtubePreset of youtubePresets) {
      for (const instagramPreset of instagramPresets) {
        errors.push(...validatePostForm({
          isLibrary: false,
          selectedPublishId: 'schedule',
          scheduledDate: post.scheduledAt || new Date(),
          selectedPlatforms: selectedPlatformKeys || [],
          facebookType: post.options?.facebookType || facebookPreset.contentType || 'post',
          youtubeType: post.options?.youtubeType || youtubePreset.videoType || 'video',
          instagramType: post.options?.instagramType || instagramPreset.contentType || 'post',
          youtubeTitle: post.options?.youtubeTitle || youtubePreset.title || '',
          youtubeMadeForKids: post.options?.youtubeMadeForKids ?? youtubePreset.madeForKids ?? null,
          videoFileUrl: typeof firstMedia === 'string' ? firstMedia : firstMedia?.path,
          uploadedVideoPath: typeof firstMedia === 'string' ? firstMedia : firstMedia?.path,
          mediaCount: mediaUrls.length,
          postMedia: mediaUrls.map(item => (typeof item === 'string' ? { path: item } : item))
        }));
      }
    }
  }
  return [...new Set(errors)];
}
