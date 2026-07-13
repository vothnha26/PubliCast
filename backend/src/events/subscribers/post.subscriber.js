const { eventEmitter, EVENTS } = require('../event-emitter');
const postService = require('../../services/workspace/post.service');
const autoListService = require('../../services/workspace/auto-list.service');
const { POST_STATUS } = require('../../utils/constants');

const createErrorNotification = async (post, title, message) => {
  try {
    const notificationService = require('../../services/core/notification.service');
    const { NOTIFICATION_TYPES } = require('../../utils/constants');
    await notificationService.create({
      brandId: post.brandId,
      userId: post.createdByUserId || null,
      title: title,
      message: message,
      type: NOTIFICATION_TYPES.CONTENT
    });
  } catch (notifErr) {
    console.error('[Event Error] Failed to create error notification:', notifErr.message);
  }
};

/**
 * Initialize Post Event Subscribers
 */
const initPostSubscribers = () => {
  // Handle Auto-publishing
  eventEmitter.on(EVENTS.POST.CREATED, async ({ post, options }) => {
    if (post.status === POST_STATUS.PUBLISHED) {
      try {
        console.log(`[Event] Queueing auto-publishing for post ${post.id}`);
        const { upsertPublishJob } = require('../../queues/publish.queue');
        await upsertPublishJob(post.id, new Date());
      } catch (err) {
        console.error(`[Event Error] Auto-publishing queueing failed for post ${post.id}:`, err.message);
        await createErrorNotification(
          post,
          'Đăng bài thất bại',
          `Bài viết "${post.title?.substring(0, 30) || ''}" xếp hàng đăng thất bại. Lỗi: ${err.message}`
        );
      }
    } else if (post.status === POST_STATUS.SCHEDULED) {
      try {
        console.log(`[Event] Checking Native Scheduling for post ${post.id}`);
        await postService._handleNativeScheduling(post, options);
      } catch (err) {
        console.error(`[Event Error] Native Scheduling failed for post ${post.id}:`, err.message);
        await createErrorNotification(
          post,
          'Đặt lịch gốc thất bại',
          `Bài viết "${post.title?.substring(0, 30) || ''}" đặt lịch gốc thất bại. Lỗi: ${err.message}`
        );
      }
    }
  });

  eventEmitter.on(EVENTS.POST.UPDATED, async ({ post, options, statusChangedToPublished }) => {
    if (statusChangedToPublished) {
      try {
        console.log(`[Event] Queueing updated post ${post.id} for publishing`);
        const { upsertPublishJob } = require('../../queues/publish.queue');
        await upsertPublishJob(post.id, new Date());
      } catch (err) {
        console.error(`[Event Error] Publishing queueing failed for updated post ${post.id}:`, err.message);
        await createErrorNotification(
          post,
          'Đăng bài thất bại',
          `Bài viết "${post.title?.substring(0, 30) || ''}" cập nhật & xếp hàng đăng thất bại. Lỗi: ${err.message}`
        );
      }
    } else if (post.status === POST_STATUS.SCHEDULED) {
      try {
        console.log(`[Event] Checking Native Scheduling for updated post ${post.id}`);
        await postService._handleNativeScheduling(post, options);
      } catch (err) {
        console.error(`[Event Error] Native Scheduling failed for updated post ${post.id}:`, err.message);
        await createErrorNotification(
          post,
          'Đặt lịch gốc thất bại',
          `Bài viết "${post.title?.substring(0, 30) || ''}" đặt lịch gốc thất bại sau khi cập nhật. Lỗi: ${err.message}`
        );
      }
    }
  });

  // Handle AutoList recalculation
  const handleAutoListUpdate = async ({ post, autoListId }) => {
    const targetId = autoListId || post?.autoListId;
    if (targetId) {
      try {
        console.log(`[Event] Recalculating AutoList ${targetId}`);
        await autoListService.recalculateQueueSchedules(targetId);
      } catch (err) {
        console.error(`[Event Error] AutoList recalculation failed for ${targetId}:`, err.message);
      }
    }
  };

  eventEmitter.on(EVENTS.POST.CREATED, handleAutoListUpdate);
  eventEmitter.on(EVENTS.POST.UPDATED, handleAutoListUpdate);
  eventEmitter.on(EVENTS.POST.DELETED, handleAutoListUpdate);
  eventEmitter.on(EVENTS.POST.RESTORED, handleAutoListUpdate);

  eventEmitter.on(EVENTS.POST.BULK_DELETED, async ({ autolistIds }) => {
    for (const id of autolistIds) {
      await handleAutoListUpdate({ autoListId: id });
    }
  });

  eventEmitter.on(EVENTS.POST.BULK_RESTORED, async ({ autolistIds }) => {
    for (const id of autolistIds) {
      await handleAutoListUpdate({ autoListId: id });
    }
  });
};

module.exports = initPostSubscribers;
