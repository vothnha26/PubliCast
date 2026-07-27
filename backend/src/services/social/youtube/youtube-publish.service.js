const youtubeGateway = require('./youtube.gateway');
const googleOAuthService = require('../google-oauth.service');
const socialAccountRepository = require('../../../repositories/social/social-account.repository');
const { Readable } = require('stream');

const { PLATFORMS, POST_STATUS, YOUTUBE_PRIVACY, YOUTUBE_CATEGORIES, SEPARATORS, POST_TYPES, splitMediaUrls } = require('../../../utils/constants');
const { YOUTUBE_API, YOUTUBE_CONSTRAINTS } = require('./youtube.constants');
const { validateImageConstraints } = require('./youtube-media-validator.util');
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
      videoUrl = (splitMediaUrls(mediaUrls)[0] || '').trim();
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
    let finalTitle = options.youtubeTitle;
    let finalDescription = caption || '';

    // Logic trích xuất Title từ câu/đoạn đầu tiên của Content nếu không nhập Title riêng
    if (!finalTitle && (!title || title === 'Untitled Post' || title === 'New YouTube Post' || title.trim() === '') && caption?.trim()) {
      const trimmedCaption = caption.trim();
      const paragraphs = trimmedCaption.split(/\n+/);
      const firstParagraph = paragraphs[0]?.trim() || '';
      
      const sentenceMatch = firstParagraph.match(/^(.*?[.!?])(?:\s|$)/);
      let extractedTitle = sentenceMatch ? sentenceMatch[1].trim() : firstParagraph;
      
      if (extractedTitle.length > YOUTUBE_CONSTRAINTS.TITLE_MAX_LENGTH) {
        extractedTitle = extractedTitle.substring(0, YOUTUBE_CONSTRAINTS.TITLE_MAX_LENGTH - 3) + '...';
      }
      
      finalTitle = extractedTitle;
      
      // Phần còn lại của Caption biến thành Description
      const remainingCaption = trimmedCaption.substring(firstParagraph.length).trim();
      if (remainingCaption) {
        finalDescription = remainingCaption;
      }
    }

    if (!finalTitle) {
      finalTitle = title || 'New YouTube Post';
    }

    // Shorts Auto-Hashtag Logic
    if (options.youtubeType === POST_TYPES.SHORT.toLowerCase()) {
      if (!finalTitle.toLowerCase().includes('#shorts') && finalTitle.length <= 92) {
        finalTitle = `${finalTitle} #Shorts`;
      } else if (!finalDescription.toLowerCase().includes('#shorts')) {
        finalDescription = `${finalDescription}\n\n#Shorts`;
      }
    }

    // --- Enforce YouTube Data API v3 metadata constraints ---
    // ref: guide/youtube/reference_api/videos.md — snippet field limits
    if (finalTitle.length > YOUTUBE_CONSTRAINTS.TITLE_MAX_LENGTH) {
      console.warn(`[YouTube Metadata] Title truncated from ${finalTitle.length} to ${YOUTUBE_CONSTRAINTS.TITLE_MAX_LENGTH} chars (YouTube API limit).`);
      finalTitle = finalTitle.substring(0, YOUTUBE_CONSTRAINTS.TITLE_MAX_LENGTH);
    }

    if (finalDescription.length > YOUTUBE_CONSTRAINTS.DESCRIPTION_MAX_LENGTH) {
      console.warn(`[YouTube Metadata] Description truncated from ${finalDescription.length} to ${YOUTUBE_CONSTRAINTS.DESCRIPTION_MAX_LENGTH} chars (YouTube API limit).`);
      finalDescription = finalDescription.substring(0, YOUTUBE_CONSTRAINTS.DESCRIPTION_MAX_LENGTH);
    }

    // Build & sanitize tags array: total combined length <= 500 chars
    let tags = options.tags ? options.tags.split(SEPARATORS.COMMA).map(t => t.trim()).filter(Boolean) : [];
    let totalTagsLength = tags.join('').length;
    if (totalTagsLength > YOUTUBE_CONSTRAINTS.TAGS_MAX_TOTAL_LENGTH) {
      console.warn(`[YouTube Metadata] Tags total length (${totalTagsLength}) exceeds ${YOUTUBE_CONSTRAINTS.TAGS_MAX_TOTAL_LENGTH} chars limit. Trimming tags array.`);
      const sanitizedTags = [];
      let accumulated = 0;
      for (const tag of tags) {
        if (accumulated + tag.length > YOUTUBE_CONSTRAINTS.TAGS_MAX_TOTAL_LENGTH) break;
        sanitizedTags.push(tag);
        accumulated += tag.length;
      }
      tags = sanitizedTags;
    }

    let privacyStatus = options.privacyStatus || options.youtubePrivacy || YOUTUBE_PRIVACY.PUBLIC;
    let publishAt = null;

    // Chỉ dùng chế độ Native Future Schedule của YouTube nếu scheduledAt còn cách xa trong tương lai (> 2 phút).
    // Nếu xuất bản ngay hoặc công việc BullMQ đã tới giờ hẹn, sử dụng đúng privacyStatus (public/unlisted/private) người dùng chọn.
    const isFutureSchedule = scheduledAt && new Date(scheduledAt).getTime() > Date.now() + 2 * 60 * 1000;

    if (isFutureSchedule) {
      privacyStatus = YOUTUBE_PRIVACY.PRIVATE;
      publishAt = new Date(scheduledAt).toISOString();
    }

    return {
      title: finalTitle,
      description: finalDescription,
      privacyStatus,
      categoryId: options.categoryId || YOUTUBE_CATEGORIES.PEOPLE_BLOGS,
      selfDeclaredMadeForKids: options.madeForKids === true || options.madeForKids === 'true',
      tags,
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
        // Pre-validate thumbnail size before streaming to Google API
        // ref: guide/youtube/reference_api/thumbnails.md — max 2MB
        const { ok, error, mimeType } = await validateImageConstraints(options.youtubeThumbnail, {
          maxSizeBytes: YOUTUBE_CONSTRAINTS.THUMBNAIL_MAX_SIZE_BYTES,
          allowedMimeTypes: YOUTUBE_CONSTRAINTS.IMAGE_MIME_TYPES,
          resourceLabel: 'Thumbnail'
        });
        if (!ok) {
          throw new Error(error);
        }
        const imageStream = await this._prepareImageStream(options.youtubeThumbnail);
        await youtubeGateway.setCustomThumbnail(auth, videoId, imageStream, mimeType || 'image/jpeg');
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
