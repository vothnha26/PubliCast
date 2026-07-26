const BaseSocialService = require('../base-social.service');
const blueskyGateway = require('./bluesky.gateway');
const socialAccountRepository = require('../../../repositories/social/social-account.repository');
const { PLATFORMS } = require('../../../utils/constants');

class BlueskyService extends BaseSocialService {
  async connectChannel(brandId, { handle, appPassword }) {
    const agent = blueskyGateway.createAgent();
    const session = await blueskyGateway.loginWithAppPassword(agent, handle, appPassword);
    
    const profile = await blueskyGateway.getProfile(agent, session.data.did);

    return socialAccountRepository.upsertBlueskyAccount(brandId, {
      did: profile.did,
      handle: profile.handle,
      displayName: profile.displayName || profile.handle,
      avatarUrl: profile.avatar,
      accessToken: session.data.accessJwt,
      refreshToken: session.data.refreshJwt,
      followersCount: profile.followersCount,
      followsCount: profile.followsCount,
      postsCount: profile.postsCount
    });
  }

  async publishPost(brandId, postData) {
    const account = await socialAccountRepository.findByBrandAndPlatformFirst(brandId, PLATFORMS.BLUESKY);
    if (!account) throw new Error('Bluesky account not connected');

    const agent = blueskyGateway.createAgent(account.blueskyAccount?.pdsUrl);
    
    const result = await blueskyGateway.publishPost(agent, {
      text: postData.caption || '',
      images: postData.images || []
    });

    if (!result?.id) throw new Error('Bluesky publish failed: No post URI returned');
    return { id: result.id };
  }

  async syncChannelMetrics(socialAccountId) {
    const account = await socialAccountRepository.findById(socialAccountId);
    if (!account || !account.blueskyAccount) return;

    const agent = blueskyGateway.createAgent(account.blueskyAccount.pdsUrl);
    const profile = await blueskyGateway.getProfile(agent, account.blueskyAccount.did);

    await socialAccountRepository.updateBlueskyMetrics(socialAccountId, {
      followersCount: profile.followersCount,
      followsCount: profile.followsCount,
      postsCount: profile.postsCount
    });
  }

  // Stubs for BaseSocialService contract compliance
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
  async deletePost() { return true; }
}

module.exports = new BlueskyService();
