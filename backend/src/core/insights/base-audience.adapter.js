const socialAuthFactory = require('../auth/social-auth.factory');
const prisma = require('../../config/prisma');

/**
 * BaseAudienceAdapter
 * Abstract Template Method Class cho Audience Demographics & Geography Insights.
 */
class BaseAudienceAdapter {
  get platform() {
    throw new Error('Abstract property platform must be implemented');
  }

  getPrismaModel(client = prisma) {
    throw new Error('Abstract method getPrismaModel must be implemented');
  }

  /**
   * TEMPLATE METHOD: Quy trình xử lý Audience Snapshots
   * @param {string} brandId
   * @param {string} socialAccountId
   * @param {object} [options] - { client, auth, startDate, endDate }
   * @returns {Promise<object>}
   */
  async execute(brandId, socialAccountId, options = {}) {
    const client = options.client || prisma;
    const model = this.getPrismaModel(client);

    let auth = options.auth;
    if (!auth) {
      const authInfo = await socialAuthFactory.getAuthClient(brandId, this.platform);
      if (!authInfo) return null;
      auth = authInfo.auth;
    }

    const context = { brandId, socialAccountId, startDate: options.startDate, endDate: options.endDate };
    const rawData = await this.fetchFromAPI(auth, context);
    const normalizedData = this.normalize(rawData);

    return this.persist(model, brandId, socialAccountId, normalizedData);
  }

  /** Subclasses MUST override */
  async fetchFromAPI(auth, context) {
    throw new Error('Abstract method fetchFromAPI must be implemented');
  }

  /** Subclasses MUST override to structure age/gender/country/trafficSource distributions */
  normalize(rawData) {
    throw new Error('Abstract method normalize must be implemented');
  }

  /** Upsert snapshot database row for today */
  async persist(model, brandId, socialAccountId, normalizedData) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    return model.upsert({
      where: {
        socialAccountId_snapshotDate_platform: {
          socialAccountId,
          snapshotDate: today,
          platform: this.platform
        }
      },
      create: {
        brandId,
        socialAccountId,
        platform: this.platform,
        snapshotDate: today,
        ageDistribution: normalizedData.ageDistribution,
        genderDistribution: normalizedData.genderDistribution,
        countryDistribution: normalizedData.countryDistribution,
        trafficSourceDistribution: normalizedData.trafficSourceDistribution
      },
      update: {
        ageDistribution: normalizedData.ageDistribution,
        genderDistribution: normalizedData.genderDistribution,
        countryDistribution: normalizedData.countryDistribution,
        trafficSourceDistribution: normalizedData.trafficSourceDistribution,
        fetchedAt: new Date()
      }
    });
  }
}

module.exports = BaseAudienceAdapter;
