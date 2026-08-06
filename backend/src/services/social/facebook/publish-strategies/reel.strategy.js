const FacebookPublishStrategy = require('./publish.strategy');
const facebookReelGateway = require('../facebook-reel.gateway');
const { downloadImageSafely } = require('../../../../utils/network-security');
const logger = require('../../../../utils/logger');

class ReelPublishStrategy extends FacebookPublishStrategy {
  async publish(pageId, pageAccessToken, postData) {
    const { mediaUrl, caption, options = {} } = postData;
    if (!mediaUrl) {
      throw new Error('Reel requires a video media file');
    }

    const publishOptions = {};
    if (options.facebookReelPlaceId) {
      publishOptions.placeId = options.facebookReelPlaceId;
    }

    const publishResult = await facebookReelGateway.publishReel(
      pageId,
      pageAccessToken,
      mediaUrl,
      caption,
      publishOptions
    );
    const videoId = publishResult.id;

    // Tải & đăng ảnh bìa tùy chỉnh (Best-effort), SAU khi Reel đã publish
    // xong — theo Meta, /thumbnails được gọi sau khi video_state đã là
    // PUBLISHED, không phải trước.
    if (options.facebookReelThumbnail) {
      try {
        logger.debug(`[ReelPublishStrategy] Downloading custom thumbnail safely from: ${options.facebookReelThumbnail}`);
        const thumbnailBuffer = await downloadImageSafely(options.facebookReelThumbnail);

        logger.debug(`[ReelPublishStrategy] Uploading thumbnail to Reels video ${videoId}`);
        await facebookReelGateway.uploadReelThumbnail(
          videoId,
          pageAccessToken,
          thumbnailBuffer,
          'thumbnail.jpg'
        );
        logger.debug('[ReelPublishStrategy] Custom thumbnail uploaded successfully.');
      } catch (err) {
        console.error('[ReelPublishStrategy] Failed to upload custom thumbnail:', err.message);
        // Best-effort: Không làm hỏng cả luồng post nếu chỉ lỗi upload thumbnail
      }
    }

    return publishResult;
  }
}

module.exports = ReelPublishStrategy;
