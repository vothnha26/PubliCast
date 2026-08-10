const cron = require('node-cron');
const prisma = require('../../config/prisma');
const lockService = require('../social/distributed-lock.singleton');
const notificationService = require('./notification.service');
const { LOCK_CONFIG, NOTIFICATION_TYPES, POST_STATUS } = require('../../utils/constants');
const logger = require('../../utils/logger');

// Recap content is a lightweight DB rollup (published post count for the
// window) rather than analyticsFacade.getAggregatedData — that pipeline
// calls live platform APIs per account and is built for one on-demand
// request, not a cron sweeping every brand daily/weekly. A count query is
// enough to make the notification useful without adding quota pressure.
class RecapSchedulerService {
  constructor() {
    this.dailyJob = null;
    this.weeklyJob = null;
  }

  start() {
    // Daily recap at 20:00 (end of the working day, covers "today")
    this.dailyJob = cron.schedule('0 20 * * *', async () => {
      logger.debug('⏰ [RecapScheduler] Starting daily recap scan...');
      try {
        await this._runWithLock(LOCK_CONFIG.RECAP_SCHEDULER, () => this._scanAndSend('daily'));
      } catch (error) {
        console.error('❌ [RecapScheduler] Error running daily recap:', error);
      }
    });

    // Weekly report every Monday at 08:00, covering the prior Mon-Sun week
    this.weeklyJob = cron.schedule('0 8 * * 1', async () => {
      logger.debug('⏰ [RecapScheduler] Starting weekly report scan...');
      try {
        await this._runWithLock(LOCK_CONFIG.RECAP_SCHEDULER, () => this._scanAndSend('weekly'));
      } catch (error) {
        console.error('❌ [RecapScheduler] Error running weekly report:', error);
      }
    });

    logger.debug('✅ [RecapScheduler] Cron service initialized (Daily 20:00, Weekly Mon 08:00).');
  }

  stop() {
    if (this.dailyJob) { this.dailyJob.stop(); this.dailyJob = null; }
    if (this.weeklyJob) { this.weeklyJob.stop(); this.weeklyJob = null; }
  }

  async _runWithLock({ KEY, TTL_SEC }, fn) {
    const token = await lockService.acquireLock(KEY, TTL_SEC);
    if (!token) {
      logger.debug('ℹ️ [RecapScheduler] Another instance is already running, skipping.');
      return;
    }
    try {
      await fn();
    } finally {
      await lockService.releaseLock(KEY, token);
    }
  }

  async _scanAndSend(cadence) {
    const preferenceKey = cadence === 'daily' ? 'notifyDailyRecap' : 'notifyWeeklyReport';
    const { from, to } = this._resolveWindow(cadence);

    const brands = await prisma.brand.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true }
    });

    const pending = brands.map((brand) =>
      this._sendForBrand(brand, cadence, preferenceKey, from, to).catch((err) => {
        console.error(`❌ [RecapScheduler] Failed to build ${cadence} recap for brand ${brand.id}:`, err.message);
      })
    );
    await Promise.all(pending);
  }

  _resolveWindow(cadence) {
    const to = new Date();
    const from = new Date(to);
    if (cadence === 'daily') {
      from.setDate(from.getDate() - 1);
    } else {
      from.setDate(from.getDate() - 7);
    }
    return { from, to };
  }

  async _sendForBrand(brand, cadence, preferenceKey, from, to) {
    const publishedCount = await prisma.post.count({
      where: {
        brandId: brand.id,
        status: POST_STATUS.PUBLISHED,
        isDeleted: false,
        publishedAt: { gte: from, lte: to }
      }
    });

    // Skip brands with nothing to report — an empty recap every day/week is
    // noise, and Empty Queue Alerts already covers the "no activity" case.
    if (publishedCount === 0) return;

    const isDaily = cadence === 'daily';
    const title = isDaily ? 'Daily post recap' : 'Weekly report card';
    const message = isDaily
      ? `"${brand.name}" published ${publishedCount} post${publishedCount === 1 ? '' : 's'} today.`
      : `"${brand.name}" published ${publishedCount} post${publishedCount === 1 ? '' : 's'} this week.`;

    await notificationService.notifyBrandMembers(brand.id, {
      type: NOTIFICATION_TYPES.SYSTEM,
      title,
      message,
      actionUrl: '/analytics'
    }, preferenceKey);
  }
}

module.exports = new RecapSchedulerService();
