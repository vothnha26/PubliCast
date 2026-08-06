const BaseValidator = require('./base.validator');

class FacebookValidator extends BaseValidator {
  validate(postData, mediaInfo = {}) {
    const errors = [];
    errors.push(...this.validateCaption(postData.caption));
    errors.push(...this.validateMedia(mediaInfo));

    const isReel = postData.type === 'REEL' || postData.options?.facebookType === 'reel';
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

      // Kiểm tra Collaborator Page ID (phải là số)
      const collabId = postData.options?.facebookReelCollaboratorId;
      if (collabId && !/^\d+$/.test(collabId)) {
        errors.push('Collaborator Page ID must be a numeric string.');
      }

      // Kiểm tra Place ID (phải là số)
      const placeId = postData.options?.facebookReelPlaceId;
      if (placeId && !/^\d+$/.test(placeId)) {
        errors.push('Place ID must be a numeric string.');
      }

      // Kiểm tra Thumbnail URL
      const thumbUrl = postData.options?.facebookReelThumbnail;
      if (thumbUrl && !/^https?:\/\//i.test(thumbUrl)) {
        errors.push('Thumbnail must be a valid HTTP/HTTPS URL.');
      }
    }
    return errors;
  }
}

module.exports = FacebookValidator;
