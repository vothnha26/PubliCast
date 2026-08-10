const cron = require('node-cron');
const reportService = require('./report.service');
const reportRepository = require('../../repositories/workspace/report.repository');
const lockService = require('../social/distributed-lock.singleton');
const { LOCK_CONFIG } = require('../../utils/constants');
const logger = require('../../utils/logger');

class ReportSchedulerService {
  constructor() {
    this.job = null;
  }

  /**
   * Start the daily cron job at 08:00 AM to scan and send reports
   */
  start() {
    // Run daily at 08:00 AM
    this.job = cron.schedule('0 8 * * *', async () => {
      logger.debug('⏰ [ReportScheduler] Starting daily report schedule scan...');
      try {
        await this.runScanWithLock();
      } catch (error) {
        console.error('❌ [ReportScheduler] Error running scheduled task:', error);
      }
    });

    logger.debug('✅ [ReportScheduler] Cron service initialized successfully (Running daily at 08:00 AM).');
  }

  /**
   * Guards scanAndSendReports with a distributed lock so that running
   * multiple backend instances (horizontal scaling) doesn't result in every
   * instance's cron firing at 08:00 and sending duplicate report emails to
   * every brand scheduled for that day.
   */
  async runScanWithLock() {
    const { KEY, TTL_SEC } = LOCK_CONFIG.REPORT_SCHEDULER;
    const token = await lockService.acquireLock(KEY, TTL_SEC);
    if (!token) {
      logger.debug('ℹ️ [ReportScheduler] Another instance is already running the daily scan, skipping.');
      return;
    }

    try {
      await this.scanAndSendReports();
    } finally {
      await lockService.releaseLock(KEY, token);
    }
  }

  /**
   * Scan all brand schedule configurations and trigger email deliveries if it is the scheduled day of month
   */
  async scanAndSendReports() {
    // Reads DB rows instead of uploads/reports/config_*.json (#75) — see
    // report.repository.js#findAllEnabledScheduleConfigs.
    const configs = await reportRepository.findAllEnabledScheduleConfigs();

    if (configs.length === 0) {
      logger.debug('ℹ️ [ReportScheduler] No brand configurations found.');
      return;
    }

    const today = new Date();
    const currentDay = today.getDate();

    // Check if today is the last day of the month
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const isLastDayOfMonth = tomorrow.getDate() === 1;

    logger.debug(`🔍 [ReportScheduler] Scanning ${configs.length} brand configuration(s). Today is Day ${currentDay} of the month. (Last day: ${isLastDayOfMonth})`);

    // Collected and awaited (not fire-and-forget) so the distributed lock in
    // runScanWithLock() stays held for the full duration of email delivery,
    // not just for building the list of brands to email.
    const pendingSends = [];

    for (const config of configs) {
      try {
        const brandId = config.brandId;
        const emailsList = this._safeJsonParseArray(config.emailsList);
        const platforms = this._safeJsonParseArray(config.platforms);

        // Skip if no email recipients (receiveEmail is already filtered by
        // findAllEnabledScheduleConfigs's where clause).
        if (emailsList.length === 0) {
          continue;
        }

        const scheduledDay = config.dayOfMonth || '1';
        let isScheduledToday = false;

        if (scheduledDay === 'last') {
          isScheduledToday = isLastDayOfMonth;
        } else {
          isScheduledToday = currentDay === parseInt(scheduledDay);
        }

        if (isScheduledToday) {
          const brandName = config.brand?.name || brandId;
          logger.debug(`✉️ [ReportScheduler] Triggering scheduled report for brandId: ${brandId} (Scheduled Day: ${scheduledDay})`);

          const title = `Báo cáo phân tích tự động định kỳ - Thương hiệu ${brandName}`;

          const sendPromise = reportService.sendReportImmediately(brandId, null, {
            title,
            format: config.format || 'PDF',
            dateRange: 'Tháng trước', // Always report on previous month for monthly report
            platforms: platforms.length > 0 ? platforms : ['Facebook', 'YouTube'],
            isWhiteLabel: false,
            emails: emailsList,
            message: config.emailText || `Xin chào,\n\nĐây là báo cáo phân tích tự động định kỳ tháng trước cho thương hiệu ${brandName}.\n\nTrân trọng.`
          }).then(() => {
            logger.debug(`✅ [ReportScheduler] Scheduled report sent successfully for brand: ${brandName}`);
          }).catch(err => {
            console.error(`❌ [ReportScheduler] Failed to send scheduled report for brand ${brandName}:`, err.message);
          });

          pendingSends.push(sendPromise);
        }
      } catch (configErr) {
        console.error(`❌ [ReportScheduler] Error processing schedule config for brand ${config.brandId}:`, configErr.message);
      }
    }

    await Promise.all(pendingSends);
  }

  _safeJsonParseArray(str) {
    try {
      const parsed = JSON.parse(str);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
}

module.exports = new ReportSchedulerService();
