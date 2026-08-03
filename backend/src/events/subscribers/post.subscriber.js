const { eventEmitter, EVENTS } = require('../event-emitter');
const postService = require('../../services/workspace/post.service');
const autoListService = require('../../services/workspace/auto-list.service');
const { POST_STATUS } = require('../../utils/constants');
const logger = require('../../utils/logger');

/**
 * Handle AutoList recalculation. Dùng chung cho mọi domain event post ảnh hưởng lịch
 * AutoList. Lỗi được nuốt nội bộ (autolist recalculation là best-effort, không phải
 * side-effect bắt buộc phải retry qua outbox — khác với publish job).
 */
const handleAutoListUpdate = async ({ post, autoListId }) => {
  const targetId = autoListId || post?.autoListId;
  if (targetId) {
    try {
      logger.debug(`[Event] Recalculating AutoList ${targetId}`);
      await autoListService.recalculateQueueSchedules(targetId);
    } catch (err) {
      console.error(`[Event Error] AutoList recalculation failed for ${targetId}:`, err.message);
    }
  }
};

/**
 * Xử lý phần "phi-publish" của POST.CREATED — chỉ còn Native Scheduling.
 * Được gọi TRỰC TIẾP (await) từ OUTBOX_HANDLERS[POST_DOMAIN_EVENT], KHÔNG qua
 * eventEmitter.emit — vì EventEmitter.emit không đợi listener async và không
 * propagate lỗi ngược lại, nên throw ở đây sẽ không tới được outbox dispatcher để
 * retry nếu gọi qua emit (xem outbox-handlers.js). Lỗi ở đây được để throw tự nhiên,
 * dispatcher sẽ retry theo backoff và tạo notification khi dead-letter.
 */
async function handlePostCreatedDomainEvent({ post, options }) {
  if (post.status === POST_STATUS.SCHEDULED) {
    logger.debug(`[Event] Checking Native Scheduling for post ${post.id}`);
    await postService._handleNativeScheduling(post, options);
  }
  await handleAutoListUpdate({ post });
}

async function handlePostUpdatedDomainEvent({ post, options, statusChangedToPublished }) {
  if (!statusChangedToPublished && post.status === POST_STATUS.SCHEDULED) {
    logger.debug(`[Event] Checking Native Scheduling for updated post ${post.id}`);
    await postService._handleNativeScheduling(post, options);
  }
  await handleAutoListUpdate({ post });
}

async function handlePostBulkDeletedDomainEvent({ autolistIds }) {
  for (const id of autolistIds) {
    await handleAutoListUpdate({ autoListId: id });
  }
}

async function handlePostBulkRestoredDomainEvent({ autolistIds }) {
  for (const id of autolistIds) {
    await handleAutoListUpdate({ autoListId: id });
  }
}

/**
 * Map eventName → handler, dùng bởi OUTBOX_HANDLERS[POST_DOMAIN_EVENT] để gọi trực
 * tiếp (await) thay vì qua eventEmitter.emit — đảm bảo lỗi propagate đúng cho outbox
 * dispatcher retry.
 */
const POST_DOMAIN_EVENT_HANDLERS = {
  [EVENTS.POST.CREATED]: handlePostCreatedDomainEvent,
  [EVENTS.POST.UPDATED]: handlePostUpdatedDomainEvent,
  [EVENTS.POST.BULK_DELETED]: handlePostBulkDeletedDomainEvent,
  [EVENTS.POST.BULK_RESTORED]: handlePostBulkRestoredDomainEvent
};

/**
 * Khởi tạo subscriber cho các event POST.* CHƯA đi qua outbox (DELETED/RESTORED —
 * hiện chưa có nơi nào emit các event này, giữ lại để tương thích khi có nơi emit
 * trong tương lai). POST.CREATED/UPDATED/BULK_DELETED/BULK_RESTORED không còn đăng ký
 * qua eventEmitter.on ở đây — chúng được outbox dispatcher gọi trực tiếp qua
 * POST_DOMAIN_EVENT_HANDLERS.
 */
const initPostSubscribers = () => {
  eventEmitter.on(EVENTS.POST.DELETED, handleAutoListUpdate);
  eventEmitter.on(EVENTS.POST.RESTORED, handleAutoListUpdate);
};

module.exports = initPostSubscribers;
module.exports.POST_DOMAIN_EVENT_HANDLERS = POST_DOMAIN_EVENT_HANDLERS;
