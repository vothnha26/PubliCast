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
      let errorMsg = 'Rate limit exceeded';
      let parsedRetry = retryAfterSeconds;
      let appUsageRaw = null;

      if (err.headers && typeof err.headers.get === 'function') {
        // Fetch API Response object
        errorMsg = metadata.message || metadata.error?.message || err.statusText || 'Rate limit exceeded';
        
        const retryHeader = err.headers.get('retry-after');
        if (retryHeader) {
          const parsed = parseInt(retryHeader, 10);
          if (!isNaN(parsed)) parsedRetry = parsed;
        }
        
        appUsageRaw = err.headers.get('x-app-usage') || err.headers.get('x-page-usage');
      } else {
        // Axios or generic error object
        const response = err.response || {};
        const data = response.data || {};
        errorMsg = data.error?.message || err.message || 'Rate limit exceeded';
        
        const headers = response.headers || {};
        const retryHeader = headers['retry-after'] || headers['Retry-After'];
        if (retryHeader) {
          const parsed = parseInt(retryHeader, 10);
          if (!isNaN(parsed)) parsedRetry = parsed;
        }
        
        appUsageRaw = headers['x-app-usage'] || headers['x-page-usage'];
      }

      super(errorMsg);
      this.name = 'FacebookRateLimitError';
      this.retryAfterSeconds = parsedRetry;
      this.metadata = metadata.error || metadata || {};
      
      if (appUsageRaw) {
        try {
          this.rateLimitInfo = typeof appUsageRaw === 'string' ? JSON.parse(appUsageRaw) : appUsageRaw;
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
      const rawText = await res.text().catch(() => '');
      let errData = {};
      try {
        errData = rawText ? JSON.parse(rawText) : {};
      } catch (e) {
        // Body wasn't JSON — surface it raw below so the real cause isn't lost.
      }
      const code = errData.error?.code;
      const message = errData.error?.message
        || `Failed in Facebook Reels Gateway: ${context} (HTTP ${res.status}${rawText ? `: ${rawText.slice(0, 500)}` : ''})`;

      if (ERROR_CODES.RATE_LIMIT.includes(code)) {
        let retryAfter = DEFAULT_RETRY_AFTER_SECONDS;
        const retryAfterHeader = res.headers.get('retry-after');
        if (retryAfterHeader) {
          const parsed = parseInt(retryAfterHeader, 10);
          if (!isNaN(parsed)) retryAfter = parsed;
        }
        throw new FacebookRateLimitError(res, retryAfter, errData.error || { message });
      }
      throw new Error(message);
    }
    return res.json();
  }

  /**
   * publishReel
   * Đăng Reels bằng quy trình 3 bước (Start -> Upload -> Finish).
   * @param {Object} [options]
   * @param {string} [options.placeId] Gắn địa điểm cho Reel (finish phase).
   */
  async publishReel(pageId, pageAccessToken, mediaUrl, caption, options = {}) {
    const { placeId } = options;
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
      // Hosted URL upload — per Meta's docs, file_url is passed as an HTTP
      // header (not a JSON body); offset/file_size are binary-upload-only
      // and must be omitted here, since Facebook validates whichever
      // headers are present against the binary-vs-hosted-URL mode it infers
      // from them — sending a JSON body with Content-Type: application/json
      // previously made it try (and fail) to parse a missing offset header.
      const uploadRes = await global.fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `OAuth ${pageAccessToken}`,
          'file_url': mediaUrl
        }
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
    if (placeId) {
      finishFormData.append('place', placeId);
    }

    const finishRes = await global.fetch(finishUrl, {
      method: 'POST',
      body: finishFormData
    });
    await this._handleResponse(finishRes, 'Finish publishing Reel');

    await this.facebookGateway._pollVideoStatus(videoId, pageAccessToken);

    return { id: videoId, success: true };
  }

  /**
   * uploadReelThumbnail
   * Đăng ảnh bìa tùy chỉnh (Custom Thumbnail) cho thước phim.
   * Theo Meta: gọi SAU khi Reel đã publish xong (video_state=PUBLISHED),
   * không phải trước — xem publish-strategies/reel.strategy.js. Cố tình
   * KHÔNG retry và KHÔNG verify lại bằng GET ở đây: đây vẫn là một bước
   * best-effort chạy sau khi publishReel() đã resolve, thêm round-trip sẽ
   * chỉ kéo dài thời gian job giữ BullMQ lock mà không có lợi ích tương xứng.
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
