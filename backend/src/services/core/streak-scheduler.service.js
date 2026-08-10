const cron = require('node-cron');
const lockService = require('../social/distributed-lock.singleton');
const streakService = require('../workspace/streak.service');
const { LOCK_CONFIG } = require('../../utils/constants');
const logger = require('../../utils/logger');

// Publishing itself only ever grows a brand's streak (see streak.service's
// recalculateStreak, hooked into update-db.step.js) — nothing decreases it
// mid-day. This daily sweep is what actually zeroes out streaks for brands
// that let a full day pass without publishing.
class StreakSchedulerService {
  constructor() {
    this.job = null;
  }

  start() {
    // 00:05 server time — after midnight so "yesterday" is fully closed out,
    // same reasoning as recap-scheduler's end-of-day timing.
    this.job = cron.schedule('5 0 * * *', async () => {
      logger.debug('⏰ [StreakScheduler] Starting lapsed-streak reset...');
      try {
        await lockService.acquireLock(LOCK_CONFIG.STREAK_SCHEDULER.KEY, LOCK_CONFIG.STREAK_SCHEDULER.TTL_SEC)
          .then(async (token) => {
            if (!token) {
              logger.debug('ℹ️ [StreakScheduler] Another instance is already running, skipping.');
              return;
            }
            try {
              const count = await streakService.resetLapsedStreaks();
              logger.debug(`✅ [StreakScheduler] Reset ${count} lapsed streak(s).`);
            } finally {
              await lockService.releaseLock(LOCK_CONFIG.STREAK_SCHEDULER.KEY, token);
            }
          });
      } catch (error) {
        console.error('❌ [StreakScheduler] Error running lapsed-streak reset:', error);
      }
    });

    logger.debug('✅ [StreakScheduler] Cron service initialized (daily 00:05).');
  }

  stop() {
    if (this.job) { this.job.stop(); this.job = null; }
  }
}

module.exports = new StreakSchedulerService();
