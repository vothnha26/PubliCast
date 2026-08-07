import { isVideoPath } from './url';
import { PLATFORMS } from '../constants/platforms';
import { PLATFORM_CONFIGS } from '../constants/platformRegistry';
import { POST_TYPE } from '../constants/postTypes';
import { isHorizontalOrSquareVideo, PLATFORM_VALIDATION_MESSAGES } from '../constants/platformValidation.constants';

/**
 * validatePostForm
 * Hàm validate bài viết dựa trên platform và định dạng file, sử dụng cấu hình registry động kết hợp DB PlatformLimits.
 *
 * @returns {string[]} Mảng chứa các thông báo lỗi (rỗng nếu không có lỗi)
 */
export function validatePostForm({
  isLibrary,
  selectedPublishId,
  scheduledDate,
  selectedPlatforms = [],
  facebookType,
  youtubeType,
  instagramType,
  videoFileUrl,
  videoFile,
  videoDuration,
  videoWidth,
  videoHeight,
  uploadedVideoPath,
  platformLimits = [],
  mediaCount = 0,
  editingPost,
  youtubeMadeForKids = null,
  postMedia = [],
  captionText = '',
  youtubeTitle = '',
  networkCustom = {}
}) {
  const errors = [];
  if (isLibrary || selectedPublishId === 'draft') {
    return errors;
  }

  // 0. Validate từng post trong Threads chain (nếu Threads được chọn và đang customize)
  if (selectedPlatforms.includes(PLATFORMS.THREADS) && networkCustom?.[PLATFORMS.THREADS]?.useTemplate === false) {
    const threadsConfig = PLATFORM_CONFIGS[PLATFORMS.THREADS];
    const THREADS_MAX_CHARS = threadsConfig?.limits?.text?.maxLength || 500;
    (networkCustom.threads.threadPosts || []).forEach((post, index) => {
      const txt = typeof post === 'string' ? post : (post?.text || '');
      const media = typeof post === 'string' ? [] : (post?.mediaUrls || []);
      const len = txt.length;
      if (len > THREADS_MAX_CHARS) {
        errors.push(`[THREADS] Post ${index + 1} trong chuỗi vượt quá ${THREADS_MAX_CHARS} ký tự (hiện ${len}).`);
      }
      if (len === 0 && media.length === 0) {
        errors.push(`[THREADS] Post ${index + 1} trong chuỗi đang trống (không có text lẫn media).`);
      }
    });
  }

  // 1. Validate ngày lên lịch
  if (['schedule', 'review'].includes(selectedPublishId)) {
    const isPastDate = new Date(scheduledDate).getTime() < Date.now() - 15 * 60 * 1000; // Cho phép trễ tối đa 15 phút
    if (isPastDate) {
      errors.push("Publish date can't be a past date.");
    }
  }

  const hasMedia = !!(uploadedVideoPath || videoFile || mediaCount > 0);
  const isVid = isVideoPath(videoFileUrl, videoFile);

  // 2. Validate từng platform được tích chọn
  for (const platform of selectedPlatforms) {
    const platUpper = platform.toUpperCase();
    
    // Xác định subType
    let subType = POST_TYPE.IMAGE;
    if (platform === PLATFORMS.FACEBOOK) subType = facebookType.toUpperCase();
    else if (platform === PLATFORMS.YOUTUBE) subType = youtubeType.toUpperCase();
    else if (platform === PLATFORMS.INSTAGRAM) subType = instagramType.toUpperCase();
    else if (platform === PLATFORMS.TIKTOK) subType = POST_TYPE.VIDEO;

    // Validation không cho phép thay đổi/thêm/bớt media trên bài viết Facebook đã xuất bản (PUBLISHED)
    if (platUpper === PLATFORMS.FACEBOOK.toUpperCase() && editingPost && editingPost.status?.toUpperCase() === 'PUBLISHED') {
      let originalUrls = [];
      if (Array.isArray(editingPost.mediaUrls)) {
        originalUrls = editingPost.mediaUrls.filter(Boolean);
      } else if (typeof editingPost.mediaUrls === 'string') {
        originalUrls = editingPost.mediaUrls.split(',').map(u => u.trim()).filter(Boolean);
      }

      const currentUrls = (postMedia || []).map(item => item.path).filter(Boolean);
      const hasNewFiles = (postMedia || []).some(item => item.file);

      const isChanged = hasNewFiles || 
                        currentUrls.length !== originalUrls.length || 
                        !currentUrls.every(url => originalUrls.includes(url));

      if (isChanged) {
        errors.push(`[FACEBOOK] Facebook does not support updating/modifying media on an already published post.`);
      }
    }

    // Tìm cấu hình limit động từ DB
    const limitConfig = platformLimits.find(l => l.platform === platUpper && l.subType === subType);

    if (limitConfig && limitConfig.isLocked) {
      errors.push(`[${platUpper} - ${subType}] Nền tảng này hiện đang bị khóa: ${limitConfig.lockReason || 'Tạm thời bảo trì'}`);
      continue;
    }

    if (!limitConfig) {
      // Fallback sang cấu hình static registry nếu chưa load được DB limits
      const platKey = platform.toLowerCase();
      const config = PLATFORM_CONFIGS[platKey];
      if (config) {
        let activeType = config.defaultType;
        if (platKey === 'facebook') activeType = facebookType;
        else if (platKey === 'youtube') activeType = youtubeType;
        else if (platKey === 'instagram') activeType = instagramType;

        const checkContext = {
          hasMedia,
          isVideo: isVid,
          videoDuration: videoDuration || 0,
          videoWidth: videoWidth || 0,
          videoHeight: videoHeight || 0,
          mediaCount,
          caption: captionText,
          youtubeTitle,
          youtubeMadeForKids
        };

        const alwaysRules = config.validationRules?._always || [];
        for (const rule of alwaysRules) {
          if (rule.check(checkContext)) {
            errors.push(`[${platUpper}] ${rule.message(checkContext)}`);
          }
        }

        const typeRules = config.validationRules?.[activeType] || [];
        for (const rule of typeRules) {
          if (rule.check(checkContext)) {
            errors.push(`[${platUpper} - ${activeType.toUpperCase()}] ${rule.message(checkContext)}`);
          }
        }
      }
      continue;
    }

    // Thực hiện validation dựa trên DB limits
    
    // Check Allowed Media Types
    if (limitConfig.allowedMediaTypes === 'NONE' && hasMedia) {
      errors.push(`[${platUpper} - ${subType}] Media uploads are not allowed.`);
    }
    if (limitConfig.allowedMediaTypes === 'VIDEO' && hasMedia && !isVid) {
      errors.push(`[${platUpper} - ${subType}] Only video files are allowed.`);
    }
    if (limitConfig.allowedMediaTypes === 'IMAGE' && hasMedia && isVid) {
      errors.push(`[${platUpper} - ${subType}] Only image files are allowed.`);
    }

    if (hasMedia) {
      // Validate format
      if (limitConfig.allowedFormats) {
        const allowed = limitConfig.allowedFormats.split(',').map(f => f.trim().toLowerCase());
        const fileName = videoFile ? videoFile.name : (uploadedVideoPath || videoFileUrl || '');
        const format = fileName.split('.').pop().split('?')[0].toLowerCase();
        
        if (format && !allowed.includes(format)) {
          errors.push(`[${platUpper} - ${subType}] Format "${format}" is not supported. Supported formats: ${limitConfig.allowedFormats}`);
        }
      }

      // Validate duration (chỉ cho video)
      if (isVid && videoDuration) {
        if (platUpper === 'YOUTUBE' && subType === 'SHORT' && limitConfig.maxVideoDuration && videoDuration > limitConfig.maxVideoDuration) {
          errors.push(`Short \u2192 Video length can't exceed ${limitConfig.maxVideoDuration} seconds. These videos don't meet the requirements: #1 (${videoDuration.toFixed(1)}s).`);
        } else if (limitConfig.minVideoDuration && videoDuration < limitConfig.minVideoDuration) {
          errors.push(`[${platUpper} - ${subType}] Video duration (${Math.round(videoDuration)}s) is shorter than the minimum required ${limitConfig.minVideoDuration}s.`);
        } else if (limitConfig.maxVideoDuration && videoDuration > limitConfig.maxVideoDuration) {
          errors.push(`[${platUpper} - ${subType}] Video duration (${Math.round(videoDuration)}s) is longer than the maximum allowed ${limitConfig.maxVideoDuration}s.`);
        }

        // Validate orientation cho Short
        if (platUpper === 'YOUTUBE' && subType === 'SHORT' && isHorizontalOrSquareVideo(videoWidth, videoHeight)) {
          errors.push(PLATFORM_VALIDATION_MESSAGES.YOUTUBE.SHORT_INVALID_ORIENTATION);
        }
      }
    }

    // Validate YouTube Audience & Title
    if (platUpper === 'YOUTUBE') {
      if (!youtubeTitle || !youtubeTitle.trim() || youtubeTitle.length > 100 || /[<>]/.test(youtubeTitle)) {
        errors.push("Video or short title is required and must be shorter than 100 characters. The characters < or > are not allowed.");
      }
      if (typeof youtubeMadeForKids !== 'boolean') {
        errors.push("It is necessary to select the audience of the video.");
      }
    }

    // Validate độ dài caption theo từng nền tảng
    const maxLen = limitConfig.maxCaptionLength || limitConfig.maxCharacters;
    if (maxLen && captionText && captionText.length > maxLen) {
      errors.push(`[${platUpper} - ${subType}] Caption length exceeds the maximum limit of ${maxLen} characters.`);
    }

    // Bắt buộc có media đối với Reels/Stories/Shorts/TikTok/YouTube
    if (platUpper === PLATFORMS.TIKTOK.toUpperCase() && !hasMedia) {
      errors.push(`[${platUpper} - ${subType}] TikTok posts require a video file.`);
    }
    if (platUpper === PLATFORMS.YOUTUBE.toUpperCase() && !hasMedia) {
      errors.push(`[${platUpper} - ${subType}] YouTube uploads require a video file.`);
    }
    if (platUpper === PLATFORMS.INSTAGRAM.toUpperCase() && !hasMedia) {
      errors.push(`[${platUpper} - ${subType}] Instagram requires at least one photo or video to publish a post.`);
    }
    if (platUpper === PLATFORMS.FACEBOOK.toUpperCase() && [POST_TYPE.REEL, POST_TYPE.STORY].includes(subType) && !hasMedia) {
      errors.push(`[${platUpper} - ${subType}] Facebook ${subType.toLowerCase()} requires a media file.`);
    }
  }

  return errors;
}

