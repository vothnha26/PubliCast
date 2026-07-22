const fs = require('fs');
const path = require('path');

class LinkedInGateway {
  constructor() {
    this.clientId = process.env.LINKEDIN_CLIENT_ID || 'mock_linkedin_client_id';
    this.clientSecret = process.env.LINKEDIN_CLIENT_SECRET || 'mock_linkedin_client_secret';
    this.apiBaseUrl = 'https://api.linkedin.com/v2';
    this.authBaseUrl = 'https://www.linkedin.com/oauth/v2/authorization';
  }

  /**
   * Sinh Link OAuth 2.0 cho LinkedIn
   */
  getAuthUrl(state, redirectUri) {
    const scopes = ['w_member_social', 'profile', 'openid', 'email'].join(' ');
    const encodedRedirect = encodeURIComponent(redirectUri);
    const encodedScope = encodeURIComponent(scopes);
    return `${this.authBaseUrl}?response_type=code&client_id=${this.clientId}&redirect_uri=${encodedRedirect}&state=${state}&scope=${encodedScope}`;
  }

  /**
   * Đổi Authorization Code lấy Access Token
   */
  async exchangeCodeForToken(code, redirectUri) {
    if (code.startsWith('mock-')) {
      return {
        access_token: `mock-linkedin-token-${Date.now()}`,
        expires_in: 5184000, // 60 ngày
        scope: 'w_member_social profile openid email'
      };
    }

    const url = 'https://www.linkedin.com/oauth/v2/accessToken';
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', redirectUri);
    params.append('client_id', this.clientId);
    params.append('client_secret', this.clientSecret);

    console.log(`[LinkedIn OAuth] Exchanging code for token...`);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('[LinkedIn OAuth] Token Exchange Failed:', JSON.stringify(data));
      throw new Error(data.error_description || data.message || 'Failed to exchange LinkedIn code');
    }

    return data;
  }

  /**
   * Lấy thông tin cá nhân của User (đáp ứng API LinkedIn mới /v2/userinfo hoặc /v2/me)
   */
  async getMemberProfile(accessToken) {
    if (accessToken.startsWith('mock-')) {
      return {
        id: 'mock-linkedin-id-123',
        localizedFirstName: 'Mock',
        localizedLastName: 'LinkedIn User',
        displayName: 'Mock LinkedIn User',
        profilePictureUrl: 'https://images.unsplash.com/photo-1579389083078-4e7018379f7e?w=150&auto=format&fit=crop&q=60',
        followersCount: 1250,
        connectionsCount: 450,
        industry: 'Information Technology & Services'
      };
    }

    // Gửi request lấy user info từ LinkedIn UserInfo Endpoint (OpenID Connect)
    const url = 'https://api.linkedin.com/v2/userinfo';
    console.log(`[LinkedIn Gateway] Fetching profile info...`);
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(`[LinkedIn Gateway] Fetch Profile Failed:`, JSON.stringify(data));
      throw new Error(data.message || 'Failed to fetch LinkedIn member profile');
    }

    // Map dữ liệu LinkedIn OpenID Connect sang chuẩn chung
    return {
      id: data.sub, // 'sub' là user ID trong OpenID Connect
      displayName: data.name,
      profilePictureUrl: data.picture || '',
      followersCount: 850, // default/mock value vì API LinkedIn cơ bản không trả về số followers ngay
      connectionsCount: 200,
      industry: 'Technology'
    };
  }

  /**
   * Đăng bài viết lên LinkedIn (Văn bản / Ảnh / Video)
   */
  async createPost(accessToken, memberId, postData) {
    if (accessToken.startsWith('mock-')) {
      console.log(`[LinkedIn Gateway] [MOCK] Publishing post:`, postData);
      return {
        id: `mock-linkedin-urn-share-${Date.now()}`
      };
    }

    // Chuẩn API LinkedIn: /v2/ugcPosts hoặc /v2/posts
    const url = `${this.apiBaseUrl}/posts`;
    const authorUrn = `urn:li:person:${memberId}`;
    
    // Xây dựng payload theo định dạng API LinkedIn
    const payload = {
      author: authorUrn,
      commentary: postData.caption,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: []
      }
    };

    if (postData.mediaUrl) {
      // Real media posting requires registering an upload (POST
      // /assets?action=registerUpload) and PUTting the binary to the
      // returned uploadUrl to get a real asset URN — that isn't implemented
      // here. Attaching the hardcoded placeholder
      // 'urn:li:digitalmediaAsset:C5604AQFEV1249A' silently attached an
      // unrelated/invalid asset to the post (or got rejected by LinkedIn)
      // while the caller's actual media was never uploaded (#94, part B).
      // Fail loudly instead of posting with a fake asset — tracked
      // separately as a feature to implement the real Assets API flow.
      throw new Error('LinkedIn media posting is not yet implemented — cannot attach mediaUrl to a post.');
    }

    console.log(`[LinkedIn Gateway] Sending publish request...`);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'LinkedIn-Version': '202306' // LinkedIn API versioning header
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(`[LinkedIn Gateway] Publish Post Failed:`, JSON.stringify(data));
      throw new Error(data.message || 'Failed to publish post to LinkedIn');
    }

    // LinkedIn returns the created share's URN either in the x-restli-id
    // response header or in the JSON body's `id` field on every genuine
    // 2xx. If both are absent, synthesizing `urn:li:share:${Date.now()}`
    // previously let the post be marked PUBLISHED with a URN LinkedIn never
    // issued — breaking retry/delete/metric-sync afterward (#94, part A).
    const shareId = res.headers.get('x-restli-id') || data.id;
    if (!shareId) {
      throw new Error('LinkedIn publish response missing share id (x-restli-id header and body id both absent)');
    }

    return { id: shareId };
  }
}

module.exports = new LinkedInGateway();
