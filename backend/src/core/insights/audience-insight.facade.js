const { eventEmitter, EVENTS } = require('../../events/event-emitter');

/**
 * AudienceInsightFacade
 * Entry Point (Facade): Cung cấp giao diện công khai để đồng bộ Audience Snapshots (Demographics, Geo, Traffic).
 */
class AudienceInsightFacade {
  /**
   * @param {import('./audience-adapter.factory')} factory
   */
  constructor(factory) {
    this.factory = factory;
  }

  /**
   * Upsert Audience Snapshot cho bất kỳ nền tảng nào
   * @param {string} platform - e.g. PLATFORMS.YOUTUBE
   * @param {string} brandId
   * @param {string} socialAccountId
   * @param {object} [options]
   * @returns {Promise<object>}
   */
  async syncAudienceSnapshot(platform, brandId, socialAccountId, options = {}) {
    const adapter = this.factory.getAdapter(platform);
    const result = await adapter.execute(brandId, socialAccountId, options);

    eventEmitter.emit(EVENTS.SOCIAL.METRICS_SYNCED, {
      brandId,
      platform: platform.toUpperCase(),
      type: 'AUDIENCE_SNAPSHOT'
    });

    return result;
  }
}

module.exports = AudienceInsightFacade;
