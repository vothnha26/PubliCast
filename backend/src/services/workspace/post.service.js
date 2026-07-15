require('../../utils/polyfill');
const postRepository = require('../../repositories/workspace/post.repository');
const brandRepository = require('../../repositories/workspace/brand.repository');
const socialPlatformFactory = require('../social/social-platform.factory');
const { POST_STATUS, POST_TYPES, SEPARATORS, WORKSPACE_DEFAULTS, PLATFORMS, splitMediaUrls } = require('../../utils/constants');
const { EVENTS } = require('../../events/event-emitter');
const { OUTBOX_EVENT_TYPES } = require('../../constants/outbox.constants');
const outboxEventRepository = require('../../repositories/core/outbox-event.repository');
const prisma = require('../../config/prisma');
const authorizationFacade = require('../auth/authorization.facade');
const approvalWorkflowService = require('./approval-workflow.service');
const validationFacade = require('./post/validators/validation.facade');
const { QUEUE_CONFIG } = require('../../constants/video-publish.constants');

const QueryPipeline = require('../../core/query-pipeline/query.pipeline');
const PostStatusFilter = require('./post/filters/status.filter');
const PostSearchFilter = require('./post/filters/search.filter');
const PostPlatformFilter = require('./post/filters/platform.filter');
const PostDateRangeFilter = require('./post/filters/date-range.filter');
const PostLibraryFilter = require('./post/filters/library.filter');
const PostDeletedFilter = require('./post/filters/deleted.filter');

const Pipeline = require('../../core/pipeline/pipeline.executor');
const FetchPostStep = require('./post/publish-steps/fetch-post.step');
const SocialPublishStep = require('./post/publish-steps/social-publish.step');
const UpdatePostStatusStep = require('./post/publish-steps/update-db.step');

const ALLOWED_SORT_FIELDS = ['createdAt', 'scheduledAt', 'publishedAt', 'title', 'status'];
const ALLOWED_SORT_ORDERS = ['asc', 'desc'];

class PostService {
  constructor() {
    this.queryPipeline = new QueryPipeline([
      new PostStatusFilter(), new PostSearchFilter(), new PostPlatformFilter(),
      new PostDateRangeFilter(), new PostLibraryFilter(), new PostDeletedFilter()
    ]);

    this.publishPipeline = new Pipeline([
      new FetchPostStep(), new SocialPublishStep(), new UpdatePostStatusStep()
    ]);
  }

  /**
   * Get filtered posts with pagination
   */
  async getPosts(queryParams, brandId) {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = queryParams;
    const { skip, take } = this._getPagination(page, limit);
    const order = this._getSortOrder(sortBy, sortOrder);

    const where = this.queryPipeline.apply({ brandId }, queryParams);
    const { posts, total } = await postRepository.findManyAndCount(where, { skip, take, orderBy: order });

    return {
      data: posts.map(p => this._formatPostResponse(p)),
      meta: { total, page: Math.max(1, parseInt(page) || 1), limit: take, totalPages: Math.ceil(total / take) }
    };
  }

  _parseMediaInfo(firstMediaUrl, hasMedia) {
    if (!firstMediaUrl) {
      return { format: null, isVideo: false };
    }
    const cleanUrl = firstMediaUrl.split('?')[0];
    const ext = cleanUrl.split('.').pop().toLowerCase();
    const knownVideoExts = ['mp4', 'mov', 'webm', 'avi', 'mkv'];
    const knownImageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'];
    
    if (knownVideoExts.includes(ext)) {
      return { format: ext, isVideo: true };
    } else if (knownImageExts.includes(ext)) {
      return { format: ext, isVideo: false };
    } else {
      const lowercaseUrl = firstMediaUrl.toLowerCase();
      if (lowercaseUrl.includes('video') || lowercaseUrl.includes('.mp4') || lowercaseUrl.includes('.mov') || lowercaseUrl.includes('/preview/')) {
        return { format: 'mp4', isVideo: true };
      }
      return { format: 'jpg', isVideo: false };
    }
  }

  /**
   * Create a new post
   */
  async createPost(postData, userId, brandId) {
    // Check monthly post limit
    const brand = await brandRepository.findBrandWithSubscription(brandId);
    if (brand && brand.subscription && brand.subscription.status === 'ACTIVE' && brand.subscription.plan?.planLimit) {
      const maxPosts = brand.subscription.plan.planLimit.maxPostsPerMonth;
      const currentCount = await postRepository.countActivePostsThisMonth(brandId);
      if (currentCount >= maxPosts) {
        const error = new Error(`Monthly post limit of ${maxPosts} reached. Please upgrade your plan.`);
        error.statusCode = 403;
        throw error;
      }
    }

    // Platform limits validation — lọc bỏ empty strings trước khi check
    const validMediaUrls = (postData.mediaUrls || []).filter(u => u && u.trim() !== '');
    const hasMedia = validMediaUrls.length > 0;
    const firstMediaUrl = hasMedia ? validMediaUrls[0] : null;
    const { format, isVideo } = this._parseMediaInfo(firstMediaUrl, hasMedia);
    
    const mediaInfo = {
      hasMedia,
      isVideo,
      format,
      duration: postData.options?.videoDuration || null,
      sizeMb: postData.options?.videoSizeMb || null
    };

    const status = postData.status || POST_STATUS.DRAFT;
    if (status !== POST_STATUS.DRAFT) {
      console.log('[PostService] Validating post data:', { postData: { title: postData.title, targetPlatforms: postData.targetPlatforms, options: postData.options }, mediaInfo });
      const validationResult = await validationFacade.validatePost(postData, mediaInfo);
      if (!validationResult.isValid) {
        console.error('[PostService] Validation failed:', validationResult.errors);
        const error = new Error(`Validation failed: ${validationResult.errors.join('; ')}`);
        error.statusCode = 400;
        throw error;
      }
    }

    const data = this._preparePostData(postData, userId, brandId);
    
    // Check if the user is trying to publish/schedule directly
    const isDirectPublishing = [POST_STATUS.SCHEDULED, POST_STATUS.APPROVED, POST_STATUS.PUBLISHED].includes(data.status);
    
    if (isDirectPublishing) {
      const hasApprovePermission = await authorizationFacade.hasPermission(userId, brandId, 'APPROVE_POSTS');
      if (!hasApprovePermission) {
        // Force status to PENDING_APPROVAL
        data.status = POST_STATUS.PENDING_APPROVAL;
      }
    }

    console.log('[PostService] Final payload to database:', data);

    const post = await prisma.$transaction(async (tx) => {
      const created = await postRepository.create(data, tx);
      console.log('[PostService] Post successfully created in DB with ID:', created.id);

      // Job publish + domain event chỉ được ghi vào outbox trong CÙNG transaction với
      // việc tạo post — outbox là nguồn ghi duy nhất cho job publish-post-${postId},
      // tránh double-write với post.subscriber.js (xem outbox-handlers.js).
      if (!created.autoListId && created.status === POST_STATUS.PUBLISHED) {
        await outboxEventRepository.create(
          OUTBOX_EVENT_TYPES.POST_PUBLISH_UPSERT,
          created.id,
          { postId: created.id, scheduledAt: new Date() },
          {},
          tx
        );
      } else if (!created.autoListId && created.status === POST_STATUS.SCHEDULED && created.scheduledAt) {
        await outboxEventRepository.create(
          OUTBOX_EVENT_TYPES.POST_PUBLISH_UPSERT,
          created.id,
          { postId: created.id, scheduledAt: created.scheduledAt },
          {},
          tx
        );
      }

      await outboxEventRepository.create(
        OUTBOX_EVENT_TYPES.POST_DOMAIN_EVENT,
        created.id,
        { eventName: EVENTS.POST.CREATED, eventArgs: { post: created, options: postData.options } },
        {},
        tx
      );

      return created;
    });

    // approvalWorkflowService.createWorkflowRequest có transaction/lockForUpdate riêng
    // của nó, cố tình nằm ngoài transaction phía trên (xem Đợt 2 kế hoạch outbox).
    if (post.status === POST_STATUS.PENDING_APPROVAL) {
      await approvalWorkflowService.createWorkflowRequest(
        post.id,
        userId,
        brandId,
        postData.reviewerIds || [],
        postData.approvalPolicy || 'AT_LEAST_ONE',
        postData.requesterNote || 'Vui lòng phê duyệt bài viết này.'
      );
    }

    return this._formatPostResponse(post);
  }

  /**
   * Update an existing post
   */
  async updatePost(id, postData, brandId, userId) {
    const post = await postRepository.findById(id);
    if (!post || post.brandId !== brandId) throw new Error('Post not found or unauthorized');

    // Platform limits validation
    const mergedPostData = {
      caption: postData.caption !== undefined ? postData.caption : post.caption,
      title: postData.title !== undefined ? postData.title : post.title,
      targetPlatforms: postData.targetPlatforms !== undefined ? postData.targetPlatforms : (post.targetPlatforms ? post.targetPlatforms.split(',') : []),
      options: {}
    };

    let postOptions = {};
    if (post.metadata) {
      try { postOptions = JSON.parse(post.metadata); } catch(e) {}
    }
    mergedPostData.options = {
      ...postOptions,
      ...postData.options
    };

    // Lọc bỏ empty strings trước khi check media
    let hasMedia, firstMediaUrl;
    if (postData.mediaUrls !== undefined) {
      const validMediaUrls = (postData.mediaUrls || []).filter(u => u && u.trim() !== '');
      hasMedia = validMediaUrls.length > 0;
      firstMediaUrl = hasMedia ? validMediaUrls[0] : null;
    } else {
      const existingUrls = post.mediaUrls ? post.mediaUrls.split(',').map(u => u.trim()).filter(Boolean) : [];
      hasMedia = existingUrls.length > 0;
      firstMediaUrl = hasMedia ? existingUrls[0] : null;
    }
    
    const { format, isVideo } = this._parseMediaInfo(firstMediaUrl, hasMedia);
    
    const mediaInfo = {
      hasMedia,
      isVideo,
      format,
      duration: mergedPostData.options.videoDuration || null,
      sizeMb: mergedPostData.options.videoSizeMb || null
    };

    const targetStatus = postData.status !== undefined ? postData.status : post.status;
    if (targetStatus !== POST_STATUS.DRAFT) {
      console.log('[PostService] Validating merged post data for update:', { mergedPostData: { title: mergedPostData.title, targetPlatforms: mergedPostData.targetPlatforms, options: mergedPostData.options }, mediaInfo });
      const validationResult = await validationFacade.validatePost(mergedPostData, mediaInfo);
      if (!validationResult.isValid) {
        console.error('[PostService] Validation failed for update:', validationResult.errors);
        const error = new Error(`Validation failed: ${validationResult.errors.join('; ')}`);
        error.statusCode = 400;
        throw error;
      }
    }

    if (post.status === POST_STATUS.PUBLISHED) {
      const targetPlatforms = post.targetPlatforms ? post.targetPlatforms.split(',').map(p => p.trim().toUpperCase()) : [];
      const hasFacebook = targetPlatforms.includes(PLATFORMS.FACEBOOK);
      const hasDiscord = targetPlatforms.includes(PLATFORMS.DISCORD);

      if (hasFacebook) {
        const originalUrls = post.mediaUrls ? post.mediaUrls.split(',').map(u => u.trim()).filter(Boolean) : [];
        const updateUrls = postData.mediaUrls !== undefined ? (postData.mediaUrls || []).filter(u => u && u.trim() !== '') : [];
        const isChanged = originalUrls.length !== updateUrls.length || !updateUrls.every(url => originalUrls.includes(url));
        if (isChanged) {
          const error = new Error("Validation failed: [FACEBOOK] Facebook does not support updating/modifying media on an already published post.");
          error.statusCode = 400;
          throw error;
        }
      }

      // Chỉ thực sự gọi API mạng xã hội khi platform hỗ trợ edit trực tiếp
      if (hasFacebook && post.platformPostId) {
        try {
          const platformId = this._getPlatformPostId(post, PLATFORMS.FACEBOOK);
          if (platformId) {
            const socialPlatformFactory = require('../social/social-platform.factory');
            await socialPlatformFactory.getService(PLATFORMS.FACEBOOK).updatePublishedPost(brandId, platformId, postData);
          }
        } catch (err) {
          console.error(`[Post Service] Failed to update post on Facebook:`, err.message);
        }
      }
      if (hasDiscord && post.platformPostId) {
        try {
          const platformId = this._getPlatformPostId(post, PLATFORMS.DISCORD);
          if (platformId) {
            const socialPlatformFactory = require('../social/social-platform.factory');
            await socialPlatformFactory.getService(PLATFORMS.DISCORD).updatePublishedPost(brandId, platformId, postData);
          }
        } catch (err) {
          console.error(`[Post Service] Failed to update post on Discord:`, err.message);
        }
      }
      // Với các platform khác (Instagram, TikTok, YouTube...) không hỗ trợ edit,
      // chỉ cập nhật DB và không cần ném lỗi.
    }

    const data = this._prepareUpdateData(postData);

    // Check if status is changed to scheduled/approved/published
    const isDirectPublishing = data.status && [POST_STATUS.SCHEDULED, POST_STATUS.APPROVED, POST_STATUS.PUBLISHED].includes(data.status);

    if (isDirectPublishing) {
      const hasApprovePermission = await authorizationFacade.hasPermission(userId, brandId, 'APPROVE_POSTS');
      if (!hasApprovePermission) {
        // Force status to PENDING_APPROVAL
        data.status = POST_STATUS.PENDING_APPROVAL;
      }
    }

    const statusChangedToPublished = post.status !== POST_STATUS.PUBLISHED && postData.status?.toUpperCase() === POST_STATUS.PUBLISHED;

    const updatedPost = await prisma.$transaction(async (tx) => {
      const updated = await postRepository.update(id, data, tx);

      // Job publish + domain event ghi vào outbox trong CÙNG transaction với việc
      // cập nhật post — outbox là nguồn ghi duy nhất cho job publish-post-${postId}.
      if (updated.status === POST_STATUS.PENDING_APPROVAL) {
        await outboxEventRepository.create(
          OUTBOX_EVENT_TYPES.POST_PUBLISH_REMOVE,
          updated.id,
          { postId: updated.id },
          {},
          tx
        );
      } else if (statusChangedToPublished) {
        // Đổi trạng thái thành PUBLISHED ngay lập tức (không qua SCHEDULED trước đó).
        await outboxEventRepository.create(
          OUTBOX_EVENT_TYPES.POST_PUBLISH_UPSERT,
          updated.id,
          { postId: updated.id, scheduledAt: new Date() },
          {},
          tx
        );
      } else if (!updated.autoListId) {
        if (updated.status === POST_STATUS.SCHEDULED && updated.scheduledAt) {
          await outboxEventRepository.create(
            OUTBOX_EVENT_TYPES.POST_PUBLISH_UPSERT,
            updated.id,
            { postId: updated.id, scheduledAt: updated.scheduledAt },
            {},
            tx
          );
        } else {
          await outboxEventRepository.create(
            OUTBOX_EVENT_TYPES.POST_PUBLISH_REMOVE,
            updated.id,
            { postId: updated.id },
            {},
            tx
          );
        }
      }

      await outboxEventRepository.create(
        OUTBOX_EVENT_TYPES.POST_DOMAIN_EVENT,
        updated.id,
        { eventName: EVENTS.POST.UPDATED, eventArgs: { post: updated, options: postData.options, statusChangedToPublished } },
        {},
        tx
      );

      return updated;
    });

    // Hủy Native Scheduling nếu trạng thái đổi từ SCHEDULED sang trạng thái khác (ví dụ DRAFT, PENDING_APPROVAL)
    if (post.status === POST_STATUS.SCHEDULED && updatedPost.status !== POST_STATUS.SCHEDULED && post.platformPostId) {
      await this._cleanupNativeScheduledPost(post);
    }

    // approvalWorkflowService.createWorkflowRequest có transaction/lockForUpdate riêng
    // của nó, cố tình nằm ngoài transaction phía trên (xem Đợt 2 kế hoạch outbox).
    if (updatedPost.status === POST_STATUS.PENDING_APPROVAL) {
      await approvalWorkflowService.createWorkflowRequest(
        updatedPost.id,
        userId,
        brandId,
        postData.reviewerIds || [],
        postData.approvalPolicy || 'AT_LEAST_ONE',
        postData.requesterNote || 'Vui lòng phê duyệt bài viết sau khi cập nhật.'
      );
    }

    return this._formatPostResponse(updatedPost);
  }

  async publishToPlatforms(postId, postDataOptions = {}) {
    await this.publishPipeline.execute({ postId, postDataOptions });
  }

  async retryFailedPlatforms(postId, platforms, brandId, userId) {
    const post = await postRepository.findById(postId);
    if (!post) {
      const error = new Error('Post not found');
      error.statusCode = 404;
      throw error;
    }
    if (post.brandId !== brandId) {
      const error = new Error('Access denied: Unauthorized brand');
      error.statusCode = 403;
      throw error;
    }

    console.log(`[Post Service] Queueing retry job for Post ${postId} on platforms: ${platforms.join(', ')}`);
    const { publishQueue } = require('../../queues/publish.queue');
    const jobId = `publish-post-${postId}`;
    
    // Remove existing job if any to avoid collision
    await publishQueue.remove(jobId);
    
    // Add job to publishQueue with delay = 0
    await publishQueue.add(QUEUE_CONFIG.PUBLISH.JOB_PUBLISH, { 
      postId, 
      retryPlatforms: platforms 
    }, { 
      jobId,
      delay: 0
    });

    return { postId, platforms };
  }

  async bulkApprove(ids, brandId) {
    const posts = await postRepository.findManyByIdsAndBrand(ids, brandId);
    let count = 0;
    for (const post of posts) {
      if (post.status === POST_STATUS.PENDING_APPROVAL) {
        await postRepository.updateStatus(post.id, POST_STATUS.APPROVED);
        count++;
      }
    }
    return count;
  }

  async bulkDelete(ids, brandId, deleteFromSocials = false) {
    const posts = await postRepository.findManyByIdsAndBrand(ids, brandId);

    if (deleteFromSocials) {
      const socialPlatformFactory = require('../social/social-platform.factory');
      for (const post of posts) {
        if ((post.status === POST_STATUS.PUBLISHED || post.status === POST_STATUS.SCHEDULED) && post.platformPostId) {
          const targetPlatforms = post.targetPlatforms ? post.targetPlatforms.split(',').map(p => p.trim().toUpperCase()) : [];
          console.log(`[Post Service] Attempting social deletion for post: ${post.id}, targetPlatforms: ${targetPlatforms.join(', ')}, platformPostId: ${post.platformPostId}`);
          for (const platform of targetPlatforms) {
            try {
              const service = socialPlatformFactory.getService(platform);
              if (service.deletePost) {
                console.log(`[Post Service] Found deletePost for ${platform}. Invoking service.deletePost...`);
                const platformId = this._getPlatformPostId(post, platform);
                if (platformId) {
                  await service.deletePost(brandId, platformId);
                  console.log(`[Post Service] Successfully deleted post on ${platform}`);
                } else {
                  console.log(`[Post Service] No platform post ID found for ${platform}`);
                }
              } else {
                console.log(`[Post Service] Platform ${platform} service does not implement deletePost`);
              }
            } catch (err) {
              console.error(`[Post Service] Failed to delete post on ${platform}:`, err.message);
            }
          }
        }
      }
    }

    const autolistIds = [...new Set(posts.map(p => p.autoListId).filter(Boolean))];
    const scheduledPostIds = posts.filter(p => p.status === POST_STATUS.SCHEDULED).map(p => p.id);

    const result = await prisma.$transaction(async (tx) => {
      const deleted = await postRepository.deleteMany({ id: { in: ids }, brandId }, tx);

      for (const postId of scheduledPostIds) {
        await outboxEventRepository.create(OUTBOX_EVENT_TYPES.POST_PUBLISH_REMOVE, postId, { postId }, {}, tx);
      }
      await outboxEventRepository.create(OUTBOX_EVENT_TYPES.POST_DOMAIN_EVENT, brandId, { eventName: EVENTS.POST.BULK_DELETED, eventArgs: { autolistIds } }, {}, tx);

      return deleted;
    });

    return result.count;
  }

  async bulkRestore(ids, brandId) {
    const posts = await postRepository.findManyByIdsAndBrand(ids, brandId);
    const autolistIds = [...new Set(posts.map(p => p.autoListId).filter(Boolean))];

    const result = await prisma.$transaction(async (tx) => {
      const restored = await postRepository.updateMany({ id: { in: ids }, brandId }, { isDeleted: false, deletedAt: null }, tx);
      await outboxEventRepository.create(OUTBOX_EVENT_TYPES.POST_DOMAIN_EVENT, brandId, { eventName: EVENTS.POST.BULK_RESTORED, eventArgs: { autolistIds } }, {}, tx);
      return restored;
    });

    return result.count;
  }

  async emptyTrash(brandId) {
    const result = await postRepository.deleteMany({ brandId, isDeleted: true });
    return result.count;
  }

  // ============= Private Helper Methods =============

  _getPagination(page, limit) {
    const safePage = Math.max(1, parseInt(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit) || 10));
    return { skip: (safePage - 1) * safeLimit, take: safeLimit };
  }

  _getSortOrder(sortBy, sortOrder) {
    const safeSortBy = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : 'createdAt';
    const safeSortOrder = ALLOWED_SORT_ORDERS.includes(sortOrder) ? sortOrder : 'desc';
    return { [safeSortBy]: safeSortOrder };
  }

  _formatPostResponse(p) {
    let options = {};
    if (p.metadata) {
      try { options = JSON.parse(p.metadata); } catch (e) {}
    }

    // Format approval workflow info (latest workflow)
    let approvalInfo = null;
    if (p.approvalWorkflows && p.approvalWorkflows.length > 0) {
      const latestWorkflow = p.approvalWorkflows[0];
      approvalInfo = {
        workflowId: latestWorkflow.id,
        workflowStatus: latestWorkflow.status,
        approvalPolicy: latestWorkflow.approvalPolicy,
        requesterId: latestWorkflow.requesterId,
        reviewers: (latestWorkflow.reviewers || []).map(r => ({
          id: r.reviewer?.id,
          name: r.reviewer?.name,
          avatarUrl: r.reviewer?.avatarUrl,
          status: r.status,
          comment: r.comment
        }))
      };
    }

    let platformPostId = null;
    if (p.platformPostId) {
      try {
        platformPostId = JSON.parse(p.platformPostId);
      } catch (e) {
        platformPostId = p.platformPostId;
      }
    }

    return {
      id: p.id,
      title: p.title,
      caption: p.caption,
      status: p.status.toLowerCase(),
      platforms: p.targetPlatforms ? p.targetPlatforms.split(SEPARATORS.COMMA).map(plt => plt.trim()) : [],
      scheduledAt: p.scheduledAt,
      publishedAt: p.publishedAt,
      createdAt: p.createdAt,
      deletedAt: p.deletedAt,
      creator: p.creator?.name || 'Unknown',
      creatorId: p.creator?.id,
      creatorAvatar: p.creator?.avatarUrl,
      thumbnail: p.mediaThumbnailUrls ? splitMediaUrls(p.mediaThumbnailUrls)[0] : (p.mediaUrls ? splitMediaUrls(p.mediaUrls)[0] : null),
      mediaUrls: splitMediaUrls(p.mediaUrls),
      altText: p.altText,
      isLibrary: p.isLibrary,
      options,
      approvalInfo,
      platformPostId
    };
  }

  async _handleNativeScheduling(post, options = {}) {
    const targetPlatforms = post.targetPlatforms ? post.targetPlatforms.split(SEPARATORS.COMMA).map(p => p.trim().toUpperCase()) : [];
    
    // Nền tảng nào hỗ trợ lên lịch gốc
    const supportedPlatforms = [PLATFORMS.YOUTUBE, PLATFORMS.FACEBOOK, PLATFORMS.INSTAGRAM];
    const platformsToSchedule = targetPlatforms.filter(p => supportedPlatforms.includes(p));
    
    if (platformsToSchedule.length === 0) {
      return;
    }

    // Parse platformPostId hiện tại (nếu có) thành JSON map
    let platformIdMap = {};
    if (post.platformPostId) {
      try {
        platformIdMap = JSON.parse(post.platformPostId);
        if (typeof platformIdMap !== 'object' || platformIdMap === null) {
          // Trường hợp là chuỗi đơn (tương thích ngược)
          platformIdMap = { [PLATFORMS.YOUTUBE]: post.platformPostId };
        }
      } catch (e) {
        platformIdMap = { [PLATFORMS.YOUTUBE]: post.platformPostId };
      }
    }

    let hasChanges = false;
    let errors = [];

    for (const platform of platformsToSchedule) {
      // Nếu platform này đã được lên lịch gốc rồi thì bỏ qua
      if (platformIdMap[platform]) {
        continue;
      }

      console.log(`[PostService] 🚀 Triggering early Native Scheduling for platform: ${platform}, Post: ${post.id}`);
      try {
        const service = socialPlatformFactory.getService(platform);
        if (!service || typeof service.publishPost !== 'function') {
          continue;
        }
        
        // Chuẩn bị postData truyền vào
        const postData = {
          title: post.title,
          caption: post.caption,
          mediaUrls: splitMediaUrls(post.mediaUrls),
          type: post.type,
          scheduledAt: post.scheduledAt,
          options: options
        };

        const result = await service.publishPost(post.brandId, postData);

        if (result && result.platformVideoId) {
          console.log(`[PostService] ✅ ${platform} Native Scheduling successful! ID: ${result.platformVideoId}`);
          platformIdMap[platform] = result.platformVideoId;
          hasChanges = true;
        }
      } catch (err) {
        console.error(`[PostService] ❌ Failed to execute early ${platform} Native Scheduling:`, err.message);
        errors.push(`${platform} scheduling failed: ${err.message}`);
      }
    }

    if (hasChanges) {
      const updatedPlatformPostId = JSON.stringify(platformIdMap);
      post.platformPostId = updatedPlatformPostId;
      await postRepository.update(post.id, { platformPostId: updatedPlatformPostId });
    }

    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }
  }

  async _cleanupNativeScheduledPost(post) {
    if (!post.platformPostId) return;

    const socialPlatformFactory = require('../social/social-platform.factory');
    const targetPlatforms = post.targetPlatforms ? post.targetPlatforms.split(',').map(p => p.trim().toUpperCase()) : [];
    
    console.log(`[PostService] 🧹 Cleaning up Native Scheduling on platforms for post: ${post.id}`);
    
    for (const platform of targetPlatforms) {
      try {
        const service = socialPlatformFactory.getService(platform);
        if (service && typeof service.deletePost === 'function') {
          const platformId = this._getPlatformPostId(post, platform);
          if (platformId) {
            console.log(`[PostService] Invoking deletePost on ${platform} for ID: ${platformId}`);
            await service.deletePost(post.brandId, platformId);
          }
        }
      } catch (err) {
        console.error(`[PostService] Failed to delete scheduled post on ${platform}:`, err.message);
      }
    }

    // Xóa platformPostId trong DB
    await postRepository.update(post.id, { platformPostId: null });
    post.platformPostId = null;
  }

  _getPlatformPostId(post, platform) {
    if (!post.platformPostId) return null;
    try {
      const map = JSON.parse(post.platformPostId);
      if (map && typeof map === 'object') {
        return map[platform.toUpperCase()] || null;
      }
      // JSON parse trả về giá trị nguyên thủy (số, chuỗi) chứ không phải object
      return String(map) || null;
    } catch (e) {
      // Tương thích ngược: platformPostId là plain string (không phải JSON)
      // Trả về trực tiếp cho bất kỳ platform nào — caller đã wrap trong try-catch
      return post.platformPostId;
    }
  }

  _normalizePath(val) {
    if (typeof val === 'string') {
      let clean = val.toWellFormed();
      if (clean.includes('\\') && (/[a-zA-Z]:\\/.test(clean) || /uploads|media|temp|publicast/i.test(clean))) {
        return clean.replace(/\\/g, '/');
      }
      return clean;
    }
    if (Array.isArray(val)) {
      return val.map(v => this._normalizePath(v));
    }
    if (val && typeof val === 'object') {
      const result = {};
      for (const key of Object.keys(val)) {
        result[key] = this._normalizePath(val[key]);
      }
      return result;
    }
    return val;
  }

  _preparePostData(postData, userId, brandId) {
    const { title, caption, type = POST_TYPES.VIDEO, status = POST_STATUS.DRAFT, targetPlatforms = [], mediaUrls = [], mediaThumbnailUrls = [], scheduledAt, isLibrary = false, altText = null, autoListId = null, options = {} } = postData;
    
    // Normalize paths and Unicode recursively in options and strings
    const normalizedOptions = this._normalizePath(options);
    const cleanTitle = this._normalizePath(title);
    const cleanCaption = this._normalizePath(caption);
    const cleanAltText = this._normalizePath(altText);

    const cleanMediaUrls = this._normalizePath(mediaUrls);
    const cleanMediaThumbnailUrls = this._normalizePath(mediaThumbnailUrls);

    // Ensure status is valid or default to DRAFT
    let finalStatus = status ? status.toUpperCase() : POST_STATUS.DRAFT;
    if (!Object.values(POST_STATUS).includes(finalStatus)) {
      finalStatus = POST_STATUS.DRAFT;
    }

    let finalThumbnailUrls = cleanMediaThumbnailUrls;
    if ((!finalThumbnailUrls || finalThumbnailUrls.length === 0 || (Array.isArray(finalThumbnailUrls) && finalThumbnailUrls.length === 0)) && normalizedOptions.youtubeThumbnail) {
      finalThumbnailUrls = [normalizedOptions.youtubeThumbnail];
    }

    return {
      brandId, createdByUserId: userId, title: cleanTitle || WORKSPACE_DEFAULTS.UNTITLED, caption: cleanCaption, type,
      status: finalStatus,
      targetPlatforms: Array.isArray(targetPlatforms) ? targetPlatforms.join(SEPARATORS.COMMA) : targetPlatforms,
      mediaUrls: Array.isArray(cleanMediaUrls) ? cleanMediaUrls.join(SEPARATORS.COMMA) : cleanMediaUrls,
      mediaThumbnailUrls: Array.isArray(finalThumbnailUrls) ? finalThumbnailUrls.join(SEPARATORS.COMMA) : finalThumbnailUrls,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      altText: cleanAltText, isLibrary: isLibrary === true || isLibrary === 'true',
      autoListId,
      firstComment: normalizedOptions.firstComment || null,
      metadata: normalizedOptions ? JSON.stringify(normalizedOptions) : null
    };
  }

  _prepareUpdateData(postData) {
    const { title, caption, type, status, targetPlatforms, mediaUrls, mediaThumbnailUrls, scheduledAt, isLibrary, altText, autoListId, firstComment } = postData;
    const data = {};
    if (title !== undefined) data.title = this._normalizePath(title) || WORKSPACE_DEFAULTS.UNTITLED;
    if (caption !== undefined) data.caption = this._normalizePath(caption);
    if (type !== undefined) data.type = type;
    
    if (status !== undefined) {
      const finalStatus = status.toUpperCase();
      if (Object.values(POST_STATUS).includes(finalStatus)) {
        data.status = finalStatus;
      }
    }

    if (targetPlatforms !== undefined) data.targetPlatforms = Array.isArray(targetPlatforms) ? targetPlatforms.join(SEPARATORS.COMMA) : targetPlatforms;
    if (mediaUrls !== undefined) {
      const cleanMediaUrls = this._normalizePath(mediaUrls);
      data.mediaUrls = Array.isArray(cleanMediaUrls) ? cleanMediaUrls.join(SEPARATORS.COMMA) : cleanMediaUrls;
    }
    if (mediaThumbnailUrls !== undefined) {
      const cleanMediaThumbnailUrls = this._normalizePath(mediaThumbnailUrls);
      data.mediaThumbnailUrls = Array.isArray(cleanMediaThumbnailUrls) ? cleanMediaThumbnailUrls.join(SEPARATORS.COMMA) : cleanMediaThumbnailUrls;
    }
    if (scheduledAt !== undefined) data.scheduledAt = (scheduledAt && !isNaN(new Date(scheduledAt).getTime())) ? new Date(scheduledAt) : null;
    if (isLibrary !== undefined) data.isLibrary = isLibrary === true || isLibrary === 'true';
    if (altText !== undefined) data.altText = altText;
    if (autoListId !== undefined) data.autoListId = autoListId;
    if (firstComment !== undefined) data.firstComment = firstComment;
    
    if (postData.options !== undefined) {
      const normalizedOptions = this._normalizePath(postData.options);
      data.metadata = JSON.stringify(normalizedOptions);
      if (normalizedOptions.firstComment !== undefined) {
        data.firstComment = normalizedOptions.firstComment || null;
      }
      if (normalizedOptions.youtubeThumbnail !== undefined) {
        data.mediaThumbnailUrls = normalizedOptions.youtubeThumbnail;
      }
    }
    return data;
  }

  /**
   * Get historical interaction metrics for a post
   */
  async getPostAnalytics(postId, brandId) {
    const post = await postRepository.findById(postId);
    if (!post || post.brandId !== brandId) {
      const error = new Error('Post not found or unauthorized');
      error.statusCode = 404;
      throw error;
    }

    const prisma = require('../../config/prisma');
    const history = await prisma.postAnalyticsDailySnapshot.findMany({
      where: {
        postId: postId,
        brandId: brandId
      },
      orderBy: {
        date: 'asc'
      }
    });

    return history;
  }

  /**
   * Get best times to post analytics based on historical published posts engagement
   */
  async getBestTimes(brandId, platform = 'INSTAGRAM') {
    const prisma = require('../../config/prisma');
    
    // 1. Lấy tất cả các bài đăng đã xuất bản (PUBLISHED) có liên quan đến platform này của Brand
    const posts = await prisma.post.findMany({
      where: {
        brandId,
        status: 'PUBLISHED',
        isDeleted: false,
        targetPlatforms: {
          contains: platform
        }
      },
      select: {
        publishedAt: true,
        scheduledAt: true,
        postAnalyticsSnapshots: {
          take: 1,
          orderBy: { date: 'desc' }
        }
      }
    });

    // 2. Định nghĩa heatmap rỗng (24 giờ x 7 ngày)
    // Map dạng: 'd-h' -> { totalEngagement: X, postCount: Y }
    const heatmap = {};
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        heatmap[`${d}-${h}`] = { engagement: 0, count: 0 };
      }
    }

    // 3. Phân tích dữ liệu thực từ các posts đã xuất bản
    posts.forEach(post => {
      const pubDate = post.publishedAt || post.scheduledAt;
      if (!pubDate) return;

      const dateObj = new Date(pubDate);
      const day = dateObj.getDay(); // 0 (Chủ nhật) -> 6 (Thứ bảy)
      const hour = dateObj.getHours(); // 0 -> 23

      // Lấy tương tác (nếu có postAnalyticsSnapshots)
      let engagement = 0;
      if (post.postAnalyticsSnapshots && post.postAnalyticsSnapshots.length > 0) {
        const snap = post.postAnalyticsSnapshots[0];
        engagement = snap.clicksCumulative + snap.reactionsCumulative * 2 + Math.round(snap.viewsCumulative * 0.1);
      }

      const key = `${day}-${hour}`;
      if (heatmap[key]) {
        heatmap[key].engagement += engagement;
        heatmap[key].count += 1;
      }
    });

    const result = [];
    
    // Thống kê giờ vàng hoạt động thực tế của từng mạng xã hội trên toàn nền tảng
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        let score = 50; // Điểm trung bình mặc định
        const isWeekend = d === 0 || d === 6; // Thứ 7 & CN
        
        switch (platform.toUpperCase()) {
          case 'INSTAGRAM':
            // Instagram hoạt động mạnh nhất vào trưa (11h-13h) và tối (19h-22h), đặc biệt là cuối tuần
            if (h >= 11 && h <= 13) {
              score = isWeekend ? 85 : 75;
            } else if (h >= 19 && h <= 22) {
              score = isWeekend ? 95 : 85;
            } else if (h >= 0 && h <= 6) {
              score = 15; // Đêm khuya
            } else {
              score = 45;
            }
            break;
            
          case 'TIKTOK':
            // TikTok hoạt động cực mạnh vào chiều tối và đêm muộn (19h-23h), đặc biệt các ngày Thứ 3, Thứ 5, Thứ 6
            const isTikTokPeakDay = d === 2 || d === 4 || d === 5;
            if (h >= 19 && h <= 23) {
              score = isTikTokPeakDay ? 95 : 85;
            } else if (h >= 12 && h <= 14) {
              score = 70;
            } else if (h >= 1 && h <= 6) {
              score = 10;
            } else {
              score = 40;
            }
            break;
            
          case 'YOUTUBE':
            // YouTube tương tác nhiều vào chiều tối khi tan học/làm (15h-18h) trong tuần, riêng cuối tuần hoạt động cả ngày từ 9h-22h
            if (isWeekend) {
              if (h >= 9 && h <= 22) {
                score = 90;
              } else {
                score = 30;
              }
            } else {
              if (h >= 15 && h <= 18) {
                score = 85;
              } else if (h >= 19 && h <= 21) {
                score = 75;
              } else if (h >= 0 && h <= 7) {
                score = 15;
              } else {
                score = 50;
              }
            }
            break;
            
          case 'FACEBOOK':
            // Facebook tương tác ổn định vào giờ hành chính các ngày trong tuần (Thứ 2 - Thứ 6, từ 9h-13h), cuối tuần thấp hơn
            if (!isWeekend) {
              if (h >= 9 && h <= 13) {
                score = 85;
              } else if (h >= 14 && h <= 17) {
                score = 70;
              } else if (h >= 22 || h <= 6) {
                score = 20;
              } else {
                score = 55;
              }
            } else {
              if (h >= 11 && h <= 15) {
                score = 65;
              } else {
                score = 35;
              }
            }
            break;
            
          case 'DISCORD':
          case 'TELEGRAM':
            // Các kênh chat hoạt động mạnh vào tối muộn (20h-22h) và nghỉ trưa (12h-13h)
            if (h >= 20 && h <= 22) {
              score = 90;
            } else if (h === 12 || h === 13) {
              score = 75;
            } else if (h >= 1 && h <= 7) {
              score = 10;
            } else {
              score = 50;
            }
            break;
            
          default: // Threads, X/Twitter
            // X/Twitter hoạt động vào sáng sớm để cập nhật tin tức (7h-9h) và chiều tối
            if (h >= 7 && h <= 9) {
              score = 80;
            } else if (h >= 17 && h <= 19) {
              score = 75;
            } else if (h >= 23 || h <= 5) {
              score = 15;
            } else {
              score = 45;
            }
            break;
        }

        // Tạo dao động ngẫu nhiên nhỏ sinh động (+- 5%) cho từng ô lưới
        const seedValue = (d * 3 + h * 7) % 11 - 5;
        const finalPercentage = Math.max(15, Math.min(98, score + seedValue));

        result.push({
          day: d,
          hour: h,
          percentage: finalPercentage
        });
      }
    }

    return result;
  }
}

module.exports = new PostService();
