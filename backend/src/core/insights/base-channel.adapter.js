const channelSnapshotRepository = require('../../repositories/social/channel-snapshot.repository');
const prisma = require('../../config/prisma');

/**
 * BaseChannelAdapter
 * Abstract Template Method Class cho Channel Snapshots.
 * Định nghĩa quy trình chuẩn: Build Current -> Build Daily Rows -> Upsert Snapshots
 */
class BaseChannelAdapter {
  get platform() {
    throw new Error('Abstract property platform must be implemented');
  }

  /**
   * Phương thức nhận Prisma client và trả về Prisma Model tương ứng
   * @param {object} client - prisma or tx transaction
   */
  getPrismaModel(client = prisma) {
    throw new Error('Abstract method getPrismaModel must be implemented');
  }

  get supportsBackfill() {
    return false;
  }

  /**
   * TEMPLATE METHOD: Quy trình upsert snapshots kênh chuẩn
   * @param {string} brandId
   * @param {string} socialAccountId
   * @param {object} analyticsData - Dữ liệu thô từ Platform API
   * @param {object} [options] - Options như client (tx transaction)
   * @returns {Promise<Array>}
   */
  async execute(brandId, socialAccountId, analyticsData, options = {}) {
    const client = options.client || prisma;
    const model = this.getPrismaModel(client);

    const current = this.buildCurrent(analyticsData);
    const dailyRows = this.buildDailyRows(analyticsData);

    return channelSnapshotRepository.upsertChannelSnapshots(
      model,
      brandId,
      socialAccountId,
      current,
      dailyRows,
      this.supportsBackfill
    );
  }

  /** Subclasses MUST override */
  buildCurrent(analyticsData) {
    throw new Error('Abstract method buildCurrent must be implemented');
  }

  /** Subclasses MUST override */
  buildDailyRows(analyticsData) {
    throw new Error('Abstract method buildDailyRows must be implemented');
  }
}

module.exports = BaseChannelAdapter;
