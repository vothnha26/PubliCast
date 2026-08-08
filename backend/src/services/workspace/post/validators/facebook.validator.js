const BaseValidator = require('./base.validator');
const { STORY_LIMITS } = require('../../../../config/facebook-reel.constants');

class FacebookValidator extends BaseValidator {
  validate(postData, mediaInfo = {}) {
    const errors = [];
    errors.push(...this.validateFixedRules(postData, mediaInfo));
    errors.push(...this.validateCaption(postData.caption));
    errors.push(...this.validateMedia(mediaInfo));

    const isReel = postData.type === 'REEL' || postData.options?.facebookType === 'reel';
    const isStory = postData.type === 'STORY' || postData.options?.facebookType === 'story';

    if (isReel) {
      const { hasMedia, isVideo, duration, width, height, frameRate } = mediaInfo;
      // Reels require video
      if (!hasMedia || !isVideo) {
        errors.push('Facebook Reels require a video file.');
      } else {
        // Best-effort specs validation (chỉ validate khi có các thông tin duration/width/height/frameRate —
        // available from the browser's <video> element for duration/width/
        // height, and from Cloudinary's upload response for frameRate; see
        // usePostCreatorForm.js's payload.options build).
        if (duration) {
          if (duration < 3 || duration > 90) {
            errors.push(`Facebook Reels duration must be between 3 and 90 seconds (Current: ${duration.toFixed(1)}s).`);
          }
        }
        if (width && height) {
          const ratio = width / height;
          // Thước phim Reels phải là video dọc (tỉ lệ < 1.0)
          if (ratio >= 1.0) {
            errors.push('Facebook Reels must be vertical (aspect ratio 9:16).');
          }
          if (width < 540 || height < 960) {
            errors.push(`Facebook Reels resolution must be at least 540x960 (Current: ${width}x${height}).`);
          }
        }
        if (frameRate) {
          if (frameRate < 24 || frameRate > 60) {
            errors.push(`Facebook Reels frame rate must be between 24 and 60 fps (Current: ${frameRate}fps).`);
          }
        }
      }

      // Kiểm tra Thumbnail URL
      const thumbUrl = postData.options?.facebookReelThumbnail;
      if (thumbUrl && !/^https?:\/\//i.test(thumbUrl)) {
        errors.push('Thumbnail must be a valid HTTP/HTTPS URL.');
      }

      // Facebook Page/Place IDs are always numeric strings — reject anything
      // else before it reaches the Graph API call.
      const collaboratorId = postData.options?.facebookReelCollaboratorId;
      if (collaboratorId && !/^\d+$/.test(collaboratorId)) {
        errors.push('Collaborator Page ID must be a numeric string.');
      }
      const placeId = postData.options?.facebookReelPlaceId;
      if (placeId && !/^\d+$/.test(placeId)) {
        errors.push('Place ID must be a numeric string.');
      }
    }

    if (isStory) {
      const { hasMedia, isVideo, duration, width, height, frameRate } = mediaInfo;
      // Story cho phép cả ảnh và video — chỉ video mới có giới hạn
      // duration/resolution/frameRate bên dưới.
      if (!hasMedia) {
        errors.push('Facebook Stories require a photo or video file.');
      } else if (isVideo) {
        // Video Story đăng lên Trang Facebook không được vượt quá 60 giây.
        if (duration) {
          if (duration < STORY_LIMITS.MIN_DURATION_SECONDS || duration > STORY_LIMITS.MAX_DURATION_SECONDS) {
            errors.push(`Facebook Story videos must be between ${STORY_LIMITS.MIN_DURATION_SECONDS} and ${STORY_LIMITS.MAX_DURATION_SECONDS} seconds (Current: ${duration.toFixed(1)}s).`);
          }
        }
        if (width && height) {
          if (width < STORY_LIMITS.MIN_RESOLUTION_WIDTH || height < STORY_LIMITS.MIN_RESOLUTION_HEIGHT) {
            errors.push(`Facebook Story resolution must be at least ${STORY_LIMITS.MIN_RESOLUTION_WIDTH}x${STORY_LIMITS.MIN_RESOLUTION_HEIGHT} (Current: ${width}x${height}).`);
          }
        }
        if (frameRate) {
          if (frameRate < STORY_LIMITS.MIN_FRAME_RATE || frameRate > STORY_LIMITS.MAX_FRAME_RATE) {
            errors.push(`Facebook Story frame rate must be between ${STORY_LIMITS.MIN_FRAME_RATE} and ${STORY_LIMITS.MAX_FRAME_RATE} fps (Current: ${frameRate}fps).`);
          }
        }
      }
    }

    return errors;
  }
}

module.exports = FacebookValidator;
