const postRepository = require('../../repositories/workspace/post.repository');
const brandRepository = require('../../repositories/workspace/brand.repository');
const socialPlatformFactory = require('../social/social-platform.factory');
const { POST_STATUS, POST_TYPES, SEPARATORS, WORKSPACE_DEFAULTS, PLATFORMS } = require('../../utils/constants');
const { eventEmitter, EVENTS } = require('../../events/event-emitter');
const { upsertPublishJob, removePublishJob } = require('../../queues/publish.queue');
const authorizationFacade = require('../auth/authorization.facade');
const approvalWorkflowService = require('./approval-workflow.service');
const validationFacade = require('./post/validators/validation.facade');

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
    const format = firstMediaUrl ? firstMediaUrl.split('.').pop().split('?')[0].toLowerCase() : null;
    const isVideo = hasMedia && ['mp4', 'mov', 'webm', 'avi', 'mkv'].includes(format);
    
    const mediaInfo = {
      hasMedia,
      isVideo,
      format,
      duration: postData.options?.videoDuration || null,
      sizeMb: postData.options?.videoSizeMb || null
    };

    console.log('[PostService] Validating post data:', { postData: { title: postData.title, targetPlatforms: postData.targetPlatforms, options: postData.options }, mediaInfo });
    const validationResult = await validationFacade.validatePost(postData, mediaInfo);
    if (!validationResult.isValid) {
      console.error('[PostService] Validation failed:', validationResult.errors);
      const error = new Error(`Validation failed: ${validationResult.errors.join('; ')}`);
      error.statusCode = 400;
      throw error;
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
    const post = await postRepository.create(data);
    console.log('[PostService] Post successfully created in DB with ID:', post.id);

    // If the post status is PENDING_APPROVAL, initiate the approval workflow request
    if (post.status === POST_STATUS.PENDING_APPROVAL) {
      await approvalWorkflowService.createWorkflowRequest(
        post.id,
        userId,
        brandId,
        postData.reviewerIds || [],
        postData.approvalPolicy || 'AT_LEAST_ONE',
        postData.requesterNote || 'Vui lòng phê duyệt bài viết này.'
      );
    } else {
      // If one-off post is scheduled, add to BullMQ
      if (!post.autoListId && post.status === POST_STATUS.SCHEDULED && post.scheduledAt) {
        await this._handleNativeScheduling(post, postData.options);
        await upsertPublishJob(post.id, post.scheduledAt);
      }
    }

    eventEmitter.emit(EVENTS.POST.CREATED, { post, options: postData.options });
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
    
    const format = firstMediaUrl ? firstMediaUrl.split('.').pop().split('?')[0].toLowerCase() : null;
    const isVideo = hasMedia && ['mp4', 'mov', 'webm', 'avi', 'mkv'].includes(format);
    
    const mediaInfo = {
      hasMedia,
      isVideo,
      format,
      duration: mergedPostData.options.videoDuration || null,
      sizeMb: mergedPostData.options.videoSizeMb || null
    };

    console.log('[PostService] Validating merged post data for update:', { mergedPostData: { title: mergedPostData.title, targetPlatforms: mergedPostData.targetPlatforms, options: mergedPostData.options }, mediaInfo });
    const validationResult = await validationFacade.validatePost(mergedPostData, mediaInfo);
    if (!validationResult.isValid) {
      console.error('[PostService] Validation failed for update:', validationResult.errors);
      const error = new Error(`Validation failed: ${validationResult.errors.join('; ')}`);
      error.statusCode = 400;
      throw error;
    }

    if (post.status === POST_STATUS.PUBLISHED) {
      const targetPlatforms = post.targetPlatforms ? post.targetPlatforms.split(',').map(p => p.trim().toUpperCase()) : [];
      const hasFacebook = targetPlatforms.includes(PLATFORMS.FACEBOOK);
      const hasDiscord = targetPlatforms.includes(PLATFORMS.DISCORD);
      
      if ((hasFacebook || hasDiscord) && post.platformPostId) {
        const socialPlatformFactory = require('../social/social-platform.factory');
        if (hasFacebook) {
          try {
            const platformId = this._getPlatformPostId(post, PLATFORMS.FACEBOOK);
            if (platformId) {
              await socialPlatformFactory.getService(PLATFORMS.FACEBOOK).updatePublishedPost(brandId, platformId, postData);
            }
          } catch (err) {
            console.error(`[Post Service] Failed to update post on Facebook:`, err.message);
          }
        }
        if (hasDiscord) {
          try {
            const platformId = this._getPlatformPostId(post, PLATFORMS.DISCORD);
            if (platformId) {
              await socialPlatformFactory.getService(PLATFORMS.DISCORD).updatePublishedPost(brandId, platformId, postData);
            }
          } catch (err) {
            console.error(`[Post Service] Failed to update post on Discord:`, err.message);
          }
        }
      } else {
        throw new Error('Cannot update an already published post for this platform');
      }
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

    const updatedPost = await postRepository.update(id, data);

    // Sync BullMQ/Approval Workflow
    if (updatedPost.status === POST_STATUS.PENDING_APPROVAL) {
      // Clean up any existing scheduled jobs
      await removePublishJob(updatedPost.id);

      // Create new workflow request
      await approvalWorkflowService.createWorkflowRequest(
        updatedPost.id,
        userId,
        brandId,
        postData.reviewerIds || [],
        postData.approvalPolicy || 'AT_LEAST_ONE',
        postData.requesterNote || 'Vui lòng phê duyệt bài viết sau khi cập nhật.'
      );
    } else {
      // Sync BullMQ for one-off posts
      if (!updatedPost.autoListId) {
        if (updatedPost.status === POST_STATUS.SCHEDULED && updatedPost.scheduledAt) {
          await this._handleNativeScheduling(updatedPost, postData.options);
          await upsertPublishJob(updatedPost.id, updatedPost.scheduledAt);
        } else {
          await removePublishJob(updatedPost.id);
        }
      }
    }

    const statusChangedToPublished = post.status !== POST_STATUS.PUBLISHED && postData.status?.toUpperCase() === POST_STATUS.PUBLISHED;
    eventEmitter.emit(EVENTS.POST.UPDATED, { post: updatedPost, options: postData.options, statusChangedToPublished });

    return this._formatPostResponse(updatedPost);
  }

  async publishToPlatforms(postId, postDataOptions = {}) {
    await this.publishPipeline.execute({ postId, postDataOptions });
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
        if (post.status === POST_STATUS.PUBLISHED && post.platformPostId) {
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

    const result = await postRepository.deleteMany({ id: { in: ids }, brandId });
    eventEmitter.emit(EVENTS.POST.BULK_DELETED, { autolistIds });
    return result.count;
  }

  async bulkRestore(ids, brandId) {
    const posts = await postRepository.findManyByIdsAndBrand(ids, brandId);
    const autolistIds = [...new Set(posts.map(p => p.autoListId).filter(Boolean))];

    const result = await postRepository.updateMany({ id: { in: ids }, brandId }, { isDeleted: false, deletedAt: null });
    eventEmitter.emit(EVENTS.POST.BULK_RESTORED, { autolistIds });
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
      thumbnail: p.mediaThumbnailUrls ? p.mediaThumbnailUrls.split(SEPARATORS.COMMA)[0] : null,
      mediaUrls: p.mediaUrls ? p.mediaUrls.split(SEPARATORS.COMMA).map(m => m.trim()) : [],
      altText: p.altText,
      isLibrary: p.isLibrary,
      options,
      approvalInfo
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
        
        // Chuẩn bị postData truyền vào
        const postData = {
          title: post.title,
          caption: post.caption,
          mediaUrls: post.mediaUrls ? post.mediaUrls.split(SEPARATORS.COMMA).map(m => m.trim()) : [],
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

  _getPlatformPostId(post, platform) {
    if (!post.platformPostId) return null;
    try {
      const map = JSON.parse(post.platformPostId);
      if (map && typeof map === 'object') {
        return map[platform.toUpperCase()] || null;
      }
    } catch (e) {
      // Tương thích ngược: Nếu không phải JSON, coi đó là ID của YouTube
      if (platform.toUpperCase() === PLATFORMS.YOUTUBE) {
        return post.platformPostId;
      }
    }
    return null;
  }

  _preparePostData(postData, userId, brandId) {
    const { title, caption, type = POST_TYPES.VIDEO, status = POST_STATUS.DRAFT, targetPlatforms = [], mediaUrls = [], mediaThumbnailUrls = [], scheduledAt, isLibrary = false, altText = null, autoListId = null, options = {} } = postData;
    
    // Ensure status is valid or default to DRAFT
    let finalStatus = status ? status.toUpperCase() : POST_STATUS.DRAFT;
    if (!Object.values(POST_STATUS).includes(finalStatus)) {
      finalStatus = POST_STATUS.DRAFT;
    }

    let finalThumbnailUrls = mediaThumbnailUrls;
    if ((!finalThumbnailUrls || finalThumbnailUrls.length === 0 || (Array.isArray(finalThumbnailUrls) && finalThumbnailUrls.length === 0)) && options.youtubeThumbnail) {
      finalThumbnailUrls = [options.youtubeThumbnail];
    }

    return {
      brandId, createdByUserId: userId, title: title || WORKSPACE_DEFAULTS.UNTITLED, caption, type,
      status: finalStatus,
      targetPlatforms: Array.isArray(targetPlatforms) ? targetPlatforms.join(SEPARATORS.COMMA) : targetPlatforms,
      mediaUrls: Array.isArray(mediaUrls) ? mediaUrls.join(SEPARATORS.COMMA) : mediaUrls,
      mediaThumbnailUrls: Array.isArray(finalThumbnailUrls) ? finalThumbnailUrls.join(SEPARATORS.COMMA) : finalThumbnailUrls,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      altText, isLibrary: isLibrary === true || isLibrary === 'true',
      autoListId,
      firstComment: options.firstComment || null,
      metadata: options ? JSON.stringify(options) : null
    };
  }

  _prepareUpdateData(postData) {
    const { title, caption, type, status, targetPlatforms, mediaUrls, mediaThumbnailUrls, scheduledAt, isLibrary, altText, autoListId, firstComment } = postData;
    const data = {};
    if (title !== undefined) data.title = title || WORKSPACE_DEFAULTS.UNTITLED;
    if (caption !== undefined) data.caption = caption;
    if (type !== undefined) data.type = type;
    
    if (status !== undefined) {
      const finalStatus = status.toUpperCase();
      if (Object.values(POST_STATUS).includes(finalStatus)) {
        data.status = finalStatus;
      }
    }

    if (targetPlatforms !== undefined) data.targetPlatforms = Array.isArray(targetPlatforms) ? targetPlatforms.join(SEPARATORS.COMMA) : targetPlatforms;
    if (mediaUrls !== undefined) data.mediaUrls = Array.isArray(mediaUrls) ? mediaUrls.join(SEPARATORS.COMMA) : mediaUrls;
    if (mediaThumbnailUrls !== undefined) data.mediaThumbnailUrls = Array.isArray(mediaThumbnailUrls) ? mediaThumbnailUrls.join(SEPARATORS.COMMA) : mediaThumbnailUrls;
    if (scheduledAt !== undefined) data.scheduledAt = (scheduledAt && !isNaN(new Date(scheduledAt).getTime())) ? new Date(scheduledAt) : null;
    if (isLibrary !== undefined) data.isLibrary = isLibrary === true || isLibrary === 'true';
    if (altText !== undefined) data.altText = altText;
    if (autoListId !== undefined) data.autoListId = autoListId;
    if (firstComment !== undefined) data.firstComment = firstComment;
    
    if (postData.options !== undefined) {
      data.metadata = JSON.stringify(postData.options);
      if (postData.options.firstComment !== undefined) {
        data.firstComment = postData.options.firstComment || null;
      }
      if (postData.options.youtubeThumbnail !== undefined) {
        data.mediaThumbnailUrls = postData.options.youtubeThumbnail;
      }
    }
    return data;
  }
}

module.exports = new PostService();
