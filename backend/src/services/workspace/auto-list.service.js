const prisma = require('../../config/prisma');
const autoListRepository = require('../../repositories/workspace/auto-list.repository');
const postRepository = require('../../repositories/workspace/post.repository');
const { ScheduleStrategyFactory } = require('../../utils/scheduler-strategies');
const { eventEmitter, EVENTS } = require('../../events/event-emitter');
const { AUTOLIST_TYPES, POST_STATUS, PERMISSION_KEYS } = require('../../utils/constants');
const { upsertPublishJob, removePublishJob } = require('../../queues/publish.queue');
const authorizationFacade = require('../auth/authorization.facade');
const validationFacade = require('./post/validators/validation.facade');

class AutoListService {
  async getAutoLists(brandId) {
    const lists = await autoListRepository.findManyByBrand(brandId);
    return lists.map(list => this._formatAutoListResponse(list));
  }

  async getAutoListDetails(id, operatorId) {
    return this._assertCanManage(id, operatorId, PERMISSION_KEYS.CREATE_POSTS);
  }

  async createAutoList(brandId, data, operatorId) {
    const preparedData = this._prepareAutoListData(data, brandId);
    const created = await autoListRepository.create(preparedData);
    
    eventEmitter.emit(EVENTS.AUTOLIST.CREATED, { autoListId: created.id });
    return this.getAutoListDetails(created.id, operatorId);
  }

  async updateAutoList(id, data, operatorId) {
    await this._assertCanManage(id, operatorId, PERMISSION_KEYS.CREATE_POSTS);

    const preparedData = this._prepareAutoListData(data);
    await autoListRepository.update(id, preparedData);

    eventEmitter.emit(EVENTS.AUTOLIST.UPDATED, { autoListId: id });
    return autoListRepository.findById(id);
  }

  async deleteAutoList(id, operatorId) {
    await this._assertCanManage(id, operatorId, PERMISSION_KEYS.DELETE_POSTS);

    return prisma.$transaction(async (tx) => {
      // Lock first to serialize against a concurrent recalculateQueueSchedules
      // call on the same AutoList (e.g. a post publishing right as this delete runs).
      await autoListRepository.lockForUpdate(id, tx);

      const fresh = await autoListRepository.findById(id, tx);
      if (!fresh) return; // Already deleted by another request — idempotent.

      console.log(`[deleteAutoList] Found list ${id} with ${fresh.posts ? fresh.posts.length : 0} posts`);
      const pendingPosts = (fresh.posts || []).filter(p => p.status === POST_STATUS.SCHEDULED);
      console.log(`[deleteAutoList] Found ${pendingPosts.length} pending scheduled posts`);
      for (const p of pendingPosts) {
        await removePublishJob(p.id);
      }
      return autoListRepository.delete(id, tx);
    });
  }

  async updateLastPostedAt(id, lastPostedAt) {
    try {
      await autoListRepository.update(id, { lastPostedAt });
    } catch (err) {
      // The AutoList can be deleted while one of its posts is mid-publish (race
      // with deleteAutoList) — don't let that break the post's own publish-status
      // update, which is the caller's primary concern.
      if (err.code === 'P2025') {
        console.warn(`[AutoListService] updateLastPostedAt skipped — AutoList ${id} no longer exists.`);
        return;
      }
      throw err;
    }
  }

  async toggleStatus(id, operatorId) {
    const list = await this._assertCanManage(id, operatorId, PERMISSION_KEYS.CREATE_POSTS);

    const newActiveState = !list.isActive;
    await autoListRepository.update(id, { isActive: newActiveState });

    // If paused, remove all pending jobs from BullMQ
    if (!newActiveState) {
      const pendingPosts = (list.posts || []).filter(p => p.status === POST_STATUS.SCHEDULED);
      for (const p of pendingPosts) {
        await removePublishJob(p.id);
      }
    }

    eventEmitter.emit(EVENTS.AUTOLIST.TOGGLED, { autoListId: id });

    return autoListRepository.findById(id);
  }

  async recalculateQueueSchedules(autoListId) {
    return prisma.$transaction(async (tx) => {
      // Lock first — multiple posts in the same AutoList can each trigger this
      // after publishing near-simultaneously (BullMQ concurrency: 5), and
      // without serializing them here they'd read the same stale queue state
      // and write conflicting schedules/loop-revive duplicates.
      await autoListRepository.lockForUpdate(autoListId, tx);

      const autoList = await autoListRepository.findById(autoListId, tx);
      if (!autoList) return;

      await this._updateAutoListStats(autoList, tx);

      let unpublishedPosts = (autoList.posts || []).filter(p => p.status !== POST_STATUS.PUBLISHED && p.status !== POST_STATUS.FAILED && p.status !== POST_STATUS.REJECTED);

      // Logic: If Loop is enabled but everything is published or failed, duplicate posts as new DRAFTs to preserve history
      if (unpublishedPosts.length === 0 && autoList.loopEnabled && (autoList.posts || []).length > 0) {
        console.log(`[AutoList] 🔄 Queue ${autoListId} dry but Loop enabled. Reviving all posts by duplicating...`);

        const postsToRevive = (autoList.posts || []).filter(p =>
          (p.status === POST_STATUS.PUBLISHED || p.status === POST_STATUS.FAILED || p.status === POST_STATUS.REJECTED) && !p.isDeleted
        );

        const baseTime = new Date();
        for (let idx = 0; idx < postsToRevive.length; idx++) {
          const p = postsToRevive[idx];
          // 1. Detach original post from this Autolist (so it becomes a static history record)
          await postRepository.update(p.id, { autoListId: null }, tx);

          // 2. Create the revived draft in the queue (use incremented createdAt to preserve ordering)
          const duplicateData = {
            brandId: p.brandId,
            createdByUserId: p.createdByUserId,
            title: p.title,
            caption: p.caption,
            type: p.type,
            status: POST_STATUS.DRAFT,
            targetPlatforms: p.targetPlatforms,
            mediaUrls: p.mediaUrls,
            mediaThumbnailUrls: p.mediaThumbnailUrls,
            hashtags: p.hashtags,
            mentions: p.mentions,
            firstComment: p.firstComment,
            locationId: p.locationId,
            locationName: p.locationName,
            linkUrl: p.linkUrl,
            altText: p.altText,
            metadata: p.metadata,
            isCollaboration: p.isCollaboration,
            collaboratorHandle: p.collaboratorHandle,
            autoListId: autoListId,
            createdAt: new Date(baseTime.getTime() + idx * 1000)
          };
          await postRepository.create(duplicateData, tx);
        }

        // Re-fetch (still inside the transaction, still holding the lock) to get the revived posts
        const refreshedList = await autoListRepository.findById(autoListId, tx);
        unpublishedPosts = (refreshedList.posts || []).filter(p => p.status === POST_STATUS.DRAFT);
      }

      if (unpublishedPosts.length === 0) return;

      await this._updatePostSchedules(autoList, unpublishedPosts, tx);
    });
  }

  /**
   * Persist custom drag-and-drop order by updating createdAt timestamps sequentially
   */
  async reorderPosts(autoListId, orderedPostIds, operatorId) {
    await this._assertCanManage(autoListId, operatorId, PERMISSION_KEYS.CREATE_POSTS);

    if (!orderedPostIds || !Array.isArray(orderedPostIds)) return;

    const baseTime = new Date();
    // Update sequentially to guarantee incremental timestamps
    for (let i = 0; i < orderedPostIds.length; i++) {
      const postTime = new Date(baseTime.getTime() + i * 1000);
      await postRepository.update(orderedPostIds[i], {
        createdAt: postTime
      });
    }

    // Trigger recalculation using the new database sorting order
    await this.recalculateQueueSchedules(autoListId);
    return autoListRepository.findById(autoListId);
  }

  // ============= Private Helper Methods =============

  /**
   * Resolves the AutoList's brandId and checks the operator's permission there —
   * :id-based routes (see auto-list.routes.js) have no brandId in the request, so
   * this check can't run as route middleware like checkPermission does elsewhere.
   * AutoList reuses the Post permission keys (CREATE_POSTS/DELETE_POSTS) since it's
   * fundamentally a queue of posts, not a separate permission domain.
   */
  async _assertCanManage(id, operatorId, permissionKey) {
    const autoList = await autoListRepository.findById(id);
    if (!autoList) {
      const error = new Error('AutoList not found');
      error.statusCode = 404;
      throw error;
    }

    const isAuthorized = await authorizationFacade.checkPermission(operatorId, autoList.brandId, permissionKey);
    if (!isAuthorized) {
      const error = new Error('Bạn không có quyền quản lý hàng đợi tự động của thương hiệu này.');
      error.statusCode = 403;
      throw error;
    }

    return autoList;
  }

  _formatAutoListResponse(list) {
    return {
      ...list,
      progress: list.totalPostsCount > 0 
        ? Math.round((list.publishedPostsCount / list.totalPostsCount) * 100) 
        : 0
    };
  }

  _prepareAutoListData(data, brandId) {
    const prepared = {
      name: data.name,
      brandId,
      sourceType: data.sourceType || AUTOLIST_TYPES.SOURCE.MANUAL,
      targetPlatforms: data.targetPlatforms,
      scheduleType: data.scheduleType || AUTOLIST_TYPES.SCHEDULE.INTERVAL,
      intervalMinutes: data.intervalMinutes ? parseInt(data.intervalMinutes) : undefined,
      specificTimes: data.specificTimes,
      activeDays: data.activeDays,
      loopEnabled: data.loopEnabled !== undefined ? (data.loopEnabled === true || data.loopEnabled === 'true') : undefined,
      isActive: data.isActive !== undefined ? (data.isActive === true || data.isActive === 'true') : undefined,
      metadata: data.metadata // Persistence for UI configs
    };

    // Clean up undefined keys for updates
    Object.keys(prepared).forEach(key => prepared[key] === undefined && delete prepared[key]);
    return prepared;
  }

  async _updateAutoListStats(autoList, tx) {
    const allPosts = autoList.posts || [];
    await autoListRepository.updateStats(autoList.id, {
        totalPostsCount: allPosts.length,
        publishedPostsCount: allPosts.filter(p => p.status === POST_STATUS.PUBLISHED).length
    }, tx);
  }

  async _updatePostSchedules(autoList, unpublishedPosts, tx) {
    const strategy = ScheduleStrategyFactory.getStrategy(autoList.scheduleType);
    
    // Find last published post to set as fromDate
    const allPosts = autoList.posts || [];
    const publishedPosts = allPosts
      .filter(p => p.status === POST_STATUS.PUBLISHED && p.publishedAt)
      .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

    let fromDate = new Date();
    if (autoList.lastPostedAt) {
      fromDate = new Date(autoList.lastPostedAt);
    } else if (publishedPosts.length > 0) {
      fromDate = new Date(publishedPosts[0].publishedAt);
    }

    // Protect against stale fromDate values (older than 1 interval) to prevent safety breaks or massive drifts
    const intervalMs = (autoList.intervalMinutes || 60) * 60 * 1000;
    if (fromDate.getTime() < Date.now() - intervalMs) {
      fromDate = new Date();
    }

    const slots = strategy.calculateNextSlots(autoList, unpublishedPosts.length, fromDate, new Date());

    for (let i = 0; i < unpublishedPosts.length; i++) {
      const post = unpublishedPosts[i];
      const postId = post.id;
      const scheduledAt = slots[i] || new Date();
      let newStatus = autoList.isActive ? POST_STATUS.SCHEDULED : POST_STATUS.DRAFT;

      // Vấn đề #3: Trước khi chuyển sang SCHEDULED để enqueue publish, cần validate qua validationFacade
      if (newStatus === POST_STATUS.SCHEDULED) {
        const mediaUrlsStr = post.mediaUrls || '';
        const validMediaUrls = mediaUrlsStr.split(',').map(u => u.trim()).filter(Boolean);
        const hasMedia = validMediaUrls.length > 0;
        const firstMediaUrl = hasMedia ? validMediaUrls[0] : null;
        const ext = firstMediaUrl ? firstMediaUrl.split('.').pop()?.toLowerCase() : null;
        const isVideo = ext ? ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext) : false;

        let options = {};
        if (post.metadata) {
          try {
            options = typeof post.metadata === 'string' ? JSON.parse(post.metadata) : post.metadata;
          } catch (e) {}
        }

        const mediaInfo = {
          hasMedia,
          isVideo,
          format: isVideo ? ext : (ext || 'jpg'),
          duration: options?.videoDuration || null,
          sizeMb: options?.videoSizeMb || null
        };

        const targetPlatforms = post.targetPlatforms ? post.targetPlatforms.split(',').map(p => p.trim()).filter(Boolean) : [];
        const postDataToValidate = {
          title: post.title,
          caption: post.caption,
          type: post.type,
          targetPlatforms,
          options,
          status: POST_STATUS.SCHEDULED
        };

        const validationResult = await validationFacade.validatePost(postDataToValidate, mediaInfo);
        if (!validationResult.isValid) {
          console.warn(`[AutoListService] ⚠️ Post ${postId} failed validation for scheduling: ${validationResult.errors.join('; ')}. Keeping as DRAFT.`);
          newStatus = POST_STATUS.DRAFT;
        }
      }

      await postRepository.update(postId, {
          scheduledAt,
          status: newStatus
      }, tx);

      // Update BullMQ queue dựa trên trạng thái mới đã được validate
      if (newStatus === POST_STATUS.SCHEDULED) {
        await upsertPublishJob(postId, scheduledAt);
      } else {
        await removePublishJob(postId);
      }
    }
  }
}

module.exports = new AutoListService();
