const { ApiClient } = require('@twurple/api');
const { RefreshingAuthProvider } = require('@twurple/auth');
const socialAccountRepository = require('../../../repositories/social/social-account.repository');
const logger = require('../../../utils/logger');

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
      logger.debug(`[Twitch] Token refreshed automatically for user: ${userId}`);
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

  /**
   * "Publishing a post" on Twitch has no analog to a text/media feed post —
   * Helix's Videos endpoint has no create/upload method (VODs are only
   * generated from an actual live broadcast). The closest real, honest
   * equivalent is a Channel Stream Schedule segment: it has its own ID,
   * a genuine update/delete lifecycle, and is publicly visible on the
   * channel's "Schedule" tab — unlike a bare channel-info title update.
   * Requires the `channel:manage:schedule` OAuth scope.
   */
  async createScheduleSegment(apiClient, broadcasterId, { title, startDate, timezone = 'UTC', duration, categoryId }) {
    return apiClient.schedule.createScheduleSegment(broadcasterId, {
      title,
      startDate,
      timezone,
      isRecurring: false,
      duration,
      categoryId
    });
  }

  async updateScheduleSegment(apiClient, broadcasterId, segmentId, { title, startDate, timezone, duration, categoryId }) {
    return apiClient.schedule.updateScheduleSegment(broadcasterId, segmentId, {
      title,
      startDate,
      timezone,
      duration,
      categoryId
    });
  }

  async deleteScheduleSegment(apiClient, broadcasterId, segmentId) {
    return apiClient.schedule.deleteScheduleSegment(broadcasterId, segmentId);
  }
}

module.exports = new TwitchGateway();
