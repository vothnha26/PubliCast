const { API_VERSIONS, SEPARATORS, FACEBOOK_API } = require('../../../utils/constants');
const path = require('path');
const fs = require('fs');
const logger = require('../../../utils/logger');

// Custom fetch wrapper with timeout and logging
const fetchWithTimeout = async (url, options = {}) => {
  const timeoutMs = options.body ? 45000 : 25000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  logger.info(`[Instagram API] Request: ${options.method || 'GET'} ${url.split('?')[0]}`);
  try {
    const res = await global.fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    logger.info(`[Instagram API] Response Status: ${res.status}`);
    return res;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      logger.error(`[Instagram API] ❌ Timeout after ${timeoutMs}ms: ${options.method || 'GET'} ${url.split('?')[0]}`);
      throw new Error(`Instagram API request timed out after ${timeoutMs}ms`);
    }
    logger.error(`[Instagram API] ❌ Failed: ${error.message}`);
    throw error;
  }
};

const fetch = fetchWithTimeout;

class InstagramGateway {
  constructor() {
    this.graphBaseUrl = `${FACEBOOK_API.GRAPH_URL}/${API_VERSIONS.FACEBOOK}`;
  }

  /**
   * Lấy thông tin Instagram Business Account liên kết với Facebook Page
   */
  async getInstagramAccountForPage(pageId, pageAccessToken) {
    const fields = 'instagram_business_account{id,username,name,profile_picture_url,followers_count,follows_count,media_count,biography,website}';
    const url = `${this.graphBaseUrl}/${pageId}?fields=${fields}&access_token=${pageAccessToken}`;

    const res = await fetch(url);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Failed to fetch Instagram business account linked to Facebook Page: ${pageId}`);
    }

    const data = await res.json();
    const igAccount = data.instagram_business_account;
    if (!igAccount) return null;

    return {
      igAccountId: igAccount.id,
      username: igAccount.username,
      displayName: igAccount.name || igAccount.username,
      profilePictureUrl: igAccount.profile_picture_url || '',
      followersCount: igAccount.followers_count || 0,
      followingCount: igAccount.follows_count || 0,
      mediaCount: igAccount.media_count || 0,
      biography: igAccount.biography || null,
      website: igAccount.website || null
    };
  }

  /**
   * Tạo media container cho hình ảnh đơn lẻ
   */
  /**
   * Tạo media container cho hình ảnh đơn lẻ
   */
  async createImageContainer(igAccountId, accessToken, imageUrl, caption, scheduledAt = null, options = {}, altText = null) {
    const url = `${this.graphBaseUrl}/${igAccountId}/media`;
    const body = {
      image_url: imageUrl,
      caption: caption || '',
      access_token: accessToken
    };
    if (scheduledAt) {
      body.scheduled_publish_time = Math.floor(new Date(scheduledAt).getTime() / 1000);
    }
    if (options.instagramCollaborators && options.instagramCollaborators.length > 0) {
      body.collaborators = options.instagramCollaborators;
    }
    if (options.instagramAudio) {
      body.audio_asset_id = options.instagramAudio.id || options.instagramAudio;
    }
    // alt_text: image posts only (Reels/Stories not supported per Meta docs,
    // introduced March 24, 2025 on the /media endpoint).
    if (altText) {
      body.alt_text = altText;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error('[InstagramGateway] createImageContainer FAILED:', JSON.stringify(errData, null, 2));
      throw new Error(errData.error?.message || 'Failed to create Instagram image container');
    }

    return res.json();
  }

  /**
   * Tạo media container cho video đơn lẻ
   */
  async createVideoContainer(igAccountId, accessToken, videoUrl, caption, scheduledAt = null, options = {}) {
    const url = `${this.graphBaseUrl}/${igAccountId}/media`;
    const body = {
      media_type: 'REELS',
      video_url: videoUrl,
      caption: caption || '',
      access_token: accessToken
    };
    if (scheduledAt) {
      body.scheduled_publish_time = Math.floor(new Date(scheduledAt).getTime() / 1000);
    }
    if (options.instagramCollaborators && options.instagramCollaborators.length > 0) {
      body.collaborators = options.instagramCollaborators;
    }
    if (options.instagramAudio) {
      body.audio_asset_id = options.instagramAudio.id || options.instagramAudio;
    }
    if (options.instagramShowOnFeed !== undefined) {
      body.share_to_feed = options.instagramShowOnFeed;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error('[InstagramGateway] createVideoContainer FAILED:', JSON.stringify(errData, null, 2));
      throw new Error(errData.error?.message || 'Failed to create Instagram video container');
    }

    return res.json();
  }

  /**
   * Tạo media container cho Reels
   */
  async createReelContainer(igAccountId, accessToken, videoUrl, caption, scheduledAt = null, options = {}) {
    const url = `${this.graphBaseUrl}/${igAccountId}/media`;
    const body = {
      media_type: 'REELS',
      video_url: videoUrl,
      caption: caption || '',
      access_token: accessToken
    };
    if (scheduledAt) {
      body.scheduled_publish_time = Math.floor(new Date(scheduledAt).getTime() / 1000);
    }
    if (options.instagramCollaborators && options.instagramCollaborators.length > 0) {
      body.collaborators = options.instagramCollaborators;
    }
    if (options.instagramAudio) {
      body.audio_asset_id = options.instagramAudio.id || options.instagramAudio;
    }
    if (options.instagramShowOnFeed !== undefined) {
      body.share_to_feed = options.instagramShowOnFeed;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error('[InstagramGateway] createReelContainer FAILED:', JSON.stringify(errData, null, 2));
      throw new Error(errData.error?.message || 'Failed to create Instagram Reel container');
    }

    return res.json();
  }

  /**
   * Tạo media container cho Stories
   */
  async createStoryContainer(igAccountId, accessToken, mediaUrl, isVideo = false) {
    const url = `${this.graphBaseUrl}/${igAccountId}/media`;
    const body = {
      media_type: 'STORIES',
      access_token: accessToken
    };

    if (isVideo) {
      body.video_url = mediaUrl;
    } else {
      body.image_url = mediaUrl;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error('[InstagramGateway] createStoryContainer FAILED:', JSON.stringify(errData, null, 2));
      throw new Error(errData.error?.message || 'Failed to create Instagram Story container');
    }

    return res.json();
  }

  /**
   * Tạo container con cho Album/Carousel
   */
  async createCarouselItemContainer(igAccountId, accessToken, mediaUrl, isVideo = false, altText = null) {
    const url = `${this.graphBaseUrl}/${igAccountId}/media`;
    const body = {
      is_carousel_item: true,
      access_token: accessToken
    };

    if (isVideo) {
      body.media_type = 'VIDEO';
      body.video_url = mediaUrl;
    } else {
      body.image_url = mediaUrl;
      // alt_text is only valid on image carousel children — Meta docs:
      // "Reels and stories are not supported"; video carousel items aren't
      // mentioned as supported either, so scope this to the image branch.
      if (altText) {
        body.alt_text = altText;
      }
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error('[InstagramGateway] createCarouselItemContainer FAILED:', JSON.stringify(errData, null, 2));
      throw new Error(errData.error?.message || 'Failed to create Instagram Carousel Item container');
    }

    return res.json();
  }

  /**
   * Tạo container cha cho Album/Carousel
   */
  async createCarouselContainer(igAccountId, accessToken, childrenIds, caption, scheduledAt = null, options = {}) {
    const url = `${this.graphBaseUrl}/${igAccountId}/media`;
    const body = {
      media_type: 'CAROUSEL',
      children: childrenIds.join(SEPARATORS.COMMA),
      caption: caption || '',
      access_token: accessToken
    };
    if (scheduledAt) {
      body.scheduled_publish_time = Math.floor(new Date(scheduledAt).getTime() / 1000);
    }
    if (options.instagramCollaborators && options.instagramCollaborators.length > 0) {
      body.collaborators = options.instagramCollaborators;
    }
    if (options.instagramAudio) {
      body.audio_asset_id = options.instagramAudio.id || options.instagramAudio;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'Failed to create Instagram Carousel container');
    }

    return res.json();
  }

  /**
   * Kiểm tra trạng thái container (Polling)
   */
  async pollContainerStatus(containerId, accessToken) {
    const url = `${this.graphBaseUrl}/${containerId}?fields=status_code,status&access_token=${accessToken}`;
    
    const res = await fetch(url);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Failed to fetch container status for ${containerId}`);
    }

    return res.json();
  }

  /**
   * Publish container đã xử lý xong
   */
  async publishContainer(igAccountId, accessToken, containerId) {
    const url = `${this.graphBaseUrl}/${igAccountId}/media_publish`;
    const body = {
      creation_id: containerId,
      access_token: accessToken
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'Failed to publish Instagram media container');
    }

    return res.json();
  }

  /**
   * Lấy danh sách feed bài đăng
   */
  async getInstagramMediaFeed(igAccountId, accessToken, pageToken = null, limit = 10) {
    const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count';
    let url = `${this.graphBaseUrl}/${igAccountId}/media?fields=${fields}&limit=${limit}&access_token=${accessToken}`;
    if (pageToken) {
      url += `&after=${pageToken}`;
    }

    const res = await fetch(url);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'Failed to fetch Instagram media feed');
    }

    const data = await res.json();
    return {
      data: data.data || [],
      nextPageToken: data.paging?.cursors?.after || null,
      prevPageToken: data.paging?.cursors?.before || null
    };
  }

  /**
   * Lấy insights của một bài đăng Instagram
   */
  // `impressions` is deprecated for media created after July 2, 2024 (see
  // guide/instagram/reference/instagram-media.insights.md) and Graph API
  // rejects the whole request when it's included with other metrics for a
  // new post — not just that one field. `views` is the supported replacement
  // (same metric family, available for FEED/REELS/STORY).
  async getInstagramMediaInsights(mediaId, accessToken, metrics = 'views,reach,saved') {
    const url = `${this.graphBaseUrl}/${mediaId}/insights?metric=${metrics}&access_token=${accessToken}`;
    
    const res = await fetch(url);
    if (!res.ok) {
      // Có thể không có insights nếu bài đăng quá mới hoặc bị lỗi phân quyền, trả về mảng rỗng để fallback
      return [];
    }

    const data = await res.json();
    return data.data || [];
  }

  /**
   * Lấy bình luận của một bài đăng Instagram
   */
  async getMediaComments(mediaId, accessToken) {
    const fields = 'id,text,timestamp,from,replies{id,text,timestamp,from}';
    const url = `${this.graphBaseUrl}/${mediaId}/comments?fields=${fields}&access_token=${accessToken}`;
    
    const res = await fetch(url);
    if (!res.ok) return [];
    
    const data = await res.json();
    return data.data || [];
  }

  /**
   * Trả lời bình luận trên Instagram
   */
  async replyToComment(commentId, text, accessToken) {
    const url = `${this.graphBaseUrl}/${commentId}/replies?message=${encodeURIComponent(text)}&access_token=${accessToken}`;
    
    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'Failed to reply to comment on Instagram');
    }
    
    return res.json();
  }

  async createComment(mediaId, text, accessToken) {
    const url = `${this.graphBaseUrl}/${mediaId}/comments?message=${encodeURIComponent(text)}&access_token=${accessToken}`;
    
    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'Failed to create comment on Instagram');
    }
    
    return res.json();
  }

  /**
   * Fetches daily account-level insights (views, reach, profile_views).
   *
   * Verified live against Graph API v25.0 (2026): the `impressions` metric
   * used previously is no longer accepted at all — the API rejects it with
   * "(#100) metric[0] must be one of the following values: reach,
   * follower_count, ..., views, ...". `views` is the direct replacement, BUT
   * it (like several other current metrics) only supports
   * `metric_type=total_value`, which collapses the entire since/until window
   * into a single number — it no longer returns a `values[]` array with one
   * entry per day the way the old `impressions`/`reach` metrics used to.
   * Confirmed live: requesting `metric_type=time_series` for `views` is
   * rejected outright ("incompatible with the metric type").
   *
   * To keep the daily-breakdown growth chart working, this fetches one
   * single-day window per calendar day in [startDate, endDate] and
   * reassembles them into the old `{ name, values: [{ value, end_time }] }`
   * shape callers (`instagram-analytics.service.js`) already expect. Each
   * day is fetched independently and a failure on one day is skipped rather
   * than aborting the whole range — one bad day's insights shouldn't blank
   * out an otherwise-successful multi-week sync.
   */
  async getAccountInsights(igAccountId, accessToken, startDate, endDate) {
    const metrics = 'views,reach,profile_views';
    const dayMs = 24 * 60 * 60 * 1000;
    const start = new Date(new Date(startDate).toISOString().split('T')[0] + 'T00:00:00Z');
    const end = new Date(new Date(endDate).toISOString().split('T')[0] + 'T00:00:00Z');

    const byMetric = { views: [], reach: [], profile_views: [] };

    for (let dayStart = start.getTime(); dayStart <= end.getTime(); dayStart += dayMs) {
      const since = Math.floor(dayStart / 1000);
      const until = Math.floor((dayStart + dayMs) / 1000);
      const endTimeIso = new Date(dayStart + dayMs).toISOString();
      const url = `${this.graphBaseUrl}/${igAccountId}/insights?metric=${metrics}&period=day&metric_type=total_value&since=${since}&until=${until}&access_token=${accessToken}`;

      try {
        const res = await fetch(url);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.warn(`[InstagramGateway] getAccountInsights failed for day ${new Date(dayStart).toISOString().split('T')[0]}:`, errData.error?.message);
          continue;
        }
        const data = await res.json();
        for (const item of data.data || []) {
          if (byMetric[item.name] && item.total_value) {
            byMetric[item.name].push({ value: item.total_value.value || 0, end_time: endTimeIso });
          }
        }
      } catch (err) {
        console.warn(`[InstagramGateway] getAccountInsights request error for day ${new Date(dayStart).toISOString().split('T')[0]}:`, err.message);
      }
    }

    return Object.entries(byMetric)
      .filter(([, values]) => values.length > 0)
      .map(([name, values]) => ({ name, period: 'day', values }));
  }

  async searchAudio(q, accessToken) {
    if (accessToken && (accessToken.startsWith('mock-') || accessToken.includes('mock') || accessToken.startsWith('ig_mock') || accessToken.includes('fb_mock'))) {
      const MOCK_AUDIO_TRACKS = [
        { id: "viral_pop", name: "Trending Pop Hits (Viral)" },
        { id: "lofi_chill", name: "Chill Lofi Beats" },
        { id: "synthwave", name: "Epic Cinematic Synth" },
        { id: "acoustic", name: "Acoustic Sunset Moods" },
        { id: "tech_vibe", name: "Tech Startup Vibe" }
      ];
      if (!q) return { data: MOCK_AUDIO_TRACKS };
      return { data: MOCK_AUDIO_TRACKS.filter(t => t.name.toLowerCase().includes(q.toLowerCase())) };
    }

    const url = `${this.graphBaseUrl}/instagram_audio_search?q=${encodeURIComponent(q)}&access_token=${accessToken}`;
    const res = await fetch(url);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error('[InstagramGateway] searchAudio FAILED:', JSON.stringify(errData, null, 2));
      throw new Error(errData.error?.message || 'Failed to search Instagram audio');
    }
    return res.json();
  }
}

module.exports = new InstagramGateway();
