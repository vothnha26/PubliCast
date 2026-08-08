const socialAuthFactory = require('../auth/social-auth.factory');
const postInsightRepository = require('../../repositories/social/post-insight.repository');
const logger = require('../../utils/logger');

/**
 * BasePostInsightAdapter
 * Abstract Template Method Class choPost Metrics.
 * Định nghĩa quy trình chuẩn: Check Cache -> API Fetch -> Persist -> Return
 */
class BasePostInsightAdapter {
  /** Ten platform (e.g. PLATFORMS.YOUTUBE) */
  get platform() {
    throw new Error('Abstract property platform must be implemented');
  }

  /** Prisma model reference (e.g. prisma.youTubeVideoMetric) */
  get prismaModel() {
    throw new Error('Abstract property prismaModel must be implemented');
  }

  /** Staleness TTL (default 24 hours) */
  get staleMs() {
    return 24 * 60 * 60 * 1000;
  }

  /** Storage strategy: true = upsert, false = append-only */
  get isUniqueKeyed() {
    return false;
  }

  /**
   * TEMPLATE METHOD: Quy trình xử lý cố định (Stateless execution)
   * @param {string} brandId
   * @param {string} postId
   * @param {object} [options] - e.g. { socialAccountId }
   * @returns {Promise<object>}
   */
  async execute(brandId, postId, options = {}) {
    const authInfo = await socialAuthFactory.getAuthClient(brandId, this.platform, options.socialAccountId);
    if (!authInfo) {
      return this.emptyMetrics();
    }

    const { auth, socialAccountId } = authInfo;
    const context = { brandId, socialAccountId, platformPostId: postId };
    const lookupKey = { socialAccountId, platformPostId: postId };

    // 1. Check DB Cache
    const freshRow = await postInsightRepository.getFresh(
      this.prismaModel,
      lookupKey,
      this.staleMs,
      this.isUniqueKeyed
    );

    if (freshRow) {
      try {
        return this.parseRaw(freshRow.rawInsightsJson || freshRow);
      } catch (err) {
        logger.debug(`[${this.constructor.name}] Failed to parse cached insights: ${err.message}`);
      }
    }

    // 2. Fetch live metrics from Platform API
    const metrics = await this.fetchFromAPI(auth, postId, context);

    // 3. Persist asynchronously / safely
    const dbData = this.toDbData(metrics, context);
    postInsightRepository.persist(this.prismaModel, lookupKey, dbData, this.isUniqueKeyed).catch((err) => {
      logger.debug(`[${this.constructor.name}] Failed to persist post metrics: ${err.message}`);
    });

    return metrics;
  }

  /** Subclasses MUST override */
  async fetchFromAPI(auth, postId, context) {
    throw new Error('Abstract method fetchFromAPI must be implemented');
  }

  /** Subclasses MUST override */
  toDbData(metrics, context) {
    throw new Error('Abstract method toDbData must be implemented');
  }

  emptyMetrics() {
    return {};
  }

  parseRaw(rawJson) {
    return typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
  }
}

module.exports = BasePostInsightAdapter;
