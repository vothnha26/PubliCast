const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { PLATFORMS, SEPARATORS, API_VERSIONS, MEDIA_EXTENSIONS, FACEBOOK_API } = require('../../../utils/constants');
const logger = require('../../../utils/logger');
const { isRemoteUrl } = require('../../../utils/url.utils');

// Custom fetch wrapper with timeout and logging
const fetchWithTimeout = async (url, options = {}) => {
  const timeoutMs = options.body ? 45000 : 25000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  logger.info(`[Facebook API] Request: ${options.method || 'GET'} ${url.split('?')[0]}`);
  try {
    const res = await global.fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    logger.info(`[Facebook API] Response Status: ${res.status}`);
    return res;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      logger.error(`[Facebook API] ❌ Timeout after ${timeoutMs}ms: ${options.method || 'GET'} ${url.split('?')[0]}`);
      throw new Error(`Facebook API request timed out after ${timeoutMs}ms`);
    }
    logger.error(`[Facebook API] ❌ Failed: ${error.message}`);
    throw error;
  }
};

const fetch = fetchWithTimeout;

class FacebookInsightsError extends Error {
  constructor(message, { code = null, status = null, postId = null } = {}) {
    super(message);
    this.name = 'FacebookInsightsError';
    this.code = code;
    this.status = status;
    this.postId = postId;
  }
}

class FacebookGateway {
  constructor() {
    this.appId = process.env.FACEBOOK_APP_ID;
    this.appSecret = process.env.FACEBOOK_APP_SECRET;
    this.graphBaseUrl = `${FACEBOOK_API.GRAPH_URL}/${API_VERSIONS.FACEBOOK}`;
  }

  async exchangeCodeForToken(code, redirectUri) {
    const url = `${this.graphBaseUrl}/oauth/access_token?client_id=${this.appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${this.appSecret}&code=${code}`;
    
    const res = await fetch(url);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'Failed to exchange Facebook code for access token');
    }
    
    return res.json();
  }

  async getUserPages(userAccessToken) {
    const url = `${this.graphBaseUrl}/me/accounts?access_token=${userAccessToken}`;
    
    const res = await fetch(url);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'Failed to fetch user Facebook pages');
    }
    
    const data = await res.json();
    return data.data || [];
  }

  async getUserPermissions(userAccessToken) {
    const url = `${this.graphBaseUrl}/me/permissions?access_token=${userAccessToken}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  }

  async getPageDetails(pageId, pageAccessToken) {
    const url = `${this.graphBaseUrl}/${pageId}?fields=id,name,picture{url},category,about,website,fan_count,followers_count&access_token=${pageAccessToken}`;
    
    const res = await fetch(url);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Failed to fetch Facebook page details for ${pageId}`);
    }
    
    const data = await res.json();
    return {
      pageId: data.id,
      username: data.name,
      displayName: data.name,
      profilePictureUrl: data.picture?.data?.url || '',
      category: data.category || null,
      likesCount: data.fan_count || 0,
      followersCount: data.followers_count || 0,
      about: data.about || null,
      website: data.website || null
    };
  }

  async getPageInsights(pageId, pageAccessToken, startDate, endDate) {
    const since = Math.floor(new Date(startDate).getTime() / 1000);
    const until = Math.floor(new Date(endDate).getTime() / 1000);

    const fullMetrics = [
      'page_media_view',
      'page_total_media_view_unique',
      'page_daily_follows_unique',
      'page_daily_unfollows_unique',
      'page_post_engagements',
      'page_total_actions'
    ];

    const tryFetch = async (metricList) => {
      const url = `${this.graphBaseUrl}/${pageId}/insights?metric=${metricList.join(SEPARATORS.COMMA)}&period=day&since=${since}&until=${until}&access_token=${pageAccessToken}`;
      const res = await fetch(url);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return { error: errData.error, url };
      }
      return { data: await res.json() };
    };

    let result = await tryFetch(fullMetrics);

    if (result.error && result.error.code === 100) {
      const legacyMetrics = [
        'page_views_total',
        'page_post_engagements',
        'page_total_actions',
        'page_daily_follows_unique',
        'page_daily_unfollows_unique'
      ];
      result = await tryFetch(legacyMetrics);
    }

    if (result.error) {
      console.error(`Facebook Insights API final error: ${JSON.stringify(result.error)}.`);
      return [];
    }

    return result.data.data || [];
  }

  async getPageFeed(pageId, pageAccessToken, pageToken = null, limit = 10) {
    const fields = 'id,message,story,created_time,full_picture,permalink_url,attachments{media,type},shares,comments.summary(true),reactions.summary(true)';
    let url = `${this.graphBaseUrl}/${pageId}/feed?fields=${fields}&limit=${limit}&access_token=${pageAccessToken}`;
    if (pageToken) {
      url += `&after=${pageToken}`;
    }
    
    const res = await fetch(url);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'Failed to fetch Facebook page feed');
    }

    const data = await res.json();
    return {
      data: data.data || [],
      nextPageToken: data.paging?.cursors?.after || null,
      prevPageToken: data.paging?.cursors?.before || null
    };
  }

  async getPageStories(pageId, pageAccessToken) {
    const url = `${this.graphBaseUrl}/${pageId}/stories?fields=id,media_type,media_url,creation_time,status&access_token=${pageAccessToken}`;
    const res = await fetch(url);
    if (!res.ok) {
      return [];
    }
    const data = await res.json();
    return data.data || [];
  }

  async getStoryInsights(storyId, pageAccessToken) {
    const metrics = 'exits,replies,taps_forward,taps_back,impressions,reach';
    const url = `${this.graphBaseUrl}/${storyId}/insights?metric=${metrics}&access_token=${pageAccessToken}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  }

  async getPostInsights(postId, pageAccessToken) {
    const tryMetrics = async (metricsStr) => {
      const url = `${this.graphBaseUrl}/${postId}/insights?metric=${metricsStr}&access_token=${pageAccessToken}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        return data.data || [];
      }
      return null;
    };

    let data = await tryMetrics('post_impressions_unique,post_impressions,post_clicks_by_type');
    if (!data) {
      data = await tryMetrics('post_total_media_view_unique,post_media_view,post_clicks_by_type');
    }
    if (!data) {
      data = await tryMetrics('post_impressions_unique,post_impressions');
    }

    return data || [];
  }

  async getPostReactionsBreakdown(postId, pageAccessToken) {
    const fields = 'reactions.type(LIKE).summary(total_count).limit(0).as(like)'
      + ',reactions.type(LOVE).summary(total_count).limit(0).as(love)'
      + ',reactions.type(HAHA).summary(total_count).limit(0).as(haha)'
      + ',reactions.type(WOW).summary(total_count).limit(0).as(wow)'
      + ',reactions.type(SAD).summary(total_count).limit(0).as(sad)'
      + ',reactions.type(ANGRY).summary(total_count).limit(0).as(angry)';
    const url = `${this.graphBaseUrl}/${postId}?fields=${fields}&access_token=${pageAccessToken}`;
    const res = await fetch(url);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new FacebookInsightsError(
        errData.error?.message || `Failed to fetch Facebook post reactions breakdown for ${postId}`,
        { code: errData.error?.code ?? null, status: res.status, postId }
      );
    }

    const data = await res.json();
    return {
      LIKE: data.like?.summary?.total_count || 0,
      LOVE: data.love?.summary?.total_count || 0,
      HAHA: data.haha?.summary?.total_count || 0,
      WOW: data.wow?.summary?.total_count || 0,
      SAD: data.sad?.summary?.total_count || 0,
      ANGRY: data.angry?.summary?.total_count || 0
    };
  }

  async getPostDetails(postId, pageAccessToken) {
    const fields = 'id,message,story,created_time,full_picture,permalink_url,attachments{media,type},shares,comments.summary(true),reactions.summary(true)';
    const url = `${this.graphBaseUrl}/${postId}?fields=${fields}&access_token=${pageAccessToken}`;
    const res = await fetch(url);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new FacebookInsightsError(
        errData.error?.message || `Failed to fetch Facebook post details for ${postId}`,
        { code: errData.error?.code ?? null, status: res.status, postId }
      );
    }
    return res.json();
  }

  /**
   * Lấy dữ liệu nhân khẩu học cấp Page (Page-level Demographics).
   * Age/Gender: Meta đã ngừng cung cấp qua Graph API — trả cứng available:false.
   * Geography: dùng metric page_follows_country (khuyến nghị thay page_fans_country từ 11/2025).
   * Xử lý ngưỡng k-anonymity: nếu Facebook trả object/array rỗng, coi là insufficient_data.
   */
  async getPageDemographics(pageId, pageAccessToken) {
    const ageGender = { available: false, reason: 'deprecated_by_platform', data: null };

    const url = `${this.graphBaseUrl}/${pageId}/insights?metric=page_follows_country&period=lifetime&access_token=${pageAccessToken}`;
    const res = await fetch(url);
    if (!res.ok) {
      return { ageGender, geography: { available: false, reason: 'insufficient_data', data: null } };
    }

    const data = await res.json();
    const insightData = data.data?.[0]?.values?.[0]?.value;
    if (!insightData || Object.keys(insightData).length === 0) {
      return { ageGender, geography: { available: false, reason: 'insufficient_data', data: null } };
    }

    return { ageGender, geography: { available: true, reason: null, data: insightData } };
  }

  async getPostComments(postId, pageAccessToken) {
    const fields = 'id,message,created_time,from,comments{id,message,created_time,from}';
    const url = `${this.graphBaseUrl}/${postId}/comments?fields=${fields}&access_token=${pageAccessToken}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  }

  async replyToComment(commentId, text, pageAccessToken, attachmentUrl = null) {
    let url = `${this.graphBaseUrl}/${commentId}/comments?message=${encodeURIComponent(text)}&access_token=${pageAccessToken}`;
    if (attachmentUrl) {
      url += `&attachment_url=${encodeURIComponent(attachmentUrl)}`;
    }
    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'Failed to reply to comment on Facebook');
    }
    return res.json();
  }

  async createComment(postId, text, pageAccessToken, attachmentUrl = null) {
    let url = `${this.graphBaseUrl}/${postId}/comments?message=${encodeURIComponent(text)}&access_token=${pageAccessToken}`;
    if (attachmentUrl) {
      url += `&attachment_url=${encodeURIComponent(attachmentUrl)}`;
    }
    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'Failed to create comment on Facebook');
    }
    return res.json();
  }

  async getPageConversations(pageId, pageAccessToken, platform = null, afterCursor = null) {
    const fields = 'id,snippet,updated_time,participants,messages{id,message,created_time,from}';
    let url = `${this.graphBaseUrl}/${pageId}/conversations?fields=${fields}&access_token=${pageAccessToken}`;
    if (platform) {
      url += `&platform=${platform}`;
    }
    if (afterCursor) {
      url += `&after=${afterCursor}`;
    }
    console.log(`[Facebook Gateway] Calling GET /${pageId}/conversations (Platform: ${platform || 'default'}, After: ${afterCursor || 'none'})`);
    const res = await fetch(url);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error(`Failed to fetch Facebook conversations for platform ${platform}:`, errData.error?.message);
      return { data: [], paging: {} };
    }
    return res.json();
  }

  async getConversationMessages(conversationId, pageAccessToken) {
    const url = `${this.graphBaseUrl}/${conversationId}/messages?fields=message,from,to,created_time&access_token=${pageAccessToken}`;
    console.log(`[Facebook Gateway] Calling GET /${conversationId}/messages`);
    const res = await fetch(url);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error(`Failed to fetch messages for conversation ${conversationId}:`, errData.error?.message);
      return [];
    }
    const data = await res.json();
    return data.data || [];
  }

  async sendDirectMessage(recipientPsid, text, pageAccessToken) {
    const url = `${this.graphBaseUrl}/me/messages?access_token=${pageAccessToken}`;
    console.log(`[Facebook Gateway] Calling POST /me/messages to PSID ${recipientPsid}`);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipient: { id: recipientPsid },
        messaging_type: 'RESPONSE',
        message: { text }
      })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'Failed to send direct message via Facebook/Instagram');
    }
    return res.json();
  }

  async getConversationRecipientPsid(conversationId, pageId, pageAccessToken) {
    const url = `${this.graphBaseUrl}/${conversationId}?fields=participants&access_token=${pageAccessToken}`;
    console.log(`[Facebook Gateway] Calling GET /${conversationId} to get recipient PSID`);
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const recipient = data.participants?.data?.find(p => p.id !== pageId);
    return recipient ? recipient.id : null;
  }

  async publishTextPost(pageId, pageAccessToken, message, scheduledAt = null) {
    let url = `${this.graphBaseUrl}/${pageId}/feed?message=${encodeURIComponent(message)}&access_token=${pageAccessToken}`;
    if (scheduledAt) {
      const timestamp = Math.floor(new Date(scheduledAt).getTime() / 1000);
      url += `&published=false&scheduled_publish_time=${timestamp}`;
    }
    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'Failed to publish text post to Facebook');
    }
    return res.json();
  }

  async publishPhoto(pageId, pageAccessToken, mediaUrl, caption, scheduledAt = null) {
    const { buffer, filename } = await this._getMediaBuffer(mediaUrl);
    
    const formData = new FormData();
    const blob = new Blob([buffer]);
    formData.append('source', blob, filename);
    if (caption) formData.append('message', caption);
    formData.append('access_token', pageAccessToken);
    if (scheduledAt) {
      const timestamp = Math.floor(new Date(scheduledAt).getTime() / 1000);
      formData.append('published', 'false');
      formData.append('scheduled_publish_time', timestamp.toString());
    }

    const url = `${this.graphBaseUrl}/${pageId}/photos`;
    const res = await fetch(url, { method: 'POST', body: formData });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'Failed to publish photo to Facebook');
    }
    return res.json();
  }

  async createAlbum(pageId, pageAccessToken, name, message) {
    console.log('[FacebookGateway] Creating album:', { pageId, name, messageLength: message?.length });
    const formData = new FormData();
    if (name) formData.append('name', name);
    if (message) formData.append('message', message);
    formData.append('access_token', pageAccessToken);

    const url = `${this.graphBaseUrl}/${pageId}/albums`;
    const res = await fetch(url, { method: 'POST', body: formData });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error('[FacebookGateway] Failed to create album:', errData);
      throw new Error(errData.error?.message || 'Failed to create Facebook album');
    }
    const data = await res.json();
    console.log('[FacebookGateway] Created album response:', data);
    return data;
  }

  async uploadPhotoToAlbum(albumId, pageAccessToken, mediaUrl, caption) {
    console.log('[FacebookGateway] Uploading photo to album:', { albumId, mediaUrl, caption });
    const { buffer, filename } = await this._getMediaBuffer(mediaUrl);
    const formData = new FormData();
    const blob = new Blob([buffer]);
    formData.append('source', blob, filename);
    if (caption) formData.append('message', caption);
    formData.append('access_token', pageAccessToken);

    const url = `${this.graphBaseUrl}/${albumId}/photos`;
    const res = await fetch(url, { method: 'POST', body: formData });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error('[FacebookGateway] Failed to upload photo to album:', errData);
      throw new Error(errData.error?.message || 'Failed to upload photo to Facebook album');
    }
    const data = await res.json();
    console.log('[FacebookGateway] Uploaded photo response:', data);
    return data;
  }

  async uploadUnpublishedPhoto(pageId, pageAccessToken, mediaUrl, caption) {
    console.log('[FacebookGateway] Uploading unpublished photo:', { pageId, mediaUrl, caption });
    const { buffer, filename } = await this._getMediaBuffer(mediaUrl);
    const formData = new FormData();
    const blob = new Blob([buffer]);
    formData.append('source', blob, filename);
    if (caption) formData.append('message', caption);
    formData.append('published', 'false');
    formData.append('access_token', pageAccessToken);

    const url = `${this.graphBaseUrl}/${pageId}/photos`;
    const res = await fetch(url, { method: 'POST', body: formData });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error('[FacebookGateway] Failed to upload unpublished photo:', errData);
      throw new Error(errData.error?.message || 'Failed to upload unpublished photo to Facebook');
    }
    const data = await res.json();
    console.log('[FacebookGateway] Uploaded unpublished photo response:', data);
    return data;
  }

  async publishMultiPhotoPost(pageId, pageAccessToken, photoIds, message, scheduledAt = null) {
    console.log('[FacebookGateway] Publishing multi-photo post to feed:', { pageId, photoIds, messageLength: message?.length });
    const formData = new FormData();
    if (message) formData.append('message', message);
    
    const attachedMedia = photoIds.map(id => ({ media_fbid: id }));
    formData.append('attached_media', JSON.stringify(attachedMedia));
    formData.append('access_token', pageAccessToken);
    if (scheduledAt) {
      const timestamp = Math.floor(new Date(scheduledAt).getTime() / 1000);
      formData.append('published', 'false');
      formData.append('scheduled_publish_time', timestamp.toString());
    }

    const url = `${this.graphBaseUrl}/${pageId}/feed`;
    const res = await fetch(url, { method: 'POST', body: formData });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error('[FacebookGateway] Failed to publish multi-photo post:', errData);
      throw new Error(errData.error?.message || 'Failed to publish multi-photo post to Facebook');
    }
    const data = await res.json();
    console.log('[FacebookGateway] Published multi-photo post response:', data);
    return data;
  }

  async publishAlbum(pageId, pageAccessToken, mediaUrls, caption, mediaCaptions = [], scheduledAt = null) {
    console.log('[FacebookGateway] Publishing album start:', { pageId, mediaUrlsCount: mediaUrls.length, caption });
    if (!Array.isArray(mediaUrls) || mediaUrls.length < 2) {
      throw new Error('Facebook album requires at least 2 images');
    }

    try {
      const albumName = (caption || 'New Album').slice(0, 50);
      const album = await this.createAlbum(pageId, pageAccessToken, albumName, caption);
      const albumId = album.id;

      const photos = [];
      for (let i = 0; i < mediaUrls.length; i += 1) {
        const photoCaption = mediaCaptions[i] || caption || '';
        console.log(`[FacebookGateway] Uploading photo ${i + 1}/${mediaUrls.length}`);
        const result = await this.uploadPhotoToAlbum(albumId, pageAccessToken, mediaUrls[i], photoCaption);
        photos.push(result);
      }

      console.log('[FacebookGateway] Successfully published all photos to album:', albumId);
      return { id: albumId, photos };
    } catch (albumError) {
      console.warn('[FacebookGateway] Traditional album creation failed, trying multi-photo post fallback. Error:', albumError.message);
      
      const photoIds = [];
      for (let i = 0; i < mediaUrls.length; i += 1) {
        const photoCaption = mediaCaptions[i] || caption || '';
        console.log(`[FacebookGateway] [Fallback] Uploading photo ${i + 1}/${mediaUrls.length} as unpublished`);
        const result = await this.uploadUnpublishedPhoto(pageId, pageAccessToken, mediaUrls[i], photoCaption);
        photoIds.push(result.id);
      }
      
      const feedResult = await this.publishMultiPhotoPost(pageId, pageAccessToken, photoIds, caption, scheduledAt);
      return { id: feedResult.id, fallback: true, photoIds };
    }
  }

  /**
   * Publishes a video using Facebook's resumable upload protocol
   * (upload_phase=start/transfer/finish) instead of a single multipart POST.
   * Node's FormData/Blob don't support streaming a ReadableStream (verified
   * directly: Blob([stream]) just stringifies the stream object instead of
   * reading it), so the old multipart approach had to buffer the entire video
   * into RAM first. The transfer step here sends the raw body as a stream
   * instead, following the same start/upload_url/finish flow publishReel
   * already uses for /video_reels — /videos supports the same protocol.
   */
  async publishVideo(pageId, pageAccessToken, mediaUrl, title, description, scheduledAt = null) {
    // 1. Direct URL Ingestion via file_url parameter (For Cloudinary & HTTP/HTTPS URLs)
    if (typeof mediaUrl === 'string' && (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://'))) {
      const postParams = new URLSearchParams({
        file_url: mediaUrl,
        access_token: pageAccessToken
      });
      if (title) postParams.set('title', title);
      if (description) postParams.set('description', description);
      if (scheduledAt) {
        postParams.set('published', 'false');
        postParams.set('scheduled_publish_time', Math.floor(new Date(scheduledAt).getTime() / 1000).toString());
      }
      const directUrl = `${FACEBOOK_API.VIDEO_BASE_URL}/${API_VERSIONS.FACEBOOK}/${pageId}/videos`;
      const directRes = await fetch(directUrl, { method: 'POST', body: postParams });
      
      if (directRes.ok) {
        const data = await directRes.json();
        const videoId = data.id || data.video_id;
        if (videoId) {
          await this._pollVideoStatus(videoId, pageAccessToken);
        }
        console.log(`[FacebookGateway] ✅ Video published successfully via file_url! Video ID: ${videoId || data.id}`);
        return data;
      }

      const errText = typeof directRes.text === 'function' ? await directRes.text().catch(() => '') : '';
      console.warn(`[FacebookGateway] Direct file_url upload returned non-200 status (${directRes.status}): ${errText}. Falling back to resumable stream upload.`);
    }

    // 2. Resumable Upload Fallback (For local files or if direct file_url ingestion failed)
    const { stream, contentLength } = await this._getMediaStream(mediaUrl);

    const startUrl = `${FACEBOOK_API.VIDEO_BASE_URL}/${API_VERSIONS.FACEBOOK}/${pageId}/videos?upload_phase=start&file_size=${contentLength}&access_token=${pageAccessToken}`;
    const startRes = await fetch(startUrl, { method: 'POST' });
    if (!startRes.ok) {
      const errData = await startRes.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'Failed to start Facebook video upload session');
    }
    const startData = await startRes.json();
    const videoId = startData.video_id;
    const uploadUrl = startData.upload_url || `${FACEBOOK_API.VIDEO_BASE_URL}/${API_VERSIONS.FACEBOOK}/${pageId}/videos`;

    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `OAuth ${pageAccessToken}`,
        'offset': '0',
        'file_size': contentLength.toString()
      },
      body: stream,
      duplex: 'half'
    });
    if (!uploadRes.ok) {
      const errData = await uploadRes.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'Failed to upload video binary to Facebook');
    }

    const finishParams = new URLSearchParams({
      upload_phase: 'finish',
      video_id: videoId,
      access_token: pageAccessToken
    });
    if (title) finishParams.set('title', title);
    if (description) finishParams.set('description', description);
    if (scheduledAt) {
      finishParams.set('published', 'false');
      finishParams.set('scheduled_publish_time', Math.floor(new Date(scheduledAt).getTime() / 1000).toString());
    }
    const finishUrl = `${FACEBOOK_API.VIDEO_BASE_URL}/${API_VERSIONS.FACEBOOK}/${pageId}/videos?${finishParams.toString()}`;
    const finishRes = await fetch(finishUrl, { method: 'POST' });
    if (!finishRes.ok) {
      const errData = await finishRes.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'Failed to finalize Facebook video publishing');
    }
    const finishData = await finishRes.json();
    const videoIdToPoll = finishData.id || finishData.video_id || videoId;
    if (videoIdToPoll) {
      await this._pollVideoStatus(videoIdToPoll, pageAccessToken);
    }
    return finishData;
  }

  /**
   * Polling kiểm tra trạng thái xử lý video bất đồng bộ của Facebook
   * @param {string} videoId
   * @param {string} pageAccessToken
   */
  async _pollVideoStatus(videoId, pageAccessToken) {
    const { VIDEO_STATUS_POLL_INTERVAL_MS, VIDEO_STATUS_MAX_ATTEMPTS } = require('../../../config/facebook-reel.constants');
    const intervalMs = VIDEO_STATUS_POLL_INTERVAL_MS || 3000;
    const maxAttempts = VIDEO_STATUS_MAX_ATTEMPTS || 30;

    let attempts = 0;
    while (attempts < maxAttempts) {
      attempts += 1;
      await new Promise(resolve => setTimeout(resolve, intervalMs));

      const url = `${this.graphBaseUrl}/${videoId}?fields=status&access_token=${pageAccessToken}`;
      const res = await fetch(url);
      if (!res.ok) {
        continue;
      }

      const data = await res.json().catch(() => ({}));
      const videoStatus = data.status?.video_status;
      const processingErrorMsg = data.status?.processing_phase?.error?.message;

      if (videoStatus === 'ready') {
        logger.info(`[FacebookGateway] Video ${videoId} processing status: ready`);
        return true;
      }

      if (videoStatus === 'error' || processingErrorMsg) {
        const errorMsg = processingErrorMsg || `Facebook video processing failed with status '${videoStatus}'`;
        logger.error(`[FacebookGateway] ❌ Video ${videoId} processing failed: ${errorMsg}`);
        throw new Error(`Facebook video processing failed: ${errorMsg}`);
      }
    }

    throw new Error(`Facebook video processing timed out after ${maxAttempts} attempts`);
  }

  async publishReel(pageId, pageAccessToken, mediaUrl, caption) {
    try {
      const startUrl = `${this.graphBaseUrl}/${pageId}/video_reels?upload_phase=start&access_token=${pageAccessToken}`;
      const startRes = await fetch(startUrl, { method: 'POST' });
      if (!startRes.ok) throw new Error('Failed to start Reel upload session');
      
      const { video_id, upload_url } = await startRes.json();
      const { buffer: fileBuffer } = await this._getMediaBuffer(mediaUrl);
      
      const uploadRes = await fetch(upload_url, {
        method: 'POST',
        headers: {
          'Authorization': `OAuth ${pageAccessToken}`,
          'offset': '0',
          'file_size': fileBuffer.length.toString()
        },
        body: fileBuffer
      });
      if (!uploadRes.ok) throw new Error('Failed to upload Reel video binary');

      const finishUrl = `${this.graphBaseUrl}/${pageId}/video_reels?upload_phase=finish&video_id=${video_id}&video_state=PUBLISHED&description=${encodeURIComponent(caption || '')}&access_token=${pageAccessToken}`;
      const finishRes = await fetch(finishUrl, { method: 'POST' });
      if (!finishRes.ok) throw new Error('Failed to finalize Reel publishing');

      return await finishRes.json();
    } catch (err) {
      // Previously any failure here was swallowed and a fabricated
      // { id: `fb_reel_${Date.now()}` } was returned as if the upload had
      // succeeded (#64). The caller (SocialPublishStep/UpdatePostStatusStep)
      // treats that as success and marks the post PUBLISHED with a
      // platformPostId that doesn't exist on Facebook — unretryable, and
      // analytics/delete against that id silently fail forever after.
      // Propagate the real error so the publish pipeline marks it
      // FAILED/RETRYING instead.
      throw new Error(`Facebook Reel publish failed: ${err.message}`);
    }
  }

  async publishStory(pageId, pageAccessToken, mediaUrl, caption) {
    const isVideo = MEDIA_EXTENSIONS.VIDEO.some(ext => mediaUrl.toLowerCase().includes(ext));

    try {
      const { buffer, filename } = await this._getMediaBuffer(mediaUrl);
      const formData = new FormData();
      const blob = new Blob([buffer]);
      formData.append('source', blob, filename);
      formData.append('published', 'false');
      formData.append('access_token', pageAccessToken);

      if (isVideo) {
        const uploadUrl = `${FACEBOOK_API.VIDEO_BASE_URL}/${API_VERSIONS.FACEBOOK}/${pageId}/videos`;
        const uploadRes = await fetch(uploadUrl, { method: 'POST', body: formData });
        const { id: videoId } = await uploadRes.json();

        const storyUrl = `${this.graphBaseUrl}/${pageId}/video_stories?video_id=${videoId}&access_token=${pageAccessToken}`;
        const storyRes = await fetch(storyUrl, { method: 'POST' });
        return await storyRes.json();
      } else {
        const uploadUrl = `${this.graphBaseUrl}/${pageId}/photos`;
        const uploadRes = await fetch(uploadUrl, { method: 'POST', body: formData });
        const { id: photoId } = await uploadRes.json();

        const storyUrl = `${this.graphBaseUrl}/${pageId}/photo_stories?photo_id=${photoId}&access_token=${pageAccessToken}`;
        const storyRes = await fetch(storyUrl, { method: 'POST' });
        return await storyRes.json();
      }
    } catch (err) {
      // Same fabricated-success bug as publishReel above (#64) — propagate
      // instead of returning a fake id so the pipeline can retry/mark
      // FAILED correctly.
      throw new Error(`Facebook Story publish failed: ${err.message}`);
    }
  }

  async updatePostMessage(postId, message, pageAccessToken) {
    const url = `${this.graphBaseUrl}/${postId}?message=${encodeURIComponent(message)}&access_token=${pageAccessToken}`;
    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'Failed to update Facebook post content');
    }
    return res.json();
  }

  async deletePost(postId, pageAccessToken) {
    const url = `${this.graphBaseUrl}/${postId}?access_token=${pageAccessToken}`;
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'Failed to delete Facebook post');
    }
    return res.json();
  }

  async updateComment(commentId, text, pageAccessToken) {
    const url = `${this.graphBaseUrl}/${commentId}?message=${encodeURIComponent(text)}&access_token=${pageAccessToken}`;
    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'Failed to update Facebook comment');
    }
    return res.json();
  }

  async deleteComment(commentId, pageAccessToken) {
    const url = `${this.graphBaseUrl}/${commentId}?access_token=${pageAccessToken}`;
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'Failed to delete Facebook comment');
    }
    return res.json();
  }

  // ============= Private Helper Methods =============

  /**
   * Resolve mediaUrl thành local file path.
   * Nếu là Cloudinary URL (http/https), throw lỗi gợi ý dùng _getMediaBuffer.
   * Nếu là relative path, join với cwd().
   */
  _resolveLocalPath(mediaUrl) {
    // Nếu là URL (Cloudinary, S3, ...) thì không xử lý như local path
    if (isRemoteUrl(mediaUrl)) {
      throw new Error(`_resolveLocalPath: mediaUrl là remote URL, hãy dùng _getMediaBuffer(). URL: ${mediaUrl}`);
    }

    const localPath = path.join(process.cwd(), mediaUrl.startsWith('/') ? mediaUrl.substring(1) : mediaUrl);
    if (!fs.existsSync(localPath)) {
      throw new Error(`Media file not found at ${localPath}`);
    }
    return localPath;
  }

  /**
   * Lấy Buffer từ mediaUrl — hỗ trợ cả local path lẫn remote URL (Cloudinary, v.v.)
   * @param {string} mediaUrl
   * @returns {Promise<{ buffer: Buffer, filename: string }>}
   */
  async _getMediaBuffer(mediaUrl) {
    if (isRemoteUrl(mediaUrl)) {
      const res = await fetch(mediaUrl);
      if (!res.ok) {
        throw new Error(`Failed to download media from URL: ${mediaUrl} (status ${res.status})`);
      }
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      // Lấy filename từ URL (phần cuối path, bỏ query string)
      const urlPath = new URL(mediaUrl).pathname;
      const filename = path.basename(urlPath) || 'media';
      return { buffer, filename };
    } else {
      const localPath = path.join(process.cwd(), mediaUrl.startsWith('/') ? mediaUrl.substring(1) : mediaUrl);
      if (!fs.existsSync(localPath)) {
        throw new Error(`Media file not found at ${localPath}`);
      }
      return { buffer: fs.readFileSync(localPath), filename: path.basename(localPath) };
    }
  }

  /**
   * Lấy stream + content-length cho upload video dạng resumable (raw binary
   * body, KHÔNG qua FormData/Blob — xem ghi chú ở publishVideo). Facebook's
   * resumable upload yêu cầu header 'file_size' chính xác TRƯỚC khi stream,
   * nên với URL remote phải HEAD trước khi GET — không thể biết size từ 1
   * request GET đang stream dở.
   * @param {string} mediaUrl
   * @returns {Promise<{ stream: ReadableStream, contentLength: number }>}
   */
  async _getMediaStream(mediaUrl) {
    if (isRemoteUrl(mediaUrl)) {
      const headRes = await fetch(mediaUrl, { method: 'HEAD' });
      const contentLength = parseInt(headRes.headers.get('content-length'), 10);
      if (!contentLength) {
        throw new Error(`Cannot determine content-length for ${mediaUrl}`);
      }

      const res = await fetch(mediaUrl);
      if (!res.ok) {
        throw new Error(`Failed to fetch video from URL: ${mediaUrl} (status ${res.status})`);
      }
      return { stream: res.body, contentLength };
    }

    const localPath = path.join(process.cwd(), mediaUrl.startsWith('/') ? mediaUrl.substring(1) : mediaUrl);
    if (!fs.existsSync(localPath)) {
      throw new Error(`Media file not found at ${localPath}`);
    }
    const stats = fs.statSync(localPath);
    const nodeStream = fs.createReadStream(localPath);
    return { stream: Readable.toWeb(nodeStream), contentLength: stats.size };
  }

  async searchFacebookPages(appAccessToken, query) {
    if (appAccessToken && (appAccessToken.startsWith('mock-') || appAccessToken.includes('mock-'))) {
      return [
        {
          pageId: "mock_comp_page_123",
          title: "Competitor C page",
          thumbnail: "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg",
          followersCount: 15200,
          category: "Media"
        }
      ];
    }
    const url = `${this.graphBaseUrl}/search?q=${encodeURIComponent(query)}&type=page&fields=id,name,picture{url},fan_count,followers_count,category&access_token=${appAccessToken}&limit=10`;
    const res = await fetch(url);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'Failed to search Facebook pages');
    }
    const data = await res.json();
    return (data.data || []).map(p => ({
      pageId: p.id,
      title: p.name,
      thumbnail: p.picture?.data?.url || null,
      followersCount: p.followers_count || p.fan_count || 0,
      category: p.category || null,
    }));
  }

  /**
   * Lấy thông tin public của một Facebook Page theo pageId.
   * Dùng App Access Token để fetch — không cần user login page đó.
   * @param {string} pageId
   * @param {string} appAccessToken
   * @returns {Object} Page info
   */
  async getPublicPageInfo(pageId, appAccessToken) {
    if (appAccessToken && (appAccessToken.startsWith('mock-') || appAccessToken.includes('mock-'))) {
      return {
        pageId: pageId,
        displayName: `Competitor C page`,
        avatarUrl: `https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg`,
        followersCount: 15200,
        category: "Media",
        profileUrl: `https://www.facebook.com/${pageId}`,
      };
    }
    const url = `${this.graphBaseUrl}/${pageId}?fields=id,name,picture{url},fan_count,followers_count,category,link&access_token=${appAccessToken}`;
    const res = await fetch(url);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Failed to fetch public page info for ${pageId}`);
    }
    const data = await res.json();
    return {
      pageId: data.id,
      displayName: data.name,
      avatarUrl: data.picture?.data?.url || null,
      followersCount: data.followers_count || data.fan_count || 0,
      category: data.category || null,
      profileUrl: data.link || `https://www.facebook.com/${data.id}`,
    };
  }
}

module.exports = new FacebookGateway();
module.exports.FacebookInsightsError = FacebookInsightsError;
