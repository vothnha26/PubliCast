import { isVideoPath } from './url';
import { PLATFORM_CONFIGS } from '../constants/platformRegistry';
import { PostValidationEngine } from './validation/postValidationEngine';

/**
 * Tự động tạo rules JSON fallback từ các trường giới hạn tĩnh của PlatformLimit
 * @param {Object} limitConfig Cấu hình limit từ DB
 * @returns {Object} Cấu hình rules động tương thích
 */
function buildFallbackRules(limitConfig) {
  const rules = { _always: [], [limitConfig.subType.toLowerCase()]: [] };
  const plat = limitConfig.platform.toUpperCase();
  const sub = limitConfig.subType.toLowerCase();

  // 1. Kiểm tra allowedMediaTypes
  if (limitConfig.allowedMediaTypes === 'NONE') {
    rules._always.push({ id: `${plat}_no_media`, field: 'hasMedia', operator: 'equals', value: false, message: 'Nền tảng này không cho phép tải lên media.' });
  } else if (limitConfig.allowedMediaTypes === 'VIDEO') {
    rules._always.push({ id: `${plat}_only_video`, field: 'isVideo', operator: 'equals', value: true, message: 'Chỉ chấp nhận file định dạng video.' });
  } else if (limitConfig.allowedMediaTypes === 'IMAGE') {
    rules._always.push({ id: `${plat}_only_image`, field: 'isVideo', operator: 'equals', value: false, message: 'Chỉ chấp nhận file định dạng hình ảnh.' });
  }

  // 2. Định dạng file allowedFormats
  if (limitConfig.allowedFormats) {
    rules._always.push({
      id: `${plat}_format_check`,
      field: 'fileName',
      operator: 'format_allowed',
      value: limitConfig.allowedFormats,
      message: `Định dạng file không được hỗ trợ. Các định dạng được phép: ${limitConfig.allowedFormats}`
    });
  }

  // 3. Thời lượng video (chỉ check khi có video)
  if (limitConfig.minVideoDuration) {
    rules[sub].push({
      id: `${plat}_video_min`,
      field: 'videoDuration',
      operator: 'lt',
      value: limitConfig.minVideoDuration,
      message: `Thời lượng video ({videoDuration}s) ngắn hơn yêu cầu tối thiểu là {limitValue} giây.`
    });
  }
  if (limitConfig.maxVideoDuration) {
    rules[sub].push({
      id: `${plat}_video_max`,
      field: 'videoDuration',
      operator: 'gt',
      value: limitConfig.maxVideoDuration,
      message: `Thời lượng video ({videoDuration}s) dài hơn giới hạn cho phép là {limitValue} giây.`
    });
  }

  // 4. Bắt buộc có media đối với Reels/Stories/Shorts/TikTok/YouTube
  if (['TIKTOK', 'YOUTUBE'].includes(plat) || ['reel', 'story', 'shorts'].includes(sub)) {
    rules._always.push({ id: `${plat}_require_media`, field: 'hasMedia', operator: 'equals', value: true, message: 'Nền tảng này yêu cầu phải tải lên file media.' });
  } else if (plat === 'INSTAGRAM') {
    rules._always.push({ id: `IG_require_media`, field: 'hasMedia', operator: 'equals', value: true, message: 'Instagram yêu cầu phải có ít nhất 1 ảnh hoặc video.' });
  }

  return rules;
}

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
  youtubeTitle = '',
  youtubeMadeForKids,
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
  postMedia = [],
  caption = ''
}) {
  const errors = [];
  if (isLibrary || selectedPublishId === 'draft') {
    return errors;
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
    let subType = 'POST';
    if (platform === 'facebook') subType = facebookType.toUpperCase();
    else if (platform === 'youtube') subType = youtubeType.toUpperCase();
    else if (platform === 'instagram') subType = instagramType.toUpperCase();
    else if (platform === 'tiktok') subType = 'VIDEO';

    // Validation không cho phép thay đổi/thêm/bớt media trên bài viết Facebook đã xuất bản (PUBLISHED)
    if (platUpper === 'FACEBOOK' && editingPost && editingPost.status?.toUpperCase() === 'PUBLISHED') {
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

    // Tạo Context làm giàu dữ liệu (Enriched Context)
    const checkContext = {
      platform,
      hasMedia,
      isVideo: isVid,
      videoDuration: videoDuration || 0,
      videoWidth: videoWidth || 0,
      videoHeight: videoHeight || 0,
      videoRatio: (videoWidth && videoHeight) ? (videoWidth / videoHeight) : 0,
      captionLength: caption ? caption.length : 0,
      mediaCount,
      youtubeTitle,
      youtubeMadeForKids,
      fileName: videoFile ? videoFile.name : (uploadedVideoPath || videoFileUrl || '')
    };

    if (!limitConfig) {
      // Fallback sang cấu hình static registry nếu chưa load được DB limits
      const config = PLATFORM_CONFIGS[platform];
      if (config) {
        let activeType = config.defaultType;
        if (platform === 'facebook') activeType = facebookType;
        else if (platform === 'youtube') activeType = youtubeType;
        else if (platform === 'instagram') activeType = instagramType;

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

    // 3. Thực hiện validation bằng Rule Engine
    // Tự động dựng fallback rules nếu DB chưa cấu hình rules JSON
    const enrichedLimitConfig = { ...limitConfig };
    if (!enrichedLimitConfig.rules) {
      enrichedLimitConfig.rules = buildFallbackRules(enrichedLimitConfig);
    }

    const dynamicErrors = PostValidationEngine.evaluateRules(enrichedLimitConfig, checkContext);
    errors.push(...dynamicErrors);
  }

  return errors;
}
