const BaseStep = require('../../../../core/pipeline/base.step');
const postRepository = require('../../../../repositories/workspace/post.repository');
const autoListRepository = require('../../../../repositories/workspace/auto-list.repository');
const notificationService = require('../../../core/notification.service');
const { POST_STATUS, NOTIFICATION_TYPES } = require('../../../../utils/constants');

class UpdatePostStatusStep extends BaseStep {
  async execute(context) {
    const { post, results } = context;

    if (!results || results.length === 0) {
      return;
    }

    const allSuccessful = results.every(r => r.success);
    const firstFailure = results.find(r => !r.success);

    // Logic: Handle AutoList Loop (Repeat) mode
    let shouldLoop = false;
    if (post.autoListId) {
      const autoList = await autoListRepository.findById(post.autoListId);
      if (autoList && autoList.loopEnabled) {
        shouldLoop = true;
      }
    }

    // Build platformIdMap for successful publications
    const platformIdMap = {};
    results.forEach(r => {
      if (r.success && r.result) {
        platformIdMap[r.platform] = r.result.platformVideoId || r.result.id;
      }
    });
    const platformPostIdStr = Object.keys(platformIdMap).length > 0 ? JSON.stringify(platformIdMap) : null;

    if (allSuccessful) {
      const primaryResult = results[0].result;
      console.log(`[UpdatePostStatusStep] 🎉 Post ${post.id} published successfully on all platforms: ${results.map(r => r.platform).join(', ')}`);

      if (shouldLoop) {
        await this._handleLoopCycle(post, {
          status: POST_STATUS.PUBLISHED,
          publishedAt: primaryResult.publishedAt || new Date(),
          platformPostId: platformPostIdStr
        });
      } else {
        // Standard non-loop behavior: mark the post itself as published
        await postRepository.update(post.id, {
          status: POST_STATUS.PUBLISHED,
          platformPostId: platformPostIdStr,
          publishedAt: primaryResult.publishedAt || new Date()
        });
      }

      await this._notifyPublishSuccess(post, results);
    } else {
      // Truncate failureReason để không vượt VARCHAR(191) của DB
      const failureReason = firstFailure
        ? `${firstFailure.platform}: ${firstFailure.error}`.substring(0, 190)
        : 'Unknown publishing error';

      console.warn(`[UpdatePostStatusStep] ⚠️ Post ${post.id} publication failed/partially failed. Failure reason: "${failureReason}". Results details:`, JSON.stringify(results, null, 2));

      // Handle Failure
      if (shouldLoop) {
        await this._handleLoopCycle(post, {
          status: POST_STATUS.FAILED,
          failureReason,
          platformPostId: platformPostIdStr
        });
      } else {
        await postRepository.update(post.id, {
          status: POST_STATUS.FAILED,
          failureReason,
          platformPostId: platformPostIdStr
        });
      }

      await this._notifyPublishFailure(post, failureReason);
    }

    // Post-Publish: Trigger stats update and rescheduling for AutoLists
    if (post.autoListId) {
      const autoListService = require('../../auto-list.service');
      await autoListService.updateLastPostedAt(post.autoListId, new Date());
      await autoListService.recalculateQueueSchedules(post.autoListId);
    }
  }

  /**
   * Performs the loop cycle:
   * 1. Creates a published or failed clone of the post for history/analytics (with autoListId = null).
   * 2. Resets the original post to the end of the queue.
   */
  async _handleLoopCycle(post, cycleData) {
    try {
      // 1. Snapshot the publication result into a new static record (history)
      await postRepository.create({
        brandId: post.brandId,
        createdByUserId: post.createdByUserId,
        title: post.title,
        caption: post.caption,
        type: post.type,
        status: cycleData.status,
        targetPlatforms: post.targetPlatforms,
        mediaUrls: post.mediaUrls,
        mediaThumbnailUrls: post.mediaThumbnailUrls,
        hashtags: post.hashtags,
        mentions: post.mentions,
        firstComment: post.firstComment,
        locationId: post.locationId,
        locationName: post.locationName,
        linkUrl: post.linkUrl,
        altText: post.altText,
        metadata: post.metadata,
        isCollaboration: post.isCollaboration,
        collaboratorHandle: post.collaboratorHandle,
        publishedAt: cycleData.publishedAt || null,
        platformPostId: cycleData.platformPostId || null,
        failureReason: cycleData.failureReason || null,
        isLibrary: false
        // autoListId is NULL for the history snapshot so it doesn't appear in the queue
      });

      // 2. Recycle the original post record to the end of the queue
      await postRepository.update(post.id, {
        createdAt: new Date(), // Move to end
        status: POST_STATUS.DRAFT, // autoListService will set to SCHEDULED if list is active
        platformPostId: null,
        publishedAt: null,
        failureReason: null
      });
    } catch (err) {
      console.error('[UpdatePostStatusStep] Loop cycle failure:', err.message);
    }
  }

  async _notifyPublishSuccess(post, results) {
    try {
      const platforms = results.map(r => r.platform).filter(Boolean).join(', ');
      await notificationService.create({
        userId: post.createdByUserId,
        brandId: post.brandId,
        type: NOTIFICATION_TYPES.CONTENT,
        title: 'Post published successfully',
        message: `"${post.title}" was published${platforms ? ` to ${platforms}` : ''}.`,
        actionUrl: '/planner'
      });
    } catch (err) {
      console.error('[UpdatePostStatusStep] Failed to create publish success notification:', err.message);
    }
  }

  async _notifyPublishFailure(post, failureReason) {
    try {
      await notificationService.create({
        userId: post.createdByUserId,
        brandId: post.brandId,
        type: NOTIFICATION_TYPES.CONTENT,
        title: 'Post publishing failed',
        message: `"${post.title}" could not be published. ${failureReason}`,
        actionUrl: '/planner'
      });
    } catch (err) {
      console.error('[UpdatePostStatusStep] Failed to create publish failure notification:', err.message);
    }
  }
}

module.exports = UpdatePostStatusStep;
