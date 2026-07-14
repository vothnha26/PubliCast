const { Worker } = require('bullmq');
const { defaultConnection } = require('../config/bullmq');
const { QUEUE_CONFIG } = require('../constants/video-publish.constants');
const socialPlatformFactory = require('../services/social/social-platform.factory');
const socialAccountRepository = require('../repositories/social/social-account.repository');

/**
 * BullMQ Worker for Social Account Data Sync
 */
const socialWorker = new Worker(QUEUE_CONFIG.SOCIAL.NAME, async (job) => {
  if (job.name === QUEUE_CONFIG.SOCIAL.JOB_SYNC) {
    const { socialAccountId, platform, brandId } = job.data;
    
    console.log(`[Social Worker] Starting job ${job.id} for platform: ${platform}, account: ${socialAccountId}`);
    
    // Cập nhật trạng thái đồng bộ sang PARTIAL (Đã có Profile, đang sync Analytics)
    await socialAccountRepository.updateSyncStatus(socialAccountId, 'PARTIAL');

    try {
      const service = socialPlatformFactory.getService(platform);
      
      // Đồng bộ dữ liệu 3 tháng (90 ngày) gần nhất
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      await service.syncChannelMetrics(socialAccountId, startDate, endDate);
      
      // Cập nhật trạng thái SUCCESS và thời gian đồng bộ cuối cùng
      await socialAccountRepository.updateSyncStatus(socialAccountId, 'SUCCESS');
      await socialAccountRepository.updateLastSyncAt(socialAccountId);
      
      console.log(`[Social Worker] Successfully synced metrics for account: ${socialAccountId}`);
    } catch (err) {
      // Cập nhật trạng thái FAILED
      await socialAccountRepository.updateSyncStatus(socialAccountId, 'FAILED');
      
      // An toàn logs: Chỉ log các trường an toàn, TUYỆT ĐỐI không in object job.data hay tokens ra logs
      console.error(`[Social Worker] Failed to sync metrics for platform: ${platform}, account: ${socialAccountId}. Error: ${err.message}`);
      
      throw err; // Ném lỗi để BullMQ kích hoạt cơ chế retry (Exponential Backoff)
    }
  } else {
    throw new Error(`Unhandled job type: ${job.name} in Social Worker`);
  }
}, {
  ...defaultConnection,
  concurrency: 3 // Chỉ mở tối đa 3 connection song song để bảo vệ connection pool của database
});

// Event Listeners cho giám sát
socialWorker.on('completed', (job) => {
  console.log(`[Social Worker] Job ${job.id} completed!`);
});

socialWorker.on('failed', (job, err) => {
  // An toàn logs: không log thông tin nhạy cảm của job.data
  console.error(`[Social Worker] Job ${job.id} failed. Error: ${err.message}`);
});

module.exports = socialWorker;
