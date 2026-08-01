const axios = require('axios');
const BaseSocialService = require('../base-social.service');
const socialAccountRepository = require('../../../repositories/social/social-account.repository');
const twitchGateway = require('./twitch.gateway');

class TwitchService extends BaseSocialService {
  constructor() {
    super();
    this.clientId = process.env.TWITCH_CLIENT_ID || '';
    this.clientSecret = process.env.TWITCH_CLIENT_SECRET || '';
  }

  getAuthUrl(brandId, redirectUri) {
    const scopes = ['channel:manage:broadcast', 'clips:edit', 'chat:read', 'user:write:chat'].join(' ');
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

  async publishPost() {
    throw new Error('Twitch does not support scheduled post publishing.');
  }

  async syncChannelMetrics(socialAccountId) {
    const account = await socialAccountRepository.findById(socialAccountId);
    if (!account || !account.accessToken) return null;

    try {
      const authProvider = twitchGateway.createAuthProvider(socialAccountId, {
        accessToken: account.accessToken,
        refreshToken: account.refreshToken,
        expiresIn: account.tokenExpiresAt ? Math.floor((new Date(account.tokenExpiresAt) - Date.now()) / 1000) : 0,
        obtainingTimestamp: Date.now()
      });

      const apiClient = twitchGateway.getApiClient(authProvider);
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

  // Stubs for BaseSocialService contract
  async getChannelInfo() { return null; }
  async getPublishedVideos() { return []; }
  async getAnalyticsReport() { return {}; }
  async trackVideo() { return null; }
  async getVideoDetails() { return null; }
  async searchChannel() { return []; }
  async addCompetitor() { return null; }
  async fetchChannelComments() { return []; }
  async replyToComment() { return null; }
  async updatePublishedPost() { return null; }
  async deletePost() { return { success: true }; }
}

module.exports = new TwitchService();
