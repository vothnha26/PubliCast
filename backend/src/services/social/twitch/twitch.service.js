const axios = require('axios');
const BaseSocialService = require('../base-social.service');
const socialAccountRepository = require('../../../repositories/social/social-account.repository');
const twitchGateway = require('./twitch.gateway');
const { PLATFORMS, POST_STATUS } = require('../../../utils/constants');

class TwitchService extends BaseSocialService {
  constructor() {
    super();
    this.clientId = process.env.TWITCH_CLIENT_ID || '';
    this.clientSecret = process.env.TWITCH_CLIENT_SECRET || '';
  }

  getAuthUrl(brandId, redirectUri) {
    // channel:manage:schedule is required to create/update/delete Stream
    // Schedule segments (see publishPost) — the only real "publish a post"
    // equivalent Twitch's public API supports.
    const scopes = ['channel:manage:broadcast', 'channel:manage:schedule'].join(' ');
    const state = brandId || '';
    const url = `https://id.twitch.tv/oauth2/authorize?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${encodeURIComponent(state)}`;
    return url;
  }

  async connectChannel(brandId, code, redirectUri) {
    // 1. Exchange authorization code for token
    const tokenRes = await axios.post('https://id.twitch.tv/oauth2/token', null, {
      params: {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      }
    });

    const tokenData = tokenRes.data;

    // 2. Fetch broadcaster user info
    const userRes = await axios.get('https://api.twitch.tv/helix/users', {
      headers: {
        'Client-ID': this.clientId,
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    const userData = userRes.data?.data?.[0];
    if (!userData) {
      throw new Error('Failed to fetch Twitch user profile');
    }

    const channelData = {
      broadcasterId: userData.id,
      username: userData.login,
      displayName: userData.display_name,
      profilePictureUrl: userData.profile_image_url,
      broadcasterType: userData.broadcaster_type || '',
      followersCount: 0
    };

    const tokens = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
      scope: (tokenData.scope || []).join(' ')
    };

    return await socialAccountRepository.upsertTwitchAccount(brandId, channelData, tokens);
  }

  _getApiClient(account) {
    const authProvider = twitchGateway.createAuthProvider(account.id, {
      accessToken: account.accessToken,
      refreshToken: account.refreshToken,
      expiresIn: account.tokenExpiresAt ? Math.floor((new Date(account.tokenExpiresAt) - Date.now()) / 1000) : 0,
      obtainingTimestamp: Date.now()
    });
    return twitchGateway.getApiClient(authProvider);
  }

  /**
   * "Publishes" a post as a Twitch Stream Schedule segment — see
   * twitch.gateway.js createScheduleSegment for why this (not a video
   * upload or channel-info update) is the honest equivalent here.
   * No media/long-form caption support: a schedule segment is title +
   * start time + optional category only.
   */
  async publishPost(brandId, postData) {
    const account = await socialAccountRepository.findByBrandAndPlatformFirst(brandId, PLATFORMS.TWITCH);
    if (!account) throw new Error('Twitch account not connected');

    const title = (postData.title || postData.caption || '').slice(0, 140);
    if (!title) throw new Error('A title is required to schedule a Twitch broadcast');

    const startDate = postData.scheduledAt ? new Date(postData.scheduledAt) : new Date();

    const apiClient = this._getApiClient(account);
    const segment = await twitchGateway.createScheduleSegment(apiClient, account.platformAccountId, {
      title,
      startDate: startDate.toISOString()
    });

    return { id: segment.id, status: POST_STATUS.PUBLISHED, publishedAt: segment.startDate };
  }

  async updatePublishedPost(brandId, platformPostId, postData) {
    const account = await socialAccountRepository.findByBrandAndPlatformFirst(brandId, PLATFORMS.TWITCH);
    if (!account) throw new Error('Twitch account not connected');

    const apiClient = this._getApiClient(account);
    const data = {};
    if (postData.title || postData.caption) data.title = (postData.title || postData.caption).slice(0, 140);
    if (postData.scheduledAt) data.startDate = new Date(postData.scheduledAt).toISOString();

    const segment = await twitchGateway.updateScheduleSegment(apiClient, account.platformAccountId, platformPostId, data);
    return { id: segment.id, status: POST_STATUS.PUBLISHED, publishedAt: segment.startDate };
  }

  async deletePost(brandId, platformPostId) {
    const account = await socialAccountRepository.findByBrandAndPlatformFirst(brandId, PLATFORMS.TWITCH);
    if (!account) throw new Error('Twitch account not connected');

    const apiClient = this._getApiClient(account);
    await twitchGateway.deleteScheduleSegment(apiClient, account.platformAccountId, platformPostId);
    return { success: true };
  }

  async syncChannelMetrics(socialAccountId) {
    const account = await socialAccountRepository.findById(socialAccountId);
    if (!account || !account.accessToken) return null;

    try {
      const apiClient = this._getApiClient(account);
      const broadcasterId = account.platformAccountId;

      const followers = await apiClient.channels.getChannelFollowerCount(broadcasterId);

      if (account.twitchAccount) {
        await socialAccountRepository.upsertTwitchAccount(account.brandId, {
          broadcasterId,
          username: account.username,
          displayName: account.displayName,
          profilePictureUrl: account.profilePictureUrl,
          broadcasterType: account.twitchAccount.broadcasterType,
          followersCount: followers
        }, {
          access_token: account.accessToken,
          refresh_token: account.refreshToken
        }, { enqueueSync: false });
      }

      await socialAccountRepository.updateLastSyncAt(socialAccountId);
    } catch (err) {
      console.error(`[TwitchService] Failed to sync channel metrics for ${socialAccountId}:`, err.message);
    }
  }

  // Stubs for BaseSocialService contract — no real Twitch API equivalent
  async getChannelInfo() { return null; }
  async getPublishedVideos() { return []; }
  async getAnalyticsReport() { return {}; }
  async trackVideo() { return null; }
  async getVideoDetails() { return null; }
  async searchChannel() { return []; }
  async addCompetitor() { return null; }
  async fetchChannelComments() { return []; }
  async replyToComment() { return null; }
}

module.exports = new TwitchService();
