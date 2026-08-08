const { eventEmitter, EVENTS } = require('../../events/event-emitter');

/**
 * PostInsightFacade
 * Entry Point (Facade): Cung cấp giao diện công khai đơn giản để truy vấn Post Insights.
 */
class PostInsightFacade {
  /**
   * @param {import('./post-adapter.factory')} factory
   */
  constructor(factory) {
    this.factory = factory;
  }

  /**
   * Lấy post insights của 1 bài viết/video cụ thể trên bất kỳ nền tảng nào
   * @param {string} brandId
   * @param {string} platform - e.g. PLATFORMS.YOUTUBE
   * @param {string} postId
   * @param {object} [options] - e.g. { socialAccountId }
   * @returns {Promise<object>}
   */
  async getPostInsights(brandId, platform, postId, options = {}) {
    const adapter = this.factory.getAdapter(platform);
    const metrics = await adapter.execute(brandId, postId, options);

    eventEmitter.emit(EVENTS.SOCIAL.METRICS_SYNCED, {
      brandId,
      platform: platform.toUpperCase(),
      postId
    });

    return metrics;
  }
}

module.exports = PostInsightFacade;
