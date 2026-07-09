const youtubeGateway = require('./youtube.gateway');
const googleOAuthService = require('../google-oauth.service');
const socialAccountRepository = require('../../../repositories/social/social-account.repository');
const { Readable } = require('stream');

const { PLATFORMS, POST_STATUS, YOUTUBE_PRIVACY, YOUTUBE_CATEGORIES, SEPARATORS, POST_TYPES, YOUTUBE_API } = require('../../../utils/constants');
const fs = require('fs');
const path = require('path');

class YouTubePublishService {
  /**
   * Đăng tải video lên YouTube qua quy trình đa bước đã được mô-đun hóa
   */
  async publishPost(brandId, postData) {
    const { options = {}, platformPostId } = postData;

    if (platformPostId) {
      console.log(`[YouTube Publish] Video already uploaded via Native Scheduling. ID: ${platformPostId}`);
      return {
        platformVideoId: platformPostId,
        videoUrl: YOUTUBE_API.videoUrl(platformPostId),
        status: POST_STATUS.PUBLISHED,
        publishedAt: new Date()
      };
    }

    // 1. Chuẩn bị thông tin tài khoản và Auth
    const { account, auth } = await this._getAuthContext(brandId);

    if (account.accessToken && (account.accessToken.startsWith('mock-') || account.accessToken.includes('mock') || account.accessToken.startsWith('yt_mock'))) {
      console.log(`[YouTube] Mock publishing detected for mock token. Returning simulated success.`);
      return {
        platformVideoId: `mock-youtube-video-${Date.now()}`,
        videoUrl: YOUTUBE_API.videoUrl(`mock-youtube-video-${Date.now()}`),
        status: POST_STATUS.PUBLISHED,
        publishedAt: new Date()
      };
    }

    // 2. Chuẩn bị video stream (từ local hoặc URL)
    const videoStream = await this._prepareVideoStream(postData.mediaUrls);

    // 3. Xử lý Metadata & SEO (Hashtags cho Shorts, Privacy, v.v.)
    const metadata = this._prepareMetadata(postData, options);

    // 4. Thực hiện Upload chính
    console.log(`[YouTube Publish] 🚀 Uploading video to YouTube...`);
    const uploadRes = await youtubeGateway.uploadVideo(auth, videoStream, metadata);
    const videoId = uploadRes.data.id;
    console.log(`[YouTube Publish] ✅ Video uploaded successfully. ID: ${videoId}`);

    // 5. Thực hiện các tác vụ sau khi upload (Playlist, First Comment)
    await this._executePostUploadTasks(auth, videoId, options);

    return {
      platformVideoId: videoId,
      videoUrl: YOUTUBE_API.videoUrl(videoId),
      status: POST_STATUS.PUBLISHED,
      publishedAt: new Date(uploadRes.data.snippet.publishedAt)
    };
  }

  // ============= Private Helper Methods =============

  async _getAuthContext(brandId) {
    const socialAccount = await socialAccountRepository.findByBrandAndPlatform(brandId, PLATFORMS.YOUTUBE);
    if (!socialAccount || socialAccount.length === 0) {
      throw new Error('YouTube account not connected for this brand');
    }
    const account = socialAccount.find(acc => 
      !(acc.accessToken && acc.accessToken.startsWith('mock-')) &&
      !(acc.platformAccountId && acc.platformAccountId.startsWith('mock-'))
    ) || socialAccount[0];
    const auth = googleOAuthService.createClient();
    auth.setCredentials({
      access_token: account.accessToken,
      refresh_token: account.refreshToken,
      expiry_date: account.tokenExpiresAt ? account.tokenExpiresAt.getTime() : undefined
    });
    return { account, auth };
  }

  async _prepareVideoStream(mediaUrls) {
    if (!mediaUrls) throw new Error('Video URL is required');
    
    // Handle cả string (từ DB) lẫn array (từ SocialPublishStep pipeline)
    let videoUrl;
    if (Array.isArray(mediaUrls)) {
      if (mediaUrls.length === 0) throw new Error('Video URL is required');
      videoUrl = mediaUrls[0].trim();
    } else {
      videoUrl = mediaUrls.split(SEPARATORS.COMMA)[0].trim();
    }

    if (videoUrl.startsWith('http')) {
      const response = await fetch(videoUrl);
      if (!response.ok) throw new Error(`Failed to fetch video: ${videoUrl}`);
      if (response.body && typeof response.body === 'object' && typeof response.body.pipe !== 'function') {
        try {
          return Readable.fromWeb(response.body);
        } catch (e) {
          return response.body;
        }
      }
      return response.body;
    }

    const localPath = path.join(__dirname, '../../../../', videoUrl.replace(/^\//, ''));
    if (!fs.existsSync(localPath)) throw new Error(`Local file not found: ${localPath}`);
    return fs.createReadStream(localPath);
  }

  _prepareMetadata(postData, options) {
    const { title, caption, scheduledAt } = postData;
    let finalTitle = options.youtubeTitle || title || 'New YouTube Post';
    let finalDescription = caption || '';

    // Shorts Auto-Hashtag Logic
    if (options.youtubeType === POST_TYPES.SHORT.toLowerCase()) {
      if (!finalTitle.toLowerCase().includes('#shorts') && finalTitle.length <= 92) {
        finalTitle = `${finalTitle} #Shorts`;
      } else if (!finalDescription.toLowerCase().includes('#shorts')) {
        finalDescription = `${finalDescription}\n\n#Shorts`;
      }
    }

    let privacyStatus = options.privacyStatus || YOUTUBE_PRIVACY.PRIVATE;
    let publishAt = null;

    if (scheduledAt) {
      privacyStatus = YOUTUBE_PRIVACY.PRIVATE;
      publishAt = new Date(scheduledAt).toISOString();
    }

    return {
      title: finalTitle,
      description: finalDescription,
      privacyStatus,
      categoryId: options.categoryId || YOUTUBE_CATEGORIES.PEOPLE_BLOGS,
      selfDeclaredMadeForKids: options.madeForKids === true || options.madeForKids === 'true',
      tags: options.tags ? options.tags.split(SEPARATORS.COMMA).map(t => t.trim()).filter(Boolean) : [],
      publishAt
    };
  }

  async _executePostUploadTasks(auth, videoId, options) {
    // Add to Playlist
    if (options.playlistId) {
      try {
        await youtubeGateway.addVideoToPlaylist(auth, options.playlistId, videoId);
      } catch (err) {
        console.error(`[YouTube Post-Upload] Playlist failed: ${err.message}`);
      }
    }

    // Post First Comment
    if (options.firstComment?.trim()) {
      try {
        await youtubeGateway.insertCommentThread(auth, videoId, options.firstComment.trim());
      } catch (err) {
        console.error(`[YouTube Post-Upload] First comment failed: ${err.message}`);
      }
    }

    // Set Custom Thumbnail
    if (options.youtubeThumbnail) {
      try {
        const imageStream = await this._prepareImageStream(options.youtubeThumbnail);
        const ext = path.extname(options.youtubeThumbnail).toLowerCase();
        const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
        await youtubeGateway.setCustomThumbnail(auth, videoId, imageStream, mimeType);
        console.log(`[YouTube Post-Upload] Successfully set custom thumbnail for video ${videoId}`);
      } catch (err) {
        console.error(`[YouTube Post-Upload] Setting custom thumbnail failed: ${err.message}`);
      }
    }
  }

  async _prepareImageStream(imageUrl) {
    if (!imageUrl) throw new Error('Image URL is required');
    
    // imageUrl có thể là array (cần lấy phần tử đầu tiên)
    const resolvedUrl = Array.isArray(imageUrl) ? imageUrl[0] : imageUrl;
    if (!resolvedUrl) throw new Error('Image URL is required');
    
    if (resolvedUrl.startsWith('http')) {
      const response = await fetch(resolvedUrl);
      if (!response.ok) throw new Error(`Failed to fetch image: ${resolvedUrl}`);
      if (response.body && typeof response.body === 'object' && typeof response.body.pipe !== 'function') {
        try {
          return Readable.fromWeb(response.body);
        } catch (e) {
          return response.body;
        }
      }
      return response.body;
    }

    const localPath = path.join(__dirname, '../../../../', resolvedUrl.replace(/^\//, ''));
    if (!fs.existsSync(localPath)) throw new Error(`Local file not found: ${localPath}`);
    return fs.createReadStream(localPath);
  }

  async deletePost(brandId, platformPostId) {
    const { auth } = await this._getAuthContext(brandId);
    if (platformPostId && platformPostId.startsWith('mock-')) {
      return { success: true };
    }
    return await youtubeGateway.deleteVideo(auth, platformPostId);
  }
}

module.exports = new YouTubePublishService();
