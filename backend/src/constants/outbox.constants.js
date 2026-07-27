const OUTBOX_EVENT_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
};

/**
 * Mỗi entry = 1 loại side-effect có thể phát sinh từ 1 thay đổi nghiệp vụ.
 * Thêm loại mới: thêm 1 key ở đây + 1 handler trong outbox-handlers.js — không sửa dispatcher.
 */
const OUTBOX_EVENT_TYPES = {
  POST_PUBLISH_UPSERT: 'POST_PUBLISH_UPSERT',   // upsertPublishJob(postId, scheduledAt)
  POST_PUBLISH_REMOVE: 'POST_PUBLISH_REMOVE',   // removePublishJob(postId)
  POST_DOMAIN_EVENT: 'POST_DOMAIN_EVENT',       // re-emit eventEmitter cho post.subscriber.js xử lý phần còn lại
  SOCIAL_SYNC_ENQUEUE: 'SOCIAL_SYNC_ENQUEUE',   // socialQueue.add JOB_SYNC (đợt 3)
  USER_DEFAULT_BRAND_CREATE: 'USER_DEFAULT_BRAND_CREATE', // brandService.createDefaultBrand(userId) — thay eventEmitter fire-and-forget (#108 I10)
  USER_SEND_WELCOME_OTP: 'USER_SEND_WELCOME_OTP',         // emailService.sendOTP(email, otp) — thay eventEmitter fire-and-forget (#108 I10)
  INTEGRATION_REVOCATION_WEBHOOK: 'INTEGRATION_REVOCATION_WEBHOOK' // revocationWebhookService.dispatch(payload) — critical-event push to external integrations (Convo), see plan.txt mục 6
};

const OUTBOX_DISPATCHER_CONFIG = {
  POLL_INTERVAL_MS: 5000,
  BATCH_SIZE: 20,
  DEFAULT_MAX_ATTEMPTS: 5,
  BACKOFF_BASE_MS: 5000,        // cùng độ lớn với publish.queue.js hiện có (5000ms)
  BACKOFF_FACTOR: 2,            // exponential: 5s,10s,20s,40s,80s
  BACKOFF_MAX_MS: 5 * 60 * 1000, // trần 5 phút tránh backoff tăng vô hạn
  // Row kẹt ở PROCESSING lâu hơn ngưỡng này (dispatcher crash giữa claim và xử lý
  // xong) bị coi là "stale" và được reclaim lại qua đúng retry-policy hiện có.
  // Ngưỡng phải rộng hơn nhiều lần POLL_INTERVAL_MS để không reclaim nhầm row
  // đang được xử lý bình thường.
  STALE_PROCESSING_MS: 2 * 60 * 1000
};

module.exports = { OUTBOX_EVENT_STATUS, OUTBOX_EVENT_TYPES, OUTBOX_DISPATCHER_CONFIG };
