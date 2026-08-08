const prisma = require('../../../../config/prisma');
const validatorFactory = require('./validator.factory');
const { PLATFORMS, POST_STATUS, POST_TYPES, DEFAULT_PLATFORM_CAPTION_LIMITS } = require('../../../../utils/constants');

class ValidationFacade {
  /**
   * Validate post before creating or updating
   * @param {Object} postData The post payload (title, caption, targetPlatforms, options, etc.)
   * @param {Object} mediaInfo Optional physical media information { hasMedia, isVideo, sizeMb, duration, format }
   * @returns {Promise<Object>} { isValid: boolean, errors: string[] }
   */
  shouldBypassValidation(postData) {
    // Bỏ qua validate chỉ khi bài viết là Nháp (DRAFT)
    const status = postData.status;
    return status === POST_STATUS.DRAFT;
  }

  async validatePost(postData, mediaInfo = {}) {
    if (this.shouldBypassValidation(postData)) {
      return { isValid: true, errors: [] };
    }
    const { targetPlatforms = [], options = {} } = postData;
    
    // Convert targetPlatforms to array if it is string (split by comma)
    let platforms = [];
    if (Array.isArray(targetPlatforms)) {
      platforms = targetPlatforms;
    } else if (typeof targetPlatforms === 'string') {
      platforms = targetPlatforms.split(',').map(p => p.trim());
    }

    if (platforms.length === 0) {
      return { isValid: true, errors: [] };
    }

    const { resolveCapability } = require('../capability-resolver.service');

    const allErrors = [];

    for (const platform of platforms) {
      const platUpper = platform.toUpperCase();
      
      // Determine subtype from options (e.g. facebookType, youtubeType, instagramType)
      let subType = POST_TYPES.POST; // default
      if (platUpper === PLATFORMS.YOUTUBE) {
        subType = (options.youtubeType || POST_TYPES.VIDEO).toUpperCase(); // VIDEO or SHORT
      } else if (platUpper === PLATFORMS.FACEBOOK) {
        subType = (options.facebookType || POST_TYPES.POST).toUpperCase(); // POST, REEL, STORY
      } else if (platUpper === PLATFORMS.INSTAGRAM) {
        subType = (options.instagramType || POST_TYPES.POST).toUpperCase(); // POST, REEL, STORY
      } else if (platUpper === PLATFORMS.TIKTOK) {
        subType = POST_TYPES.VIDEO;
      }

      let limitConfig;
      try {
        limitConfig = await resolveCapability(platUpper, subType);
      } catch (err) {
        limitConfig = {
          platform: platUpper,
          subType,
          maxCaptionLength: DEFAULT_PLATFORM_CAPTION_LIMITS[platUpper] || 2000,
          maxFileSizeMb: 100,
          allowedMediaTypes: 'ALL',
          allowedFormats: 'mp4,mov,png,jpg,jpeg'
        };
      }

      // Check if platform is locked
      if (limitConfig.isLocked) {
        allErrors.push(`[${platUpper} - ${subType}] Nền tảng này hiện đang bị khóa: ${limitConfig.lockReason || 'Bảo trì hệ thống'}`);
        continue;
      }

      // Check Bluesky Email verification for Video posts
      if (platUpper === PLATFORMS.BLUESKY && (mediaInfo.isVideo || (postData.mediaUrls && postData.mediaUrls.some(u => typeof u === 'string' && u.match(/\.(mp4|mov|webm|mkv)$/i))))) {
        try {
          const socialAccountRepo = require('../../../../repositories/social/social-account.repository');
          const account = await socialAccountRepo.findByBrandAndPlatformFirst(postData.brandId, PLATFORMS.BLUESKY);
          if (account && account.blueskyAccount && !account.blueskyAccount.emailConfirmed) {
            allErrors.push(`[BLUESKY] Tài khoản Bluesky chưa xác thực Email. Bluesky yêu cầu xác thực Email tại bsky.app > Settings > Confirm Email trước khi cho phép tải Video.`);
          }
        } catch (e) {
          // ignore lookup error and fallback to runtime
        }
      }

      // Check if networkOverrides has customized content for this platform
      const override = Array.isArray(postData.networkOverrides)
        ? postData.networkOverrides.find(o => (o.platform || '').toUpperCase() === platUpper)
        : null;

      let effectiveCaption = postData.caption;
      let effectiveMediaUrls = postData.mediaUrls || [];

      if (override && override.useTemplate === false) {
        if (override.caption !== undefined && override.caption !== null) {
          effectiveCaption = override.caption;
        }
        if (Array.isArray(override.mediaUrls)) {
          effectiveMediaUrls = override.mediaUrls;
        }
      }

      const platformHasMedia = effectiveMediaUrls.length > 0 || Boolean(mediaInfo.hasMedia);
      let platformIsVideo = mediaInfo.isVideo;
      let platformFormat = mediaInfo.format;
      if (platformHasMedia) {
        const firstUrl = effectiveMediaUrls[0];
        const cleanUrl = (typeof firstUrl === 'string' ? firstUrl : (firstUrl?.path || firstUrl?.url || '')).split('?')[0];
        const ext = cleanUrl.split('.').pop().toLowerCase();
        if (['mp4', 'mov', 'webm', 'avi', 'mkv'].includes(ext)) {
          platformIsVideo = true;
          platformFormat = ext;
        } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext)) {
          platformIsVideo = false;
          platformFormat = ext;
        }
      }

      const platformMediaInfo = {
        ...mediaInfo,
        hasMedia: platformHasMedia,
        isVideo: platformIsVideo,
        format: platformFormat,
        mediaCount: effectiveMediaUrls.length
      };

      const platformPostData = {
        ...postData,
        caption: effectiveCaption,
        mediaUrls: effectiveMediaUrls
      };

      const validator = validatorFactory.getValidator(platUpper, limitConfig);
      const errors = await validator.validate(platformPostData, platformMediaInfo);

      if (errors.length > 0) {
        allErrors.push(...errors.map(err => `[${platUpper} - ${subType}] ${err}`));
      }
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors
    };
  }
}

module.exports = new ValidationFacade();
