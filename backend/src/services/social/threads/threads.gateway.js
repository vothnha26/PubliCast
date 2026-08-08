const { API_VERSIONS } = require('../../../utils/constants');
const { THREADS_MEDIA_TYPE } = require('./threads.constants');
const logger = require('../../../utils/logger');

class ThreadsGateway {
  constructor() {
    this.appId = process.env.THREADS_APP_ID || process.env.FACEBOOK_APP_ID;
    this.appSecret = process.env.THREADS_APP_SECRET || process.env.FACEBOOK_APP_SECRET;
    // Threads API endpoints
    this.graphBaseUrl = 'https://graph.threads.net/v1.0';
    this.authBaseUrl = 'https://graph.threads.net';
  }

  getAuthUrl(brandId, redirectUri) {
    const scope = 'threads_basic,threads_content_publish,threads_delete,threads_manage_replies,threads_read_replies,threads_manage_insights';
    return `https://threads.net/oauth/authorize?client_id=${this.appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code&state=${brandId}`;
  }

  async exchangeCodeForToken(code, redirectUri) {
    const url = `${this.authBaseUrl}/oauth/access_token`;
    const params = new URLSearchParams({
      client_id: this.appId,
      client_secret: this.appSecret,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code: code
    });

    const res = await fetch(url, {
      method: 'POST',
      body: params,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error_message || 'Failed to exchange Threads code for access token');
    }

    return res.json();
  }

  async getLongLivedToken(shortLivedToken) {
    const url = `${this.authBaseUrl}/access_token?grant_type=th_exchange_token&client_secret=${this.appSecret}&access_token=${shortLivedToken}`;
    
    const res = await fetch(url);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'Failed to exchange Threads short-lived token for long-lived token');
    }

    return res.json();
  }

  async getAccountDetails(accessToken) {
    const url = `${this.graphBaseUrl}/me?fields=id,username,name,threads_profile_picture_url,threads_biography&access_token=${accessToken}`;
    
    const res = await fetch(url);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'Failed to fetch Threads user profile');
    }

    return res.json();
  }

  async getMediaDetails(mediaId, accessToken) {
    const url = `${this.graphBaseUrl}/${mediaId}?fields=id,media_product_type,media_type,media_url,thumbnail_url,permalink,text,timestamp,username,like_count,reply_count,repost_count,quote_count,children{id,media_type,media_url,thumbnail_url}&access_token=${accessToken}`;
    const res = await fetch(url);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Failed to fetch Threads media details for ${mediaId}`);
    }
    return res.json();
  }

  async getMediaInsights(mediaId, accessToken, metrics = ['views', 'likes', 'replies', 'reposts', 'quotes']) {
    const metricStr = Array.isArray(metrics) ? metrics.join(',') : metrics;
    const url = `${this.graphBaseUrl}/${mediaId}/insights?metric=${metricStr}&access_token=${accessToken}`;
    const res = await fetch(url);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Failed to fetch Threads media insights for ${mediaId}`);
    }
    return res.json();
  }

  async getInsights(userId, accessToken) {
    // Threads Insights API
    const url = `${this.graphBaseUrl}/${userId}/threads_insights?metric=views,likes,replies,reposts,followers_count&access_token=${accessToken}`;
    const res = await fetch(url);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'Failed to fetch Threads insights');
    }
    return res.json();
  }

  async getThreadsMediaFeed(userId, accessToken, pageToken = null, limit = 10) {
    let url = `${this.graphBaseUrl}/${userId}/threads?fields=id,media_product_type,media_type,media_url,thumbnail_url,permalink,text,timestamp,username,like_count,reply_count,repost_count,quote_count,children{id,media_type,media_url,thumbnail_url}&access_token=${accessToken}&limit=${limit}`;
    if (pageToken) {
      url += `&after=${pageToken}`;
    }

    const res = await fetch(url);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'Failed to fetch Threads user media feed');
    }

    const result = await res.json();
    return {
      data: result.data || [],
      nextPageToken: result.paging?.cursors?.after || null,
      prevPageToken: result.paging?.cursors?.before || null
    };
  }

  async createMediaContainer(userId, accessToken, text, mediaUrl = null, mediaType = THREADS_MEDIA_TYPE.TEXT, whoCanReply = null, replyToId = null) {
    let url = `${this.graphBaseUrl}/${userId}/threads?media_type=${mediaType}&text=${encodeURIComponent(text)}&access_token=${accessToken}`;
    if (mediaUrl) {
      if (mediaType === THREADS_MEDIA_TYPE.VIDEO) {
        url += `&video_url=${encodeURIComponent(mediaUrl)}`;
      } else {
        url += `&image_url=${encodeURIComponent(mediaUrl)}`;
      }
    }
    if (whoCanReply) {
      url += `&who_can_reply=${encodeURIComponent(whoCanReply)}`;
    }
    if (replyToId) {
      url += `&reply_to_id=${encodeURIComponent(replyToId)}`;
    }

    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error('[ThreadsGateway] createMediaContainer FAILED:', JSON.stringify(errData, null, 2));
      throw new Error(errData.error?.message || 'Failed to create Threads media container');
    }
    return res.json();
  }

  async getContainerStatus(accessToken, containerId) {
    const url = `${this.graphBaseUrl}/${containerId}?fields=status,error_message&access_token=${accessToken}`;
    const res = await fetch(url);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error('[ThreadsGateway] getContainerStatus FAILED:', JSON.stringify(errData, null, 2));
      throw new Error(errData.error?.message || `Failed to fetch container status for ${containerId}`);
    }
    return res.json();
  }

  async publishMediaContainer(userId, accessToken, containerId) {
    const url = `${this.graphBaseUrl}/${userId}/threads_publish?creation_id=${containerId}&access_token=${accessToken}`;
    
    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error('[ThreadsGateway] publishMediaContainer FAILED:', JSON.stringify(errData, null, 2));
      throw new Error(errData.error?.message || 'Failed to publish Threads media container');
    }
    return res.json();
  }

  async deletePost(mediaId, accessToken) {
    const url = `${this.graphBaseUrl}/${mediaId}?access_token=${accessToken}`;
    logger.debug(`[Threads Gateway] Sending DELETE request to URL: ${this.graphBaseUrl}/${mediaId} (token length: ${accessToken ? accessToken.length : 0})`);
    
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error(`[Threads Gateway] DELETE request failed with status ${res.status}. Error details:`, errData);
      throw new Error(errData.error?.message || 'Failed to delete Threads post');
    }
    const data = await res.json();
    logger.debug(`[Threads Gateway] DELETE request succeeded. Response:`, data);
    return data;
  }

  async createComment(userId, accessToken, parentPostId, text) {
    const url = `${this.graphBaseUrl}/${userId}/threads?media_type=TEXT&text=${encodeURIComponent(text)}&reply_to_post_id=${parentPostId}&access_token=${accessToken}`;
    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'Failed to create Threads reply container');
    }
    const container = await res.json();
    
    // Publish reply container
    const publishUrl = `${this.graphBaseUrl}/${userId}/threads_publish?creation_id=${container.id}&access_token=${accessToken}`;
    const publishRes = await fetch(publishUrl, { method: 'POST' });
    if (!publishRes.ok) {
      const errData = await publishRes.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'Failed to publish Threads reply container');
    }
    return publishRes.json();
  }
}

module.exports = new ThreadsGateway();
