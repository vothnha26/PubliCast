const fs = require('fs');
const { ERROR_CODES, DEFAULT_RETRY_AFTER_SECONDS } = require('../../../config/facebook-reel.constants');
const defaultFacebookGateway = require('./facebook.gateway');

/**
 * FacebookRateLimitError
 * Class lỗi chuyên biệt khi vượt quá giới hạn tần suất (Rate Limit) của Meta API.
 */
class FacebookRateLimitError extends Error {
  constructor(messageOrError, retryAfterSeconds = DEFAULT_RETRY_AFTER_SECONDS, metadata = {}) {
    if (messageOrError && typeof messageOrError === 'object') {
      const err = messageOrError;
      const response = err.response || {};
      const data = response.data || {};
      const errorMsg = data.error?.message || err.message || 'Rate limit exceeded';
      
      super(errorMsg);
      this.name = 'FacebookRateLimitError';
      
      let parsedRetry = DEFAULT_RETRY_AFTER_SECONDS;
      const headers = response.headers || {};
      const retryHeader = headers['retry-after'] || headers['Retry-After'];
      if (retryHeader) {
        const parsed = parseInt(retryHeader, 10);
        if (!isNaN(parsed)) parsedRetry = parsed;
      }
      
      this.retryAfterSeconds = parsedRetry;
      this.metadata = data.error || {};
      
      // Parse app usage
      const appUsage = headers['x-app-usage'] || headers['x-page-usage'];
      if (appUsage) {
        try {
          this.rateLimitInfo = JSON.parse(appUsage);
        } catch (e) {
          // ignore
        }
      }
    } else {
      super(messageOrError);
      this.name = 'FacebookRateLimitError';
      this.retryAfterSeconds = retryAfterSeconds;
      this.metadata = metadata;
    }
  }
}

/**
 * FacebookReelGateway
 * Gateway kết nối tới Meta Graph API chuyên biệt cho Facebook Reels.
 * Sử dụng Constructor Injection để nhận facebookGateway (lớp cha/chung).
 */
class FacebookReelGateway {
  constructor(facebookGateway = defaultFacebookGateway) {
    this.facebookGateway = facebookGateway;
  }

  get graphBaseUrl() {
    return this.facebookGateway.graphBaseUrl;
  }

  /**
   * _handleResponse
   * Xử lý HTTP response từ Meta API, phát hiện lỗi Rate Limit và ném FacebookRateLimitError.
   */
  async _handleResponse(res, context = '') {
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const code = errData.error?.code;
      const message = errData.error?.message || `Failed in Facebook Reels Gateway: ${context}`;

      if (ERROR_CODES.RATE_LIMIT.includes(code)) {
        let retryAfter = DEFAULT_RETRY_AFTER_SECONDS;
        const retryAfterHeader = res.headers.get('retry-after');
        if (retryAfterHeader) {
          const parsed = parseInt(retryAfterHeader, 10);
          if (!isNaN(parsed)) retryAfter = parsed;
        }
        throw new FacebookRateLimitError(message, retryAfter, errData.error);
      }
      throw new Error(message);
    }
    return res.json();
  }

  /**
   * publishReel
   * Đăng Reels bằng quy trình 3 bước (Start -> Upload -> Finish).
   */
  async publishReel(pageId, pageAccessToken, mediaUrl, caption, options = {}) {
    // Bước 1: Khởi tạo phiên tải lên (Start Phase)
    const startUrl = `${this.graphBaseUrl}/${pageId}/video_reels`;
    const startFormData = new FormData();
    startFormData.append('upload_phase', 'start');
    startFormData.append('access_token', pageAccessToken);

    const startRes = await global.fetch(startUrl, {
      method: 'POST',
      body: startFormData
    });
    const startData = await this._handleResponse(startRes, 'Start upload session');
    const { video_id: videoId, upload_url: uploadUrl } = startData;

    // Bước 2: Tải video lên (Upload Phase)
    if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
      // Hosted URL upload
      const uploadRes = await global.fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `OAuth ${pageAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ file_url: mediaUrl })
      });
      await this._handleResponse(uploadRes, 'Upload video from hosted URL');
    } else {
      // Local binary upload
      const stats = fs.statSync(mediaUrl);
      const buffer = fs.readFileSync(mediaUrl);
      const uploadRes = await global.fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `OAuth ${pageAccessToken}`,
          'offset': '0',
          'file_size': stats.size.toString(),
          'Content-Type': 'application/octet-stream'
        },
        body: buffer
      });
      await this._handleResponse(uploadRes, 'Upload local video binary');
    }

    // Bước 3: Đăng thước phim (Finish Phase)
    const finishUrl = `${this.graphBaseUrl}/${pageId}/video_reels`;
    const finishFormData = new FormData();
    finishFormData.append('upload_phase', 'finish');
    finishFormData.append('access_token', pageAccessToken);
    finishFormData.append('video_id', videoId);
    finishFormData.append('video_state', 'PUBLISHED');
    if (caption) {
      finishFormData.append('description', caption);
    }
    if (options.placeId) {
      finishFormData.append('place', options.placeId);
    }

    const finishRes = await global.fetch(finishUrl, {
      method: 'POST',
      body: finishFormData
    });
    await this._handleResponse(finishRes, 'Finish publishing Reel');

    return { id: videoId, success: true };
  }

  /**
   * uploadReelThumbnail
   * Đăng ảnh bìa tùy chỉnh (Custom Thumbnail) cho thước phim.
   */
  async uploadReelThumbnail(videoId, pageAccessToken, thumbnailBuffer, filename = 'thumbnail.jpg') {
    const url = `${this.graphBaseUrl}/${videoId}/thumbnails`;
    const formData = new FormData();
    formData.append('access_token', pageAccessToken);
    formData.append('is_preferred', 'true');

    const blob = new Blob([thumbnailBuffer]);
    formData.append('source', blob, filename);

    const res = await global.fetch(url, {
      method: 'POST',
      body: formData
    });
    return this._handleResponse(res, 'Upload Reel thumbnail');
  }

  /**
   * inviteReelCollaborator
   * Mời cộng tác viên đăng thước phim.
   */
  async inviteReelCollaborator(videoId, collaboratorPageId, pageAccessToken) {
    const url = `${this.graphBaseUrl}/${videoId}/collaborators?target_id=${collaboratorPageId}&access_token=${pageAccessToken}`;
    const res = await global.fetch(url, {
      method: 'POST'
    });
    return this._handleResponse(res, 'Invite collaborator');
  }

  /**
   * checkReelCopyrightStatus
   * Truy xuất thông tin kiểm tra bản quyền trên Reels.
   */
  async checkReelCopyrightStatus(videoId, pageAccessToken) {
    const url = `${this.graphBaseUrl}/${videoId}?fields=copyright_check_information&access_token=${pageAccessToken}`;
    const res = await global.fetch(url, {
      method: 'GET'
    });
    return this._handleResponse(res, 'Check copyright status');
  }

  /**
   * getReelVideoInsights
   * Lấy số liệu phân tích Reel (blue_reels_play_count, fb_reels_replay_count).
   */
  async getReelVideoInsights(videoId, pageAccessToken) {
    const url = `${this.graphBaseUrl}/${videoId}/video_insights?metric=blue_reels_play_count,fb_reels_replay_count&access_token=${pageAccessToken}`;
    const res = await global.fetch(url, {
      method: 'GET'
    });
    return this._handleResponse(res, 'Get Reel insights');
  }
}

// Khởi tạo instance mặc định (singleton) cho ứng dụng
const gatewayInstance = new FacebookReelGateway();
gatewayInstance.FacebookReelGateway = FacebookReelGateway;
gatewayInstance.FacebookRateLimitError = FacebookRateLimitError;

module.exports = gatewayInstance;
