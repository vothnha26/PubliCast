const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const reportService = require('./report.service');
const prisma = require('../../config/prisma');
const redisClient = require('../../config/redis');
const DistributedLockService = require('../social/distributed-lock.service');
const { LOCK_CONFIG } = require('../../utils/constants');

const lockService = new DistributedLockService(redisClient);

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
      console.log('⏰ [ReportScheduler] Starting daily report schedule scan...');
      try {
        await this.runScanWithLock();
      } catch (error) {
        console.error('❌ [ReportScheduler] Error running scheduled task:', error);
      }
    });

    console.log('✅ [ReportScheduler] Cron service initialized successfully (Running daily at 08:00 AM).');
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
      console.log('ℹ️ [ReportScheduler] Another instance is already running the daily scan, skipping.');
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
    const reportsDir = path.join(__dirname, '../../../uploads/reports');
    if (!fs.existsSync(reportsDir)) {
      console.log('ℹ️ [ReportScheduler] Reports directory does not exist. Skipping scan.');
      return;
    }

    const files = fs.readdirSync(reportsDir);
    const configFiles = files.filter(f => f.startsWith('config_') && f.endsWith('.json'));

    if (configFiles.length === 0) {
      console.log('ℹ️ [ReportScheduler] No brand configurations found.');
      return;
    }

    const today = new Date();
    const currentDay = today.getDate();
    
    // Check if today is the last day of the month
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const isLastDayOfMonth = tomorrow.getDate() === 1;

    console.log(`🔍 [ReportScheduler] Scanning ${configFiles.length} config file(s). Today is Day ${currentDay} of the month. (Last day: ${isLastDayOfMonth})`);

    // Collected and awaited (not fire-and-forget) so the distributed lock in
    // runScanWithLock() stays held for the full duration of email delivery,
    // not just for building the list of brands to email.
    const pendingSends = [];

    for (const file of configFiles) {
      try {
        const brandIdMatch = file.match(/^config_(.+)\.json$/);
        if (!brandIdMatch) continue;
        const brandId = brandIdMatch[1];

        // Read config
        const configPath = path.join(reportsDir, file);
        const raw = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(raw);

        // Skip if not enabled or no email recipients
        if (!config.receiveEmail || !config.emailsList || config.emailsList.length === 0) {
          continue;
        }

        const scheduledDay = config.dayOfMonth || 1;
        let isScheduledToday = false;

        if (scheduledDay === 'last') {
          isScheduledToday = isLastDayOfMonth;
        } else {
          isScheduledToday = currentDay === parseInt(scheduledDay);
        }

        if (isScheduledToday) {
          console.log(`✉️ [ReportScheduler] Triggering scheduled report for brandId: ${brandId} (Scheduled Day: ${scheduledDay})`);
          
          // Get brand information to generate dynamic title
          const brand = await prisma.brand.findUnique({
            where: { id: brandId }
          });
          const brandName = brand ? brand.name : brandId;

          const title = `Báo cáo phân tích tự động định kỳ - Thương hiệu ${brandName}`;

          const sendPromise = reportService.sendReportImmediately(brandId, null, {
            title,
            format: config.format || 'PDF',
            dateRange: 'Tháng trước', // Always report on previous month for monthly report
            platforms: config.platforms || ['Facebook', 'YouTube'],
            isWhiteLabel: false,
            emails: config.emailsList,
            message: config.emailText || `Xin chào,\n\nĐây là báo cáo phân tích tự động định kỳ tháng trước cho thương hiệu ${brandName}.\n\nTrân trọng.`
          }).then(() => {
            console.log(`✅ [ReportScheduler] Scheduled report sent successfully for brand: ${brandName}`);
          }).catch(err => {
            console.error(`❌ [ReportScheduler] Failed to send scheduled report for brand ${brandName}:`, err.message);
          });

          pendingSends.push(sendPromise);
        }
      } catch (fileErr) {
        console.error(`❌ [ReportScheduler] Error processing config file ${file}:`, fileErr.message);
      }
    }

    await Promise.all(pendingSends);
  }
}

module.exports = new ReportSchedulerService();
