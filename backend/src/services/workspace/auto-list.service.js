const autoListRepository = require('../../repositories/workspace/auto-list.repository');
const postRepository = require('../../repositories/workspace/post.repository');
const { ScheduleStrategyFactory } = require('../../utils/scheduler-strategies');
const { eventEmitter, EVENTS } = require('../../events/event-emitter');
const { AUTOLIST_TYPES, POST_STATUS } = require('../../utils/constants');
const { upsertPublishJob, removePublishJob } = require('../../queues/publish.queue');

class AutoListService {
  async getAutoLists(brandId) {
    const lists = await autoListRepository.findManyByBrand(brandId);
    return lists.map(list => this._formatAutoListResponse(list));
  }

  async getAutoListDetails(id) {
    return autoListRepository.findById(id);
  }

  async createAutoList(brandId, data) {
    const preparedData = this._prepareAutoListData(data, brandId);
    const created = await autoListRepository.create(preparedData);
    
    eventEmitter.emit(EVENTS.AUTOLIST.CREATED, { autoListId: created.id });
    return this.getAutoListDetails(created.id);
  }

  async updateAutoList(id, data) {
    const preparedData = this._prepareAutoListData(data);
    await autoListRepository.update(id, preparedData);

    eventEmitter.emit(EVENTS.AUTOLIST.UPDATED, { autoListId: id });
    return this.getAutoListDetails(id);
  }

  async deleteAutoList(id) {
    const list = await autoListRepository.findById(id);
    if (list) {
      console.log(`[deleteAutoList] Found list ${id} with ${list.posts ? list.posts.length : 0} posts`);
      const pendingPosts = (list.posts || []).filter(p => p.status === POST_STATUS.SCHEDULED);
      console.log(`[deleteAutoList] Found ${pendingPosts.length} pending scheduled posts`);
      for (const p of pendingPosts) {
        await removePublishJob(p.id);
      }
      return autoListRepository.delete(id);
    }
  }

  async updateLastPostedAt(id, lastPostedAt) {
    await autoListRepository.update(id, { lastPostedAt });
  }

  async toggleStatus(id) {
    const list = await autoListRepository.findById(id);
    if (!list) throw new Error('AutoList not found');
    
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
    
    return this.getAutoListDetails(id);
  }

  async recalculateQueueSchedules(autoListId) {
    const autoList = await autoListRepository.findById(autoListId);
    if (!autoList) return;

    await this._updateAutoListStats(autoList);
    
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
        await postRepository.update(p.id, { autoListId: null });

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
        await postRepository.create(duplicateData);
      }
      
      // Re-fetch to get the revived posts
      const refreshedList = await autoListRepository.findById(autoListId);
      unpublishedPosts = (refreshedList.posts || []).filter(p => p.status === POST_STATUS.DRAFT);
    }

    if (unpublishedPosts.length === 0) return;

    await this._updatePostSchedules(autoList, unpublishedPosts);
  }

  /**
   * Persist custom drag-and-drop order by updating createdAt timestamps sequentially
   */
  async reorderPosts(autoListId, orderedPostIds) {
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
    return this.getAutoListDetails(autoListId);
  }

  // ============= Private Helper Methods =============

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

  async _updateAutoListStats(autoList) {
    const allPosts = autoList.posts || [];
    await autoListRepository.updateStats(autoList.id, {
        totalPostsCount: allPosts.length,
        publishedPostsCount: allPosts.filter(p => p.status === POST_STATUS.PUBLISHED).length
    });
  }

  async _updatePostSchedules(autoList, unpublishedPosts) {
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
      const postId = unpublishedPosts[i].id;
      const scheduledAt = slots[i] || new Date();
      const newStatus = autoList.isActive ? POST_STATUS.SCHEDULED : POST_STATUS.DRAFT;

      await postRepository.update(postId, {
          scheduledAt,
          status: newStatus
      });

      // Update BullMQ queue based on current active state
      if (autoList.isActive) {
        await upsertPublishJob(postId, scheduledAt);
      } else {
        await removePublishJob(postId);
      }
    }
  }
}

module.exports = new AutoListService();
