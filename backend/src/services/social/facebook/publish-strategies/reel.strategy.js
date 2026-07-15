const FacebookPublishStrategy = require('./publish.strategy');
const facebookReelGateway = require('../facebook-reel.gateway');
const { downloadImageSafely } = require('../../../../utils/network-security');

class ReelPublishStrategy extends FacebookPublishStrategy {
  async publish(pageId, pageAccessToken, postData) {
    const { mediaUrl, caption, options = {} } = postData;
    if (!mediaUrl) {
      throw new Error('Reel requires a video media file');
    }

    // 1. Đăng Reel kèm placeId nếu có
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

    // 2. Tải & Cập nhật ảnh bìa tùy chỉnh (Best-effort)
    if (options.facebookReelThumbnail) {
      try {
        console.log(`[ReelPublishStrategy] Downloading custom thumbnail safely from: ${options.facebookReelThumbnail}`);
        const thumbnailBuffer = await downloadImageSafely(options.facebookReelThumbnail);
        
        console.log(`[ReelPublishStrategy] Uploading thumbnail to Reels video ${videoId}`);
        await facebookReelGateway.uploadReelThumbnail(
          videoId,
          pageAccessToken,
          thumbnailBuffer,
          'thumbnail.jpg'
        );
        console.log('[ReelPublishStrategy] Custom thumbnail uploaded successfully.');
      } catch (err) {
        console.error('[ReelPublishStrategy] Failed to upload custom thumbnail:', err.message);
        // Best-effort: Không làm hỏng cả luồng post nếu chỉ lỗi upload thumbnail
      }
    }

    // 3. Mời cộng tác viên (Best-effort)
    if (options.facebookReelCollaboratorId) {
      try {
        console.log(`[ReelPublishStrategy] Inviting collaborator ${options.facebookReelCollaboratorId} for video ${videoId}`);
        await facebookReelGateway.inviteReelCollaborator(
          videoId,
          options.facebookReelCollaboratorId,
          pageAccessToken
        );
        console.log('[ReelPublishStrategy] Collaborator invitation sent successfully.');
      } catch (err) {
        console.error('[ReelPublishStrategy] Failed to invite collaborator:', err.message);
        // Best-effort: Không làm hỏng cả luồng post nếu chỉ lỗi mời cộng tác viên
      }
    }

    return publishResult;
  }
}

module.exports = ReelPublishStrategy;
