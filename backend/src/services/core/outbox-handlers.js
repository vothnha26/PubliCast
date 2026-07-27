/**
 * Outbox Handlers — Strategy Pattern (theo khuôn POLICY_EVALUATORS).
 *
 * Mỗi entry: async (payload) => void. Ném lỗi để dispatcher tự retry.
 * Thêm loại side-effect mới: thêm 1 key vào OUTBOX_EVENT_TYPES (outbox.constants.js)
 * + 1 hàm ở đây — KHÔNG sửa outbox-dispatcher.service.js (Open/Closed).
 */
const { OUTBOX_EVENT_TYPES } = require('../../constants/outbox.constants');
const { upsertPublishJob, removePublishJob } = require('../../queues/publish.queue');
const { socialQueue } = require('../../queues/social.queue');
const { QUEUE_CONFIG } = require('../../constants/video-publish.constants');
const initPostSubscribers = require('../../events/subscribers/post.subscriber');
const { POST_DOMAIN_EVENT_HANDLERS } = initPostSubscribers;
const brandService = require('../workspace/brand.service');
const emailService = require('../core/email.service');
const revocationWebhookService = require('../integrations/revocation-webhook.service');

const OUTBOX_HANDLERS = {
  [OUTBOX_EVENT_TYPES.POST_PUBLISH_UPSERT]: async (payload) => {
    await upsertPublishJob(payload.postId, payload.scheduledAt);
  },
  [OUTBOX_EVENT_TYPES.POST_PUBLISH_REMOVE]: async (payload) => {
    await removePublishJob(payload.postId);
  },
  [OUTBOX_EVENT_TYPES.POST_DOMAIN_EVENT]: async (payload) => {
    // Gọi TRỰC TIẾP (await) thay vì eventEmitter.emit — EventEmitter.emit không đợi
    // listener async và không propagate lỗi ngược lại, nên throw bên trong sẽ không
    // tới được đây để dispatcher retry nếu dùng emit. Xem post.subscriber.js.
    const handler = POST_DOMAIN_EVENT_HANDLERS[payload.eventName];
    if (!handler) throw new Error(`No POST_DOMAIN_EVENT handler registered for eventName=${payload.eventName}`);
    await handler(payload.eventArgs);
  },
  [OUTBOX_EVENT_TYPES.USER_DEFAULT_BRAND_CREATE]: async (payload) => {
    await brandService.createDefaultBrand(payload.userId);
  },
  [OUTBOX_EVENT_TYPES.USER_SEND_WELCOME_OTP]: async (payload) => {
    await emailService.sendOTP(payload.email, payload.otp);
  },
  [OUTBOX_EVENT_TYPES.SOCIAL_SYNC_ENQUEUE]: async (payload) => {
    // jobId cố định theo socialAccountId — idempotent, khác với social.subscriber.js
    // cũ (đã bỏ) từng để BullMQ tự sinh ID ngẫu nhiên mỗi lần. remove trước khi add
    // (giống upsertPublishJob) để reconnect nhanh liên tiếp không bị lỗi "job đã tồn tại".
    const jobId = `social-sync-${payload.socialAccountId}`;
    await socialQueue.remove(jobId);
    await socialQueue.add(
      QUEUE_CONFIG.SOCIAL.JOB_SYNC,
      { socialAccountId: payload.socialAccountId, platform: payload.platform, brandId: payload.brandId },
      { jobId }
    );
  },
  [OUTBOX_EVENT_TYPES.INTEGRATION_REVOCATION_WEBHOOK]: async (payload) => {
    // One outbox event per client (see revocation-webhook.service.js's
    // buildOutboxPayloadsForAllClients) — throwing here only retries
    // delivery to payload.clientId, never re-sends to a client that
    // already got a 2xx.
    await revocationWebhookService.sendToClient(payload.clientId, payload.eventPayload);
  }
};

module.exports = { OUTBOX_HANDLERS };
