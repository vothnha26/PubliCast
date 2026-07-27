const axios = require('axios');

class RedditGateway {
  constructor() {
    this.clientId = process.env.REDDIT_CLIENT_ID || 'mock_client_id';
    this.clientSecret = process.env.REDDIT_CLIENT_SECRET || 'mock_client_secret';
    this.userAgent = process.env.REDDIT_USER_AGENT || 'web:com.publicast.app:v1.0.0 (by /u/PubliCastDev)';
    this.authBaseUrl = 'https://www.reddit.com';
    this.apiBaseUrl = 'https://oauth.reddit.com';
  }

  getAuthUrl(state, redirectUri) {
    const rUri = redirectUri || process.env.REDDIT_REDIRECT_URI || 'http://localhost:5000/api/social/reddit/callback';
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      state: state || 'reddit_auth',
      redirect_uri: rUri,
      duration: 'permanent',
      scope: 'identity submit read history flair'
    });
    return `${this.authBaseUrl}/api/v1/authorize?${params.toString()}`;
  }

  async exchangeCode(code, redirectUri) {
    const rUri = redirectUri || process.env.REDDIT_REDIRECT_URI || 'http://localhost:5000/api/social/reddit/callback';
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: rUri
    });

    const response = await axios.post(`${this.authBaseUrl}/api/v1/access_token`, params.toString(), {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'User-Agent': this.userAgent,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (response.data?.error) {
      throw new Error(`Reddit token exchange error: ${response.data.error}`);
    }

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in,
      scope: response.data.scope
    };
  }

  async refreshAccessToken(refreshToken) {
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    });

    const response = await axios.post(`${this.authBaseUrl}/api/v1/access_token`, params.toString(), {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'User-Agent': this.userAgent,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (response.data?.error) {
      throw new Error(`Reddit token refresh error: ${response.data.error}`);
    }

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token || refreshToken,
      expiresIn: response.data.expires_in
    };
  }

  createClient(accessToken) {
    const client = axios.create({
      baseURL: this.apiBaseUrl,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': this.userAgent,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    // Rate limit handling interceptor
    client.interceptors.response.use(
      (res) => res,
      async (error) => {
        if (error.response?.status === 429) {
          const retryAfter = parseInt(error.response.headers['retry-after'] || '5', 10);
          await new Promise(r => setTimeout(r, (retryAfter + 1) * 1000));
          return client.request(error.config);
        }
        return Promise.reject(error);
      }
    );

    return client;
  }

  async getMe(client) {
    const response = await client.get('/api/v1/me');
    const data = response.data;
    return {
      id: data.id,
      name: data.name,
      username: data.name,
      displayName: data.name,
      linkKarma: data.link_karma || 0,
      commentKarma: data.comment_karma || 0,
      iconImg: data.icon_img || ''
    };
  }

  async getUserSubreddits(client) {
    const response = await client.get('/subreddits/mine/subscriber?limit=100');
    const children = response.data?.data?.children || [];
    return children.map(item => ({
      name: item.data.display_name,
      title: item.data.title,
      iconUrl: item.data.icon_img || item.data.community_icon || '',
      subscribers: item.data.subscribers,
      over18: item.data.over18
    }));
  }

  async searchSubreddits(client, query) {
    const response = await client.get(`/subreddits/search?q=${encodeURIComponent(query)}&limit=25`);
    const children = response.data?.data?.children || [];
    return children.map(item => ({
      name: item.data.display_name,
      title: item.data.title,
      iconUrl: item.data.icon_img || item.data.community_icon || '',
      subscribers: item.data.subscribers,
      over18: item.data.over18
    }));
  }

  async getSubredditFlairs(client, subreddit) {
    const response = await client.get(`/r/${subreddit}/api/link_flairs`);
    const flairs = response.data || [];
    return flairs.map(f => ({
      id: f.id,
      text: f.text,
      cssClass: f.css_class || '',
      textColor: f.text_color || 'dark'
    }));
  }

  async submitPost(client, { subreddit, title, kind, text, url, flairId, isNsfw, isSpoiler }) {
    const params = new URLSearchParams({
      api_type: 'json',
      sr: subreddit,
      kind, // 'self', 'link', 'image', 'video'
      title,
      text: text || '',
      url: url || '',
      nsfw: String(!!isNsfw),
      spoiler: String(!!isSpoiler)
    });

    if (flairId) params.append('flair_id', flairId);

    const response = await client.post('/api/submit', params.toString());
    const json = response.data?.json || {};

    if (json.errors && json.errors.length > 0) {
      throw new Error(`Reddit publish failed: ${JSON.stringify(json.errors)}`);
    }

    return {
      id: json.data?.id || `t3_${Date.now()}`,
      url: json.data?.url || `https://reddit.com/r/${subreddit}`
    };
  }

  async uploadMediaAsset(client, fileBuffer, fileName, mimeType) {
    // Step 1: Request S3 Upload Lease
    const leaseParams = new URLSearchParams({ filepath: fileName, mimetype: mimeType });
    const leaseRes = await client.post('/api/media/asset.json', leaseParams.toString());
    const { args, asset } = leaseRes.data;

    // Step 2: Upload to AWS S3 (Form Data fields MUST be first, file MUST be last)
    const FormData = require('form-data');
    const formData = new FormData();
    for (const field of args.fields) {
      formData.append(field.name, field.value);
    }
    formData.append('file', fileBuffer, { filename: fileName, contentType: mimeType });

    const s3Url = args.action.startsWith('//') ? `https:${args.action}` : args.action;
    await axios.post(s3Url, formData, { headers: formData.getHeaders() });

    const s3Key = args.fields.find(f => f.name === 'key')?.value;
    return {
      assetId: asset.asset_id,
      mediaUrl: `${s3Url}/${s3Key}`
    };
  }
}

module.exports = new RedditGateway();
