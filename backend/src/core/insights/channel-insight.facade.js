/**
 * ChannelInsightFacade
 * Entry Point (Facade): Cung cấp giao diện công khai để upsert Channel Snapshots.
 */
class ChannelInsightFacade {
  /**
   * @param {import('./channel-adapter.factory')} factory
   */
  constructor(factory) {
    this.factory = factory;
  }

  /**
   * Upsert channel snapshots cho bất kỳ nền tảng nào
   * @param {string} platform - e.g. PLATFORMS.YOUTUBE
   * @param {string} brandId
   * @param {string} socialAccountId
   * @param {object} analyticsData
   * @param {object} [options]
   * @returns {Promise<Array>}
   */
  async upsertChannelSnapshots(platform, brandId, socialAccountId, analyticsData, options = {}) {
    const adapter = this.factory.getAdapter(platform);
    return adapter.execute(brandId, socialAccountId, analyticsData, options);
  }
}

module.exports = ChannelInsightFacade;
