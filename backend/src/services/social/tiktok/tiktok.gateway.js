const fs = require('fs');
const path = require('path');
const { API_VERSIONS, TIKTOK_API } = require('../../../utils/constants');
const { isRemoteUrl } = require('../../../utils/url.utils');
const { downloadBufferSafely } = require('../../../utils/network-security');

// Matches the 100MB upload limit enforced elsewhere (upload.middleware.js).
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

class TikTokGateway {
  constructor() {
    this.clientKey = process.env.TIKTOK_CLIENT_KEY;
    this.clientSecret = process.env.TIKTOK_CLIENT_SECRET;
    this.apiBaseUrl = TIKTOK_API.BASE_URL;
    this.authBaseUrl = TIKTOK_API.AUTH_URL;
    this.version = API_VERSIONS.TIKTOK;
  }

  /**
   * Get Auth URL for TikTok OAuth 2.0
   */
  getAuthUrl(scopes, state, redirectUri, codeChallenge) {
    const scopeString = encodeURIComponent(scopes.join(','));
    const encodedRedirect = encodeURIComponent(redirectUri);
    
    // Authorization MUST go to www.tiktok.com, not open.tiktokapis.com
    let url = `${this.authBaseUrl}?client_key=${this.clientKey}&scope=${scopeString}&response_type=code&redirect_uri=${encodedRedirect}&state=${state}`;
    if (codeChallenge) {
      url += `&code_challenge=${codeChallenge}&code_challenge_method=S256`;
    }
    return url;
  }

  /**
   * Exchange Code for Access Token
   */
  async exchangeCodeForToken(code, redirectUri, codeVerifier) {
    const url = `${this.apiBaseUrl}/v2/oauth/token/`;
    const params = new URLSearchParams();
    params.append('client_key', this.clientKey);
    params.append('client_secret', this.clientSecret);
    params.append('code', code);
    params.append('grant_type', 'authorization_code');
    params.append('redirect_uri', redirectUri);
    if (codeVerifier) {
      params.append('code_verifier', codeVerifier);
    }

    console.log(`[TikTok OAuth] Exchanging code for token...`);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('[TikTok OAuth] Token Exchange Failed:', JSON.stringify(data));
      throw new Error(data.error_description || data.message || 'Failed to exchange TikTok code');
    }

    return data;
  }

  /**
   * Refresh TikTok Access Token
   */
  async refreshAccessToken(refreshToken) {
    const url = `${this.apiBaseUrl}/v2/oauth/token/`;
    const params = new URLSearchParams();
    params.append('client_key', this.clientKey);
    params.append('client_secret', this.clientSecret);
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refreshToken);

    console.log(`[TikTok OAuth] Refreshing access token...`);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('[TikTok OAuth] Token Refresh Failed:', JSON.stringify(data));
      const err = new Error(data.error_description || data.message || 'Failed to refresh TikTok access token');
      // Preserved so callers can tell "the refresh_token itself was revoked/
      // already used" (invalid_grant — TikTok rotates refresh tokens on every
      // use, see #62) apart from a transient network/5xx failure.
      err.code = data.error || null;
      throw err;
    }

    return data;
  }

  async getUserInfo(accessToken) {
    // Request basic info AND statistics
    const fields = [
      'open_id', 
      'union_id', 
      'avatar_url', 
      'display_name',
      'follower_count',
      'following_count',
      'likes_count',
      'video_count'
    ].join(',');
    
    const url = `${this.apiBaseUrl}/v2/user/info/?fields=${fields}`;
    
    console.log(`[TikTok OAuth] Fetching user info with stats...`);
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    const data = await res.json().catch(() => ({}));
    
    if (!res.ok) {
      console.error(`[TikTok OAuth] User Info Failed (Status ${res.status}):`, JSON.stringify(data));
      const errMsg = data.error?.message || data.message || 'Failed to fetch TikTok user info';
      const err = new Error(errMsg);
      err.status = res.status;
      err.code = data.error?.code;
      throw err;
    }

    return data.data?.user;
  }

  /**
   * Get Creator Info to check allowed features (privacy levels, etc.)
   */
  async getCreatorInfo(accessToken) {
    const url = `${this.apiBaseUrl}/v2/post/publish/creator_info/query/`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn('[TikTok Gateway] Failed to fetch Creator Info:', JSON.stringify(data));
      return null;
    }
    return data.data;
  }

  /**
   * Post Video to TikTok
   * Automatically handles FILE_UPLOAD (recommended for local files/non-verified domains)
   */
  async publishVideo(accessToken, filePath, title) {
    const videoBuffer = await this._getVideoBuffer(filePath);
    const videoSize = videoBuffer.length;

    console.log(`[TikTok Gateway] Initializing FILE_UPLOAD for video (${videoSize} bytes)`);

    let privacyLevel = 'PUBLIC_TO_EVERYONE';

    // Optional: Check creator info for allowed features
    const creatorInfo = await this.getCreatorInfo(accessToken);
    if (creatorInfo) {
      const allowedPrivacy = creatorInfo.privacy_level_options || [];
      console.log(`[TikTok Gateway] Creator Info: Max Video Duration: ${creatorInfo.max_video_post_duration_sec}s, Allowed Privacy: ${allowedPrivacy.join(', ')}`);
      
      if (!allowedPrivacy.includes('PUBLIC_TO_EVERYONE') && allowedPrivacy.includes('SELF_ONLY')) {
        privacyLevel = 'SELF_ONLY';
      }
    }

    // Step 1: Initialize upload
    const initUrl = `${this.apiBaseUrl}/v2/post/publish/video/init/`;
    
    const makeInitRequest = async (currentPrivacy) => {
      return await fetch(initUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          post_info: {
            title: title,
            privacy_level: currentPrivacy,
            disable_duet: false,
            disable_stitch: false,
            disable_comment: false
          },
          source_info: {
            source: 'FILE_UPLOAD',
            video_size: videoSize,
            chunk_size: videoSize,
            total_chunk_count: 1
          }
        })
      });
    };

    let initRes = await makeInitRequest(privacyLevel);
    let initData = await initRes.json().catch(() => ({}));

    // Handle unaudited client error
    if (!initRes.ok && initData.error?.code === 'unaudited_client_can_only_post_to_private_accounts') {
      console.warn(`[TikTok Gateway] Client is unaudited. This error usually means your TikTok account MUST be set to "Private Account" in the TikTok app settings AND the video must be "SELF_ONLY". Trying fallback to SELF_ONLY...`);
      
      privacyLevel = 'SELF_ONLY';
      initRes = await makeInitRequest(privacyLevel);
      initData = await initRes.json().catch(() => ({}));
      
      if (!initRes.ok && initData.error?.code === 'unaudited_client_can_only_post_to_private_accounts') {
        throw new Error('TikTok API Restriction: Unaudited apps can only post to TikTok accounts that are set to "Private Account" in TikTok settings. Please switch your TikTok account to Private to continue testing.');
      }
    }

    if (!initRes.ok) {
      console.error('[TikTok Gateway] Init Failed:', JSON.stringify(initData));
      throw new Error(initData.error?.message || 'Failed to initialize TikTok video upload');
    }

    const { publish_id, upload_url } = initData.data;

    // Step 2: Upload Video Binary
    console.log(`[TikTok Gateway] Uploading binary to ${upload_url}`);
    const uploadRes = await fetch(upload_url, {
      method: 'PUT',
      headers: {
        'Content-Range': `bytes 0-${videoSize - 1}/${videoSize}`,
        'Content-Type': 'video/mp4'
      },
      body: videoBuffer
    });

    if (!uploadRes.ok) {
      const uploadErr = await uploadRes.text();
      console.error('[TikTok Gateway] Binary Upload Failed:', uploadErr);
      throw new Error('Failed to upload video binary to TikTok');
    }

    console.log(`[TikTok Gateway] Upload successful. Publish ID: ${publish_id} (Privacy: ${privacyLevel})`);
    return { publish_id, privacy_level: privacyLevel };
  }

  /**
   * Get Published Videos
   */
  async getVideoList(accessToken, cursor = 0, maxCount = 20) {
    const fields = [
      'id', 'create_time', 'cover_image_url', 'share_url',
      'video_description', 'duration', 'title',
      'like_count', 'comment_count', 'share_count', 'view_count'
    ].join(',');

    const url = `${this.apiBaseUrl}/v2/video/list/?fields=${fields}`;

    // TikTok's video/list endpoint rejects max_count outside [1, 20]
    // (invalid_params) — callers upstream (e.g. inbox.service.js's
    // cross-platform post fetch, which uses one shared limit=50 for every
    // platform) can't know that per-platform cap, so enforce it here at the
    // API boundary instead of silently failing every TikTok fetch.
    const clampedMaxCount = Math.min(Math.max(1, parseInt(maxCount) || 20), 20);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        max_count: clampedMaxCount,
        cursor: cursor
      })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('[TikTok Gateway] Get Video List Failed:', JSON.stringify(data));
      const errMsg = data.error?.message || data.message || 'Failed to fetch TikTok videos';
      const err = new Error(errMsg);
      err.status = res.status;
      err.code = data.error?.code;
      throw err;
    }

    return data.data; // returns { videos: [...], cursor: number, has_more: boolean }
  }

  /**
   * Query Video Comments / Comment Replies from TikTok Research API v2
   */
  async getVideoComments(accessToken, { videoId = null, commentId = null, maxCount = 10, cursor = 0 } = {}) {
    if (!videoId && !commentId) {
      throw new Error('Either videoId or commentId must be provided to query TikTok comments');
    }

    const fields = [
      'id', 'video_id', 'text', 'like_count',
      'reply_count', 'parent_comment_id', 'create_time'
    ].join(',');

    const url = `${this.apiBaseUrl}/v2/research/video/comment/list/?fields=${encodeURIComponent(fields)}`;

    const body = {
      max_count: Math.min(Math.max(1, parseInt(maxCount) || 10), 100),
      cursor: parseInt(cursor) || 0
    };

    if (videoId) {
      body.video_id = typeof videoId === 'number' ? videoId : (Number(videoId) || videoId);
    } else {
      body.comment_id = typeof commentId === 'number' ? commentId : (Number(commentId) || commentId);
    }

    console.log(`[TikTok Gateway] Querying video comments (${videoId ? `video_id: ${videoId}` : `comment_id: ${commentId}`})...`);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('[TikTok Gateway] Query Comments Failed:', JSON.stringify(data));
      const errMsg = data.error?.message || data.message || 'Failed to fetch TikTok comments';
      const err = new Error(errMsg);
      err.status = res.status;
      err.code = data.error?.code;
      throw err;
    }

    return data.data; // returns { comments: [...], cursor: number, has_more: boolean }
  }

  // ============= Private Helper Methods =============

  /**
   * Lấy Buffer video từ mediaUrl — hỗ trợ cả local path lẫn remote URL (Cloudinary...).
   * TikTok's FILE_UPLOAD protocol cần biết video_size CHÍNH XÁC trước khi gọi init
   * request, nên không thể dùng streaming kiểu YouTube ở đây — phải buffer trước.
   */
  async _getVideoBuffer(mediaUrl) {
    if (isRemoteUrl(mediaUrl)) {
      // mediaUrl is user-supplied (post content), and this fetch runs
      // server-side with no host allow-list — a bare fetch() let an
      // attacker point it at internal/link-local addresses (e.g. the cloud
      // metadata endpoint 169.254.169.254 or localhost services) and have
      // the response uploaded to TikTok as if it were a video, exfiltrating
      // whatever was there (#96). downloadBufferSafely rejects private/
      // loopback/link-local IPs (including at the DNS-rebinding level) and
      // caps the size the same way image downloads already do elsewhere.
      return downloadBufferSafely(mediaUrl, MAX_VIDEO_BYTES);
    }
    const localPath = this._resolveLocalPath(mediaUrl);
    return fs.readFileSync(localPath);
  }

  _resolveLocalPath(mediaUrl) {
    if (!mediaUrl) throw new Error('Media URL is required');

    // Nếu đã là absolute path và tồn tại
    if (fs.existsSync(mediaUrl)) return mediaUrl;

    // Nếu là relative path (bắt đầu bằng /) thì join với process.cwd() (thư mục gốc backend)
    const cleanPath = mediaUrl.startsWith('/') ? mediaUrl.substring(1) : mediaUrl;
    const localPath = path.join(process.cwd(), cleanPath);
    
    if (!fs.existsSync(localPath)) {
      // Fallback: thử join với __dirname (vị trí file gateway)
      const altPath = path.join(__dirname, '../../../../', cleanPath);
      if (fs.existsSync(altPath)) return altPath;
      throw new Error(`Media file not found. Tried:\n  - ${localPath}\n  - ${altPath}`);
    }
    return localPath;
  }
}

module.exports = new TikTokGateway();
