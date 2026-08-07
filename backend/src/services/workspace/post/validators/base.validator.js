class BaseValidator {
  constructor(limitConfig) {
    this.limitConfig = limitConfig || {};
  }

  /**
   * Validate post data
   * @param {Object} postData 
   * @param {Object} mediaInfo { hasMedia, isVideo, sizeMb, duration, format, width, height }
   * @returns {string[]} Mảng chứa danh sách các lỗi, rỗng nếu hợp lệ
   */
  validate(postData, mediaInfo = {}) {
    throw new Error('validate() method must be implemented');
  }

  // Helper validation methods
  validateCaption(caption) {
    const errors = [];
    if (!caption) return errors;

    if (this.limitConfig.maxCaptionLength && caption.length > this.limitConfig.maxCaptionLength) {
      errors.push(`Caption length exceeds the maximum limit of ${this.limitConfig.maxCaptionLength} characters.`);
    }
    return errors;
  }

  validateMedia(mediaInfo) {
    const errors = [];
    const { hasMedia, isVideo, sizeMb, duration, format } = mediaInfo;
    
    if (!this.limitConfig.allowedMediaTypes) return errors;

    // Check if media is required or allowed
    if (this.limitConfig.allowedMediaTypes === 'NONE' && hasMedia) {
      errors.push('Media uploads are not allowed for this post type.');
      return errors;
    }
    
    if (this.limitConfig.allowedMediaTypes === 'VIDEO' && hasMedia && !isVideo) {
      errors.push('Only video files are allowed.');
      return errors;
    }

    if (this.limitConfig.allowedMediaTypes === 'IMAGE' && hasMedia && isVideo) {
      errors.push('Only image files are allowed.');
      return errors;
    }

    if (!hasMedia) return errors;

    // Validate file size
    if (sizeMb && this.limitConfig.maxFileSizeMb && sizeMb > this.limitConfig.maxFileSizeMb) {
      errors.push(`File size (${sizeMb}MB) exceeds the maximum limit of ${this.limitConfig.maxFileSizeMb}MB.`);
    }

    // Validate format
    if (format && this.limitConfig.allowedFormats) {
      const allowed = this.limitConfig.allowedFormats.split(',').map(f => f.trim().toLowerCase());
      if (!allowed.includes(format.toLowerCase())) {
        errors.push(`Format "${format}" is not allowed. Supported formats: ${this.limitConfig.allowedFormats}`);
      }
    }

    // Validate duration (for videos)
    if (isVideo && duration) {
      if (this.limitConfig.minVideoDuration && duration < this.limitConfig.minVideoDuration) {
        errors.push(`Video duration (${duration}s) is shorter than the minimum required ${this.limitConfig.minVideoDuration}s.`);
      }
      if (this.limitConfig.maxVideoDuration && duration > this.limitConfig.maxVideoDuration) {
        errors.push(`Video duration (${duration}s) is longer than the maximum allowed ${this.limitConfig.maxVideoDuration}s.`);
      }
    }

    return errors;
  }

  /**
   * Every platform needs at least a caption or a media file — an
   * all-empty post has nothing to publish. Platforms that already
   * hard-require media (YouTube/TikTok/Instagram) don't need this since
   * their own hasMedia check already rejects the empty case; call this
   * from validate() on the platforms that don't (Facebook, Bluesky,
   * Threads/etc. via GenericValidator).
   */
  validateHasContent(postData, mediaInfo = {}) {
    const errors = [];
    const caption = (postData.caption || '').trim();
    if (!caption && !mediaInfo.hasMedia) {
      errors.push('Post must have a caption or at least one media file.');
    }
    return errors;
  }

  validateVideoSettings(postData, mediaInfo = {}) {
    const errors = [];
    const settings = postData.options?.videoSettings;
    if (!settings) return errors;

    const { startTime, endTime, audioVolume } = settings;

    if (startTime !== undefined && endTime !== undefined) {
      if (typeof startTime !== 'number' || typeof endTime !== 'number') {
        errors.push('Thời gian cắt video (trim settings) phải là số.');
      } else if (startTime < 0) {
        errors.push('Thời gian bắt đầu cắt video không được nhỏ hơn 0.');
      } else if (startTime >= endTime) {
        errors.push('Thời gian bắt đầu cắt video phải nhỏ hơn thời gian kết thúc.');
      }
    }

    if (audioVolume !== undefined) {
      if (typeof audioVolume !== 'number' || audioVolume < 0 || audioVolume > 100) {
        errors.push('Âm lượng nhạc nền phải nằm trong khoảng từ 0 đến 100.');
      }
    }

    return errors;
  }
}

module.exports = BaseValidator;
