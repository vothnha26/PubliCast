const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const reportService = require('./report.service');
const prisma = require('../../config/prisma');

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
        await this.scanAndSendReports();
      } catch (error) {
        console.error('❌ [ReportScheduler] Error running scheduled task:', error);
      }
    });

    console.log('✅ [ReportScheduler] Cron service initialized successfully (Running daily at 08:00 AM).');
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

          // Trigger email report asynchronously to avoid blocking the main loop
          reportService.sendReportImmediately(brandId, null, {
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
        }
      } catch (fileErr) {
        console.error(`❌ [ReportScheduler] Error processing config file ${file}:`, fileErr.message);
      }
    }
  }
}

module.exports = new ReportSchedulerService();
