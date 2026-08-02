import { apiV2 } from './api';

class SocialService {
  async searchStockMedia({ provider, query, page = 1, perPage = 20, mediaType = 'PHOTO', orientation }) {
    const params = new URLSearchParams({
      provider,
      query,
      page,
      perPage,
      mediaType,
      ...(orientation ? { orientation } : {})
    }).toString();
    const data = await apiV2.get(`/content-extras/stock/search?${params}`);
    return data;
  }

  async importStockMedia(payload) {
    const data = await apiV2.post('/content-extras/stock/import', payload);
    return data;
  }

  async getGoogleAuthUrl(brandId) {
    const data = await apiV2.get(`/social/google/url?brandId=${brandId}`);
    return data;
  }

  async getMetrics(brandId, params = {}) {
    const queryParams = new URLSearchParams({ brandId, ...params }).toString();
    // Timeout 90s vì backend cần sync với các nền tảng (Facebook Smart Sync có thể mất 30-60s)
    const data = await apiV2.get(`/social/metrics?${queryParams}`, { timeout: 90000 });
    return data;
  }

  async addTrackedVideo(brandId, videoUrl) {
    const data = await apiV2.post('/social/youtube/track', { brandId, videoUrl });
    return data;
  }

  async getTrackedVideos(brandId) {
    const data = await apiV2.get(`/social/youtube/tracked-videos?brandId=${brandId}`);
    return data;
  }

  async getPublishedVideos(brandId, pageToken = null, limit = 10, socialAccountId = null) {
    const url = `/social/youtube/published-videos?brandId=${encodeURIComponent(brandId)}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}${limit ? `&limit=${encodeURIComponent(limit)}` : ''}${socialAccountId ? `&socialAccountId=${encodeURIComponent(socialAccountId)}` : ''}`;
    const data = await apiV2.get(url);
    return data;
  }

  async getYouTubePlaylists(brandId, forceRefresh = false) {
    const url = `/social/youtube/playlists?brandId=${encodeURIComponent(brandId)}${forceRefresh ? '&sync=true' : ''}`;
    const data = await apiV2.get(url);
    return data;
  }

  async getYouTubeVideoCategories(brandId, forceRefresh = false) {
    const url = `/social/youtube/video-categories?brandId=${encodeURIComponent(brandId)}${forceRefresh ? '&sync=true' : ''}`;
    const data = await apiV2.get(url);
    return data;
  }

  async getReelCopyrightStatus(brandId, videoId, socialAccountId = null) {
    const url = `/social/facebook/reels/${videoId}/copyright-check?brandId=${brandId}` +
      (socialAccountId ? `&socialAccountId=${socialAccountId}` : '');
    const data = await apiV2.get(url);
    return data;
  }

  async getVideoAnalytics(brandId, videoId, startDate, endDate) {
    let url = `/social/youtube/video-analytics?brandId=${encodeURIComponent(brandId)}&videoId=${encodeURIComponent(videoId)}`;
    if (startDate) url += `&startDate=${encodeURIComponent(startDate)}`;
    if (endDate) url += `&endDate=${encodeURIComponent(endDate)}`;
    const data = await apiV2.get(url);
    return data;
  }

  async getVideoInsights(brandId, videoId) {
    const url = `/social/youtube/video-insights?brandId=${brandId}&videoId=${videoId}`;
    const data = await apiV2.get(url, { timeout: 30000 });
    return data;
  }

  async searchChannels(brandId, query) {
    const data = await apiV2.get(`/social/youtube/search-channels?brandId=${encodeURIComponent(brandId)}&query=${encodeURIComponent(query)}`);
    return data;
  }

  async addCompetitor(brandId, channelId) {
    const data = await apiV2.post('/social/youtube/competitors', { brandId, channelId });
    return data;
  }

  async getCompetitors(brandId) {
    const data = await apiV2.get(`/social/youtube/competitors?brandId=${brandId}`);
    return data;
  }

  async deleteCompetitor(id, brandId) {
    const data = await apiV2.delete(`/social/youtube/competitors/${id}?brandId=${brandId}`);
    return data;
  }

  async getGoogleDriveFiles(brandId) {
    const data = await apiV2.get(`/social/google/drive/files?brandId=${brandId}`);
    return data;
  }

  async downloadGoogleDriveFile(brandId, fileId, fileName) {
    const data = await apiV2.post('/social/google/drive/download', { brandId, fileId, fileName });
    return data;
  }

  async disconnectGoogleAccount(brandId, socialAccountId = null) {
    const data = await apiV2.post('/social/google/disconnect', { brandId, socialAccountId });
    return data;
  }

  async getGoogleDriveAuthUrl(brandId) {
    const data = await apiV2.get(`/social/google-drive/auth-url?brandId=${brandId}`);
    return data;
  }

  async disconnectGoogleDriveAccount(brandId, socialAccountId = null) {
    const data = await apiV2.post('/social/google-drive/disconnect', { brandId, socialAccountId });
    return data;
  }

  async getFacebookAuthUrl(brandId) {
    const data = await apiV2.get(`/social/facebook/url?brandId=${brandId}`);
    return data;
  }

  async getFacebookPublishedPosts(brandId, pageToken = null, limit = 10, socialAccountId = null) {
    const url = `/social/facebook/published-posts?brandId=${brandId}${pageToken ? `&pageToken=${pageToken}` : ''}${limit ? `&limit=${limit}` : ''}${socialAccountId ? `&socialAccountId=${socialAccountId}` : ''}`;
    const data = await apiV2.get(url);
    return data;
  }

  async disconnectFacebookAccount(brandId, socialAccountId = null) {
    const data = await apiV2.post('/social/facebook/disconnect', { brandId, socialAccountId });
    return data;
  }

  // ── Facebook Competitors ──────────────────────────────────────────────────

  async searchFacebookPages(brandId, query) {
    const data = await apiV2.get(`/social/facebook/search-pages?brandId=${brandId}&query=${encodeURIComponent(query)}`);
    return data;
  }

  async addFacebookCompetitor(brandId, pageId) {
    const data = await apiV2.post('/social/facebook/competitors', { brandId, pageId });
    return data;
  }

  async getFacebookCompetitors(brandId) {
    const data = await apiV2.get(`/social/facebook/competitors?brandId=${brandId}`);
    return data;
  }

  async deleteFacebookCompetitor(id, brandId) {
    const data = await apiV2.delete(`/social/facebook/competitors/${id}?brandId=${brandId}`);
    return data;
  }

  async getTikTokAuthUrl(brandId) {
    const data = await apiV2.get(`/social/tiktok/url?brandId=${brandId}`);
    return data;
  }

  async getTikTokPublishedVideos(brandId, pageToken = null, limit = 10) {
    const url = `/social/tiktok/published-videos?brandId=${brandId}${pageToken ? `&pageToken=${pageToken}` : ''}${limit ? `&limit=${limit}` : ''}`;
    const data = await apiV2.get(url);
    return data;
  }

  async getTikTokComments(brandId, { videoId = null, commentId = null, maxCount = 10, cursor = 0, socialAccountId = null } = {}) {
    const params = new URLSearchParams({
      brandId,
      ...(videoId ? { videoId } : {}),
      ...(commentId ? { commentId } : {}),
      ...(maxCount ? { maxCount } : {}),
      ...(cursor ? { cursor } : {}),
      ...(socialAccountId ? { socialAccountId } : {})
    }).toString();
    const data = await apiV2.get(`/social/tiktok/comments?${params}`);
    return data;
  }

  async disconnectTikTokAccount(brandId, socialAccountId = null) {
    const data = await apiV2.post('/social/tiktok/disconnect', { brandId, socialAccountId });
    return data;
  }

  async getInstagramAuthUrl(brandId) {
    const data = await apiV2.get(`/social/instagram/url?brandId=${brandId}`);
    return data;
  }

  async getInstagramPublishedPosts(brandId, pageToken = null, limit = 10, socialAccountId = null) {
    const url = `/social/instagram/published-posts?brandId=${brandId}${pageToken ? `&pageToken=${pageToken}` : ''}${limit ? `&limit=${limit}` : ''}${socialAccountId ? `&socialAccountId=${socialAccountId}` : ''}`;
    const data = await apiV2.get(url);
    return data;
  }

  async searchInstagramAudio(brandId, query) {
    const url = `/social/instagram/audio-search?brandId=${brandId}&q=${encodeURIComponent(query)}`;
    const data = await apiV2.get(url);
    return data;
  }

  async disconnectInstagramAccount(brandId, socialAccountId = null) {
    const data = await apiV2.post('/social/instagram/disconnect', { brandId, socialAccountId });
    return data;
  }

  async getThreadsAuthUrl(brandId) {
    const data = await apiV2.get(`/social/threads/url?brandId=${brandId}`);
    return data;
  }

  async disconnectThreadsAccount(brandId, socialAccountId = null) {
    const data = await apiV2.post('/social/threads/disconnect', { brandId, socialAccountId });
    return data;
  }

  async getThreadsPublishedPosts(brandId, pageToken = null, limit = 10, socialAccountId = null) {
    const url = `/social/threads/published-posts?brandId=${brandId}${pageToken ? `&pageToken=${pageToken}` : ''}${limit ? `&limit=${limit}` : ''}${socialAccountId ? `&socialAccountId=${socialAccountId}` : ''}`;
    const data = await apiV2.get(url);
    return data;
  }

  async connectTelegramAccount(brandId, botToken, chatId) {
    const data = await apiV2.post('/social/telegram/connect', { brandId, botToken, chatId });
    return data;
  }

  async disconnectTelegramAccount(brandId, socialAccountId = null) {
    const data = await apiV2.post('/social/telegram/disconnect', { brandId, socialAccountId });
    return data;
  }

  async reassignSocialAccount(platform, platformAccountId, targetBrandId) {
    const data = await apiV2.post('/social/reassign', { platform, platformAccountId, targetBrandId });
    return data;
  }

  async setDefaultAccount(brandId, socialAccountId) {
    const data = await apiV2.post('/social/accounts/set-default', { brandId, socialAccountId });
    return data;
  }

  // --- Twitch ---
  async getTwitchAuthUrl(brandId) {
    const data = await apiV2.get(`/social/twitch/url?brandId=${brandId}`);
    return data;
  }

  async disconnectTwitchAccount(brandId, socialAccountId = null) {
    const data = await apiV2.post('/social/twitch/disconnect', { brandId, socialAccountId });
    return data;
  }

  // --- Bluesky ---
  async getBlueskyAuthUrl(brandId) {
    const data = await apiV2.get(`/social/bluesky/url?brandId=${brandId}`);
    return data;
  }

  async getBlueskyComments(brandId, { uri, depth = 6, parentHeight = 80, socialAccountId = null } = {}) {
    const params = new URLSearchParams({
      brandId,
      uri,
      ...(depth ? { depth } : {}),
      ...(parentHeight ? { parentHeight } : {}),
      ...(socialAccountId ? { socialAccountId } : {})
    }).toString();
    const data = await apiV2.get(`/social/bluesky/comments?${params}`);
    return data;
  }

  async disconnectBlueskyAccount(brandId, socialAccountId = null) {
    const data = await apiV2.post('/social/bluesky/disconnect', { brandId, socialAccountId });
    return data;
  }

  // --- Reddit ---
  async getRedditAuthUrl(brandId) {
    const data = await apiV2.get(`/social/reddit/url?brandId=${brandId}`);
    return data;
  }

  async disconnectRedditAccount(brandId, socialAccountId = null) {
    const data = await apiV2.post('/social/reddit/disconnect', { brandId, socialAccountId });
    return data;
  }

  async getRedditUserSubreddits(brandId) {
    const data = await apiV2.get(`/social/reddit/subreddits?brandId=${brandId}`);
    return data;
  }

  async searchRedditSubreddits(brandId, q) {
    const data = await apiV2.get(`/social/reddit/subreddits/search?brandId=${brandId}&q=${encodeURIComponent(q)}`);
    return data;
  }

  async getSubredditFlairs(brandId, subreddit) {
    const data = await apiV2.get(`/social/reddit/subreddits/${subreddit}/flairs?brandId=${brandId}`);
    return data;
  }
}

const socialService = new SocialService();
export default socialService;
