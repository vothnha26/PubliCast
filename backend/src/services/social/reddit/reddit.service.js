const BaseSocialService = require('../base-social.service');
const redditGateway = require('./reddit.gateway');
const { RedditPublishStrategyFactory } = require('./strategies/reddit-publish.strategy');
const socialAccountRepository = require('../../../repositories/social/social-account.repository');
const { PLATFORMS } = require('../../../utils/constants');

class RedditService extends BaseSocialService {
  /**
   * Connect a Reddit account using OAuth authorization code
   */
  async connectChannel(brandId, code, redirectUri) {
    const tokens = await redditGateway.exchangeCode(code, redirectUri);
    const client = redditGateway.createClient(tokens.accessToken);
    const me = await redditGateway.getMe(client);

    const account = await socialAccountRepository.upsertRedditAccount(
      brandId,
      {
        platformAccountId: me.id,
        username: me.username,
        displayName: me.displayName,
        profilePictureUrl: me.iconImg,
        linkKarma: me.linkKarma,
        commentKarma: me.commentKarma
      },
      tokens
    );

    return account;
  }

  /**
   * Publish post to Reddit using Strategy Pattern
   */
  async publishPost(brandId, postData) {
    const account = await socialAccountRepository.findByBrandAndPlatformFirst(brandId, PLATFORMS.REDDIT);
    if (!account) {
      throw new Error('Reddit account not connected for this brand');
    }

    const client = redditGateway.createClient(account.accessToken);
    const metadata = postData.metadata?.reddit || postData.metadata || {};

    if (!metadata.subreddit) {
      throw new Error('Target subreddit is required for Reddit post');
    }

    const strategy = RedditPublishStrategyFactory.getStrategy(postData);
    const result = await strategy.publish(client, postData, metadata);

    if (!result?.id) {
      throw new Error('Reddit publish failed: No post ID returned');
    }

    return {
      id: result.id,
      url: result.url
    };
  }

  async getUserSubreddits(brandId) {
    const account = await socialAccountRepository.findByBrandAndPlatformFirst(brandId, PLATFORMS.REDDIT);
    if (!account) throw new Error('Reddit account not connected');
    const client = redditGateway.createClient(account.accessToken);
    return redditGateway.getUserSubreddits(client);
  }

  async searchSubreddits(brandId, query) {
    const account = await socialAccountRepository.findByBrandAndPlatformFirst(brandId, PLATFORMS.REDDIT);
    if (!account) throw new Error('Reddit account not connected');
    const client = redditGateway.createClient(account.accessToken);
    return redditGateway.searchSubreddits(client, query);
  }

  async getSubredditFlairs(brandId, subreddit) {
    const account = await socialAccountRepository.findByBrandAndPlatformFirst(brandId, PLATFORMS.REDDIT);
    if (!account) throw new Error('Reddit account not connected');
    const client = redditGateway.createClient(account.accessToken);
    return redditGateway.getSubredditFlairs(client, subreddit);
  }

  // BaseSocialService Contract Implementations
  async getChannelInfo(auth) {
    const account = await socialAccountRepository.findById(auth?.socialAccountId);
    if (!account) return null;
    return account.redditAccount || null;
  }

  async getPublishedVideos() { return []; }
  async getAnalyticsReport() { return {}; }
  async syncChannelMetrics() {}
  async trackVideo() { return null; }
  async getVideoDetails() { return null; }
  async searchChannel() { return []; }
  async addCompetitor() { return null; }
  async fetchChannelComments() { return []; }
  async replyToComment() { return null; }
  async updatePublishedPost() { return null; }
  async deletePost() { return { success: true }; }
}

module.exports = new RedditService();
