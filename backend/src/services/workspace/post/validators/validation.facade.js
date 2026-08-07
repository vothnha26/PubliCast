const prisma = require('../../../../config/prisma');
const validatorFactory = require('./validator.factory');

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
    return status === 'DRAFT';
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

    // Load limits from DB
    const limits = await prisma.platformLimit.findMany({
      where: {
        platform: {
          in: platforms.map(p => p.toUpperCase())
        }
      }
    });

    const allErrors = [];

    for (const platform of platforms) {
      const platUpper = platform.toUpperCase();
      
      // Determine subtype from options (e.g. facebookType, youtubeType, instagramType)
      let subType = 'POST'; // default
      if (platUpper === 'YOUTUBE') {
        subType = (options.youtubeType || 'video').toUpperCase(); // VIDEO or SHORTS
      } else if (platUpper === 'FACEBOOK') {
        subType = (options.facebookType || 'post').toUpperCase(); // POST, REEL, STORY
      } else if (platUpper === 'INSTAGRAM') {
        subType = (options.instagramType || 'post').toUpperCase(); // POST, REEL, STORY
      } else if (platUpper === 'TIKTOK') {
        subType = 'VIDEO';
      }

      const DEFAULT_PLATFORM_CAPTION_LIMITS = {
        BLUESKY: 300,
        THREADS: 500,
        TIKTOK: 2200,
        INSTAGRAM: 2200,
        YOUTUBE: 5000,
        FACEBOOK: 63206
      };

      // Find the specific limit from DB result
      const limitConfig = limits.find(l => l.platform === platUpper && l.subType === subType) || {
        platform: platUpper,
        subType,
        maxCaptionLength: DEFAULT_PLATFORM_CAPTION_LIMITS[platUpper] || 2000,
        maxFileSizeMb: 100,
        allowedMediaTypes: 'ALL',
        allowedFormats: 'mp4,mov,png,jpg,jpeg'
      };

      // Check if platform is locked
      if (limitConfig.isLocked) {
        allErrors.push(`[${platUpper} - ${subType}] Nền tảng này hiện đang bị khóa: ${limitConfig.lockReason || 'Bảo trì hệ thống'}`);
        continue;
      }

      // Check Bluesky Email verification for Video posts
      if (platUpper === 'BLUESKY' && (mediaInfo.isVideo || (postData.mediaUrls && postData.mediaUrls.some(u => typeof u === 'string' && u.match(/\.(mp4|mov|webm|mkv)$/i))))) {
        try {
          const socialAccountRepo = require('../../../../repositories/social/social-account.repository');
          const account = await socialAccountRepo.findByBrandAndPlatformFirst(postData.brandId, 'BLUESKY');
          if (account && account.blueskyAccount && !account.blueskyAccount.emailConfirmed) {
            allErrors.push(`[BLUESKY] Tài khoản Bluesky chưa xác thực Email. Bluesky yêu cầu xác thực Email tại bsky.app > Settings > Confirm Email trước khi cho phép tải Video.`);
          }
        } catch (e) {
          // ignore lookup error and fallback to runtime
        }
      }

      const validator = validatorFactory.getValidator(platUpper, limitConfig);
      const errors = await validator.validate(postData, mediaInfo);

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
