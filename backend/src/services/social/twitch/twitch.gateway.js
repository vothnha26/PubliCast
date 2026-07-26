const { ApiClient } = require('@twurple/api');
const { RefreshingAuthProvider } = require('@twurple/auth');
const socialAccountRepository = require('../../../repositories/social/social-account.repository');

class TwitchGateway {
  constructor() {
    this.clientId = process.env.TWITCH_CLIENT_ID || '';
    this.clientSecret = process.env.TWITCH_CLIENT_SECRET || '';
  }

  createAuthProvider(socialAccountId, initialTokenData) {
    const authProvider = new RefreshingAuthProvider({
      clientId: this.clientId,
      clientSecret: this.clientSecret
    });

    authProvider.onRefresh(async (userId, newTokenData) => {
      console.log(`[Twitch] Token refreshed automatically for user: ${userId}`);
      if (socialAccountId) {
        await socialAccountRepository.updateTokens(socialAccountId, {
          access_token: newTokenData.accessToken,
          refresh_token: newTokenData.refreshToken,
          expiry_date: newTokenData.expiresIn ? Date.now() + newTokenData.expiresIn * 1000 : undefined
        });
      }
    });

    authProvider.addUserForToken(initialTokenData, ['chat']);
    return authProvider;
  }

  getApiClient(authProvider) {
    return new ApiClient({ authProvider });
  }

  async getStreamStatus(apiClient, broadcasterId) {
    const stream = await apiClient.streams.getStreamByUserId(broadcasterId);
    return stream ? {
      isLive: true,
      title: stream.title,
      gameName: stream.gameName,
      viewerCount: stream.viewerCount,
      startedAt: stream.startDate
    } : { isLive: false };
  }

  async createClip(apiClient, broadcasterId) {
    const clipId = await apiClient.clips.createClip({ channelId: broadcasterId });
    return clipId;
  }

  async pollClipDetails(apiClient, clipId, maxAttempts = 10) {
    for (let i = 0; i < maxAttempts; i++) {
      const clip = await apiClient.clips.getClipById(clipId);
      if (clip && clip.thumbnailUrl && !clip.thumbnailUrl.includes('processing')) {
        return {
          id: clip.id,
          url: clip.url,
          embedUrl: clip.embedUrl,
          title: clip.title,
          thumbnailUrl: clip.thumbnailUrl,
          duration: clip.duration
        };
      }
      await new Promise(r => setTimeout(r, 3000));
    }
    throw new Error('Clip processing timed out');
  }
}

module.exports = new TwitchGateway();
