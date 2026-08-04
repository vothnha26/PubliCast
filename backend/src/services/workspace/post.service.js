require('../../utils/polyfill');
const postRepository = require('../../repositories/workspace/post.repository');
const brandRepository = require('../../repositories/workspace/brand.repository');
const subscriptionRepository = require('../../repositories/billing/subscription.repository');
const socialPlatformFactory = require('../social/social-platform.factory');
const { POST_STATUS, POST_TYPES, SEPARATORS, WORKSPACE_DEFAULTS, PLATFORMS, PERMISSION_KEYS, DEFAULT_CONFIG, splitMediaUrls, CHANNEL_GROUP_VISIBILITY } = require('../../utils/constants');
const { EVENTS } = require('../../events/event-emitter');
const { OUTBOX_EVENT_TYPES } = require('../../constants/outbox.constants');
const autoListRepository = require('../../repositories/workspace/auto-list.repository');
const outboxEventRepository = require('../../repositories/core/outbox-event.repository');
const prisma = require('../../config/prisma');
const { cloudinary } = require('../../config/cloudinary');
const authorizationFacade = require('../auth/authorization.facade');
const approvalWorkflowService = require('./approval-workflow.service');
const validationFacade = require('./post/validators/validation.facade');
const presetStrategyFactory = require('./post/presets/preset-strategy.factory');
const { QUEUE_CONFIG } = require('../../constants/video-publish.constants');

const QueryPipeline = require('../../core/query-pipeline/query.pipeline');
const PostStatusFilter = require('./post/filters/status.filter');
const PostSearchFilter = require('./post/filters/search.filter');
const PostPlatformFilter = require('./post/filters/platform.filter');
const PostDateRangeFilter = require('./post/filters/date-range.filter');
const PostLibraryFilter = require('./post/filters/library.filter');
const PostDeletedFilter = require('./post/filters/deleted.filter');
const PostSocialAccountFilter = require('./post/filters/social-account.filter');

const Pipeline = require('../../core/pipeline/pipeline.executor');
const FetchPostStep = require('./post/publish-steps/fetch-post.step');
const UrlShortenerStep = require('./post/publish-steps/url-shortener.step');
const SocialPublishStep = require('./post/publish-steps/social-publish.step');
const UpdatePostStatusStep = require('./post/publish-steps/update-db.step');
const logger = require('../../utils/logger');

const ALLOWED_SORT_FIELDS = ['createdAt', 'scheduledAt', 'publishedAt', 'title', 'status'];
const ALLOWED_SORT_ORDERS = ['asc', 'desc'];

class PostService {
  constructor() {
    this.queryPipeline = new QueryPipeline([
      new PostStatusFilter(), new PostSearchFilter(), new PostPlatformFilter(),
      new PostDateRangeFilter(), new PostLibraryFilter(), new PostDeletedFilter(),
      new PostSocialAccountFilter()
    ]);

    this.publishPipeline = new Pipeline([
      new FetchPostStep(), new UrlShortenerStep(), new SocialPublishStep(), new UpdatePostStatusStep()
    ]);
  }

  /**
   * Get filtered posts with pagination
   */
  async getPosts(queryParams, brandId, userId = null) {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = queryParams;
    const { skip, take } = this._getPagination(page, limit);
    const order = this._getSortOrder(sortBy, sortOrder);

    const where = this.queryPipeline.apply({ brandId }, queryParams);

    // Library posts marked PRIVATE are only visible to their own creator —
    // other brand members' Post Library requests must not see them, same
    // "existence not leaked" semantics as PRIVATE channel groups.
    if (where.isLibrary === true && userId) {
      where.OR = [
        { libraryVisibility: CHANNEL_GROUP_VISIBILITY.TEAM },
        { libraryVisibility: CHANNEL_GROUP_VISIBILITY.PRIVATE, createdByUserId: userId }
      ];
    }

    const { posts, total } = await postRepository.findManyAndCount(where, { skip, take, orderBy: order });

    return {
      data: posts.map(p => this._formatPostResponse(p)),
      meta: { total, page: Math.max(1, parseInt(page) || 1), limit: take, totalPages: Math.ceil(total / take) }
    };
  }

  /**
   * Validates and normalizes a multer-uploaded file for POST /api/posts/upload
   * (v1 and v2 share this — see postController.uploadVideo / uploadVideoV2).
   * Enforces req.postUploadLimits (set by resolvePostUploadLimits from the
   * request's ?targetPlatforms=), which is a stricter, per-platform check
   * than multer's own limits.fileSize — a static per-instance ceiling that
   * can't vary per request. A file exceeding the resolved limit is deleted
   * from Cloudinary here before throwing, so rejected uploads don't leave
   * orphaned assets behind.
   * @throws {Error} with statusCode 400 if no file, or the file fails the
   *   resolved size/format limit.
   */
  async processUploadedFile(req) {
    if (!req.file) {
      const error = new Error('No video file uploaded');
      error.statusCode = 400;
      throw error;
    }

    const isLocal = process.env.UPLOAD_STORAGE === 'local';
    const sizeMb = req.file.size ? Math.round((req.file.size / (1024 * 1024)) * 100) / 100 : null;
    // Local storage never went through Cloudinary, so no real duration/format
    // metadata is available — format falls back to the original extension,
    // matching _parseMediaInfo's existing behavior for URLs it can't
    // otherwise identify.
    const format = isLocal
      ? require('path').extname(req.file.originalname || '').replace('.', '').toLowerCase() || null
      : req.file.format;
    const duration = isLocal ? null : req.file.duration;

    const limits = req.postUploadLimits;
    const destroyRejectedUpload = async () => {
      if (!isLocal && req.file.filename) {
        await cloudinary.uploader.destroy(req.file.filename, { invalidate: true, resource_type: req.file.resourceType || 'image' }).catch((err) => {
          console.error('[Upload] Failed to delete rejected Cloudinary asset:', err);
        });
      }
    };

    if (limits && sizeMb !== null && sizeMb > limits.maxFileSizeMb) {
      await destroyRejectedUpload();
      const error = new Error(`File size (${sizeMb}MB) exceeds the ${limits.maxFileSizeMb}MB limit for the selected platform(s).`);
      error.statusCode = 400;
      throw error;
    }
    if (limits && format && limits.allowedFormats.length > 0 && !limits.allowedFormats.includes(format)) {
      await destroyRejectedUpload();
      const error = new Error(`Format "${format}" is not allowed for the selected platform(s). Allowed: ${limits.allowedFormats.join(', ')}.`);
      error.statusCode = 400;
      throw error;
    }

    let videoUrl = req.file.path;
    if (isLocal) {
      const path = require('path');
      const relativePath = path.relative(process.cwd(), req.file.path).replace(/\\/g, '/');
      videoUrl = `/${relativePath}`;
    }

    return { videoUrl, sizeMb, duration, format };
  }

  /**
   * Deletes an uploaded asset (Local file or Cloudinary resource)
   * Safely verifies directory bounds to prevent path-traversal for local assets.
   */
  async deleteUploadedAsset(fileUrl) {
    if (!fileUrl || typeof fileUrl !== 'string') {
      return { deleted: false, reason: 'Invalid file URL provided' };
    }

    const isLocal = process.env.UPLOAD_STORAGE === 'local';

    if (isLocal || fileUrl.startsWith('/uploads/') || fileUrl.startsWith('uploads/')) {
      const fs = require('fs');
      const path = require('path');

      const sanitizedPath = fileUrl.replace(/^[/\\]+/, '');
      const absolutePath = path.resolve(process.cwd(), sanitizedPath);
      const uploadsDir = path.resolve(process.cwd(), 'uploads');

      // Path traversal security check
      if (!absolutePath.startsWith(uploadsDir)) {
        const error = new Error('Access denied: File path outside of uploads directory');
        error.statusCode = 403;
        throw error;
      }

      if (fs.existsSync(absolutePath)) {
        try {
          fs.unlinkSync(absolutePath);
          return { deleted: true, type: 'local', path: sanitizedPath };
        } catch (err) {
          console.error('[DeleteAsset] Failed to delete local file:', err);
          return { deleted: false, reason: err.message };
        }
      }
      return { deleted: false, reason: 'File not found on server' };
    } else {
      // Cloudinary asset deletion
      const cleanUrl = fileUrl.split('?')[0];

      // Match public_id including folder hierarchy (e.g. publicast/images/123456789)
      // Handles optional transformation tokens (e.g. c_scale,w_500) and version tokens (v12345)
      const uploadMatch = cleanUrl.match(/\/upload\/(?:(?:[a-z]_[^/]+,)*[a-z]_[^/]+\/)?(?:v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)?$/);
      const publicId = uploadMatch ? decodeURIComponent(uploadMatch[1]) : null;

      if (!publicId) {
        return { deleted: false, reason: 'Could not resolve Cloudinary public ID' };
      }

      // Determine proper resource_type ('image', 'video', or 'raw') as 'auto' is invalid for destroy API
      const isVideo = /\.(mp4|mov|mkv|avi|webm|flv|m4v)$/i.test(cleanUrl) || cleanUrl.includes('/videos/') || cleanUrl.includes('/video/upload/');
      const isRaw = /\.(pdf|doc|docx|xls|xlsx|zip|rar)$/i.test(cleanUrl) || cleanUrl.includes('/raw/upload/');
      const primaryResourceType = isVideo ? 'video' : isRaw ? 'raw' : 'image';

      try {
        const result = await cloudinary.uploader.destroy(publicId, { invalidate: true, resource_type: primaryResourceType });
        
        // If first attempt returned 'not found', attempt fallback with alternative resource_type
        if (result && result.result === 'not found' && primaryResourceType === 'image') {
          const fallbackResult = await cloudinary.uploader.destroy(publicId, { invalidate: true, resource_type: 'video' });
          if (fallbackResult && fallbackResult.result === 'ok') {
            return { deleted: true, type: 'cloudinary', publicId, resourceType: 'video' };
          }
        }

        const isOk = result && (result.result === 'ok' || result.result === 'not found');
        return { deleted: isOk, type: 'cloudinary', publicId, result: result?.result || 'ok' };
      } catch (err) {
        console.error('[DeleteAsset] Cloudinary destroy error:', err);
        return { deleted: false, reason: err.message };
      }
    }
  }

  /**
   * All PlatformLimit rows (every platform/subType) — v1 and v2 of GET
   * /api/posts/platform-limits share this (see postController.getPlatformLimits
   * / getPlatformLimitsV2). Consumed by the composer to pre-validate a
   * File's size/format against the real limit before it's ever uploaded.
   */
  async getPlatformLimits() {
    return prisma.platformLimit.findMany();
  }

  /**
   * Validates and upserts per-platform (and, for brands with multiple
   * accounts of a platform, per-account) caption/media overrides for a post
   * (see PostNetworkOverride in schema.prisma). Called inside the same
   * transaction that creates/updates the Post — an override is meaningless
   * without the post it belongs to, so they're never written independently.
   *
   * networkOverrides: [{ platform, socialAccountId?, useTemplate, caption?, mediaUrls?, threadPosts? }]
   * socialAccountId is omitted/null for brands with a single account of the
   * platform (the common case) — the row then applies to that one implicit
   * account. targetPlatforms: the post's own target platform list
   * (already-split array), used to reject overrides for platforms the post
   * isn't even publishing to.
   */
  async upsertNetworkOverrides(postId, networkOverrides, targetPlatforms, tx, brandId) {
    if (!Array.isArray(networkOverrides) || networkOverrides.length === 0) return;

    const targetSet = new Set(targetPlatforms.map((p) => p.trim().toUpperCase()));

    for (const override of networkOverrides) {
      const platform = override.platform?.trim().toUpperCase();
      if (!platform || !Object.values(PLATFORMS).includes(platform)) {
        const error = new Error(`Invalid platform in networkOverrides: "${override.platform}"`);
        error.statusCode = 400;
        throw error;
      }
      if (!targetSet.has(platform)) {
        const error = new Error(`Cannot override platform "${platform}" — it is not in this post's targetPlatforms.`);
        error.statusCode = 400;
        throw error;
      }

      const socialAccountId = override.socialAccountId || null;
      if (socialAccountId) {
        // Reject an account that doesn't belong to this brand/platform up
        // front, rather than letting the FK constraint fail obscurely later.
        const account = await tx.socialAccount.findUnique({ where: { id: socialAccountId } });
        if (!account || account.brandId !== brandId || account.platform !== platform) {
          const error = new Error(`socialAccountId "${socialAccountId}" is not a valid ${platform} account for this brand.`);
          error.statusCode = 400;
          throw error;
        }
      }

      const mediaUrls = Array.isArray(override.mediaUrls) ? override.mediaUrls.filter(Boolean) : [];
      const threadPosts = Array.isArray(override.threadPosts) ? override.threadPosts : undefined;

      await tx.postNetworkOverride.upsert({
        where: { postId_platform_socialAccountId: { postId, platform, socialAccountId } },
        create: {
          postId,
          platform,
          socialAccountId,
          useTemplate: override.useTemplate !== false,
          caption: override.caption ?? null,
          mediaUrls: mediaUrls.length > 0 ? mediaUrls.join(SEPARATORS.COMMA) : null,
          threadPosts: threadPosts ? JSON.stringify(threadPosts) : null,
        },
        update: {
          useTemplate: override.useTemplate !== false,
          caption: override.caption ?? null,
          mediaUrls: mediaUrls.length > 0 ? mediaUrls.join(SEPARATORS.COMMA) : null,
          threadPosts: threadPosts ? JSON.stringify(threadPosts) : null,
        },
      });
    }
  }

  /**
   * Writes the PostTarget rows (see schema.prisma) recording exactly which
   * SocialAccount(s) a post is targeting per platform — the source of truth
   * consumed by PostSocialAccountFilter (channel views) and SocialPublishStep
   * (publish-time account resolution). Runs unconditionally for every
   * targeted platform, unlike upsertNetworkOverrides which only writes a row
   * when content was actually customized per-account.
   *
   * selectedAccountIds: optional { [platform]: string[] } map of explicitly
   * chosen SocialAccount ids per platform, sent by the composer. For a
   * platform with no explicit selection, falls back to that platform's
   * default/only connected account for the brand (the common single-account
   * case), so older/simpler composer payloads keep working unchanged.
   */
  async upsertPostTargets(postId, targetPlatforms, selectedAccountIds, tx, brandId) {
    await tx.postTarget.deleteMany({ where: { postId } });

    for (const platform of targetPlatforms) {
      const normalizedPlatform = platform.trim().toUpperCase();
      let accountIds = Array.isArray(selectedAccountIds?.[normalizedPlatform])
        ? selectedAccountIds[normalizedPlatform].filter(Boolean)
        : [];

      if (accountIds.length === 0) {
        const fallbackAccount = await tx.socialAccount.findFirst({
          where: { brandId, platform: normalizedPlatform, isConnected: true },
          orderBy: [{ isDefault: 'desc' }, { connectedAt: 'asc' }]
        });
        if (fallbackAccount) {
          accountIds = [fallbackAccount.id];
        }
      }

      if (accountIds.length === 0) continue;

      const accounts = await tx.socialAccount.findMany({
        where: { id: { in: accountIds }, brandId, platform: normalizedPlatform }
      });
      if (accounts.length !== accountIds.length) {
        const error = new Error(`One or more selected accounts are not valid ${normalizedPlatform} accounts for this brand.`);
        error.statusCode = 400;
        throw error;
      }

      await tx.postTarget.createMany({
        data: accounts.map((account) => ({
          postId,
          platform: normalizedPlatform,
          socialAccountId: account.id
        }))
      });
    }
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
    // Merge preset options and target platforms from AutoList if autoListId is present
    await this._applyAutoListPresets(postData);

    // Pre-check outside the transaction: fast-fail obviously-over-limit
    // requests without taking a row lock. This alone is still a
    // check-then-act race (see the re-check inside the transaction below,
    // which is what actually closes #60).
    const brand = await brandRepository.findBrandWithSubscription(brandId);
    const planLimit = brand?.subscription?.status === 'ACTIVE' ? brand.subscription.plan?.planLimit : null;
    if (planLimit) {
      const currentCount = await postRepository.countActivePostsThisMonth(brandId);
      if (currentCount >= planLimit.maxPostsPerMonth) {
        const error = new Error(`Monthly post limit of ${planLimit.maxPostsPerMonth} reached. Please upgrade your plan.`);
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
      logger.debug('[PostService] Validating post data:', { postData: { title: postData.title, targetPlatforms: postData.targetPlatforms, options: postData.options }, mediaInfo });
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
      const hasApprovePermission = await authorizationFacade.hasPermission(userId, brandId, PERMISSION_KEYS.APPROVE_POSTS);
      if (!hasApprovePermission) {
        // Force status to PENDING_APPROVAL
        data.status = POST_STATUS.PENDING_APPROVAL;
      }
    }

    // "Publish now" requests arrive as status=PUBLISHED, but writing that
    // straight to the DB marks the post as live before any platform API
    // call has actually happened. claimForPublishing() only claims posts
    // out of SCHEDULED/DRAFT/RETRYING (see publish-post.handler.js), so a
    // post created as PUBLISHED has its publish job silently skipped —
    // the post shows as "published" in the UI while nothing was ever sent
    // to YouTube/Instagram/Facebook/etc. Route it through SCHEDULED (now)
    // instead, so the same claim + publish pipeline that handles scheduled
    // posts runs immediately and only flips the row to PUBLISHED once the
    // platform calls actually succeed (see update-db.step.js).
    if (data.status === POST_STATUS.PUBLISHED) {
      data.status = POST_STATUS.SCHEDULED;
      data.scheduledAt = new Date();
    }

    logger.debug('[PostService] Final payload to database:', data);

    const post = await prisma.$transaction(async (tx) => {
      // Re-check the monthly post limit inside the transaction, behind a row
      // lock on the brand's Subscription — closes the check-then-act race
      // (#60): two concurrent createPost calls now serialize on this lock
      // instead of both reading a count under the limit and both writing.
      if (planLimit) {
        await subscriptionRepository.lockSubscriptionForUpdate(brandId, tx);
        const lockedCount = await postRepository.countActivePostsThisMonth(brandId, tx);
        if (lockedCount >= planLimit.maxPostsPerMonth) {
          const error = new Error(`Monthly post limit of ${planLimit.maxPostsPerMonth} reached. Please upgrade your plan.`);
          error.statusCode = 403;
          throw error;
        }
      }

      const created = await postRepository.create(data, tx);
      logger.debug('[PostService] Post successfully created in DB with ID:', created.id);

      const targetPlatformsArr = Array.isArray(postData.targetPlatforms)
        ? postData.targetPlatforms
        : (postData.targetPlatforms || '').split(SEPARATORS.COMMA).filter(Boolean);

      await this.upsertPostTargets(created.id, targetPlatformsArr, postData.selectedAccountIds, tx, brandId);

      if (postData.networkOverrides) {
        await this.upsertNetworkOverrides(created.id, postData.networkOverrides, targetPlatformsArr, tx, brandId);
      }

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

      const mediaLibraryService = require('./media-library.service');
      await mediaLibraryService.syncMediaUsage(brandId, validMediaUrls, [], tx);

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
      type: postData.type !== undefined ? postData.type : post.type,
      caption: postData.caption !== undefined ? postData.caption : post.caption,
      title: postData.title !== undefined ? postData.title : post.title,
      targetPlatforms: postData.targetPlatforms !== undefined ? postData.targetPlatforms : (post.targetPlatforms ? post.targetPlatforms.split(',') : []),
      brandId,
      options: {}
    };

    let postOptions = {};
    if (post.metadata) {
      try { postOptions = JSON.parse(post.metadata); } catch(e) {}
    }
    
    // Inherit AutoList preset options if post belongs to an AutoList
    const effectiveAutoListId = postData.autoListId !== undefined ? postData.autoListId : post.autoListId;
    let autoListPresets = {};
    if (effectiveAutoListId) {
      try {
        const autoList = await autoListRepository.findById(effectiveAutoListId);
        if (autoList && autoList.metadata) {
          const meta = typeof autoList.metadata === 'string' ? JSON.parse(autoList.metadata) : autoList.metadata;
          autoListPresets = this._mapAutoListPresets(meta);
        }
      } catch (e) {}
    }

    mergedPostData.options = {
      ...autoListPresets,
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
      logger.debug('[PostService] Validating merged post data for update:', { mergedPostData: { title: mergedPostData.title, targetPlatforms: mergedPostData.targetPlatforms, options: mergedPostData.options }, mediaInfo });
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
      // Với các platform khác (Instagram, TikTok, YouTube...) không hỗ trợ edit,
      // chỉ cập nhật DB và không cần ném lỗi.
    }

    const data = this._prepareUpdateData(postData);

    // Check if status is changed to scheduled/approved/published
    const isDirectPublishing = data.status && [POST_STATUS.SCHEDULED, POST_STATUS.APPROVED, POST_STATUS.PUBLISHED].includes(data.status);

    if (isDirectPublishing) {
      const hasApprovePermission = await authorizationFacade.hasPermission(userId, brandId, PERMISSION_KEYS.APPROVE_POSTS);
      if (!hasApprovePermission) {
        // Force status to PENDING_APPROVAL
        data.status = POST_STATUS.PENDING_APPROVAL;
      }
    }

    const statusChangedToPublished = post.status !== POST_STATUS.PUBLISHED && postData.status?.toUpperCase() === POST_STATUS.PUBLISHED;

    const updatedPost = await prisma.$transaction(async (tx) => {
      // Lock row + xác nhận chưa bị request khác sửa từ lúc đọc snapshot ở đầu hàm
      // (so sánh updatedAt) — post đọc ở dòng 195 chỉ dùng để quyết định business
      // logic (merge/validate/gọi social API bên trên), không phải nguồn sự thật
      // cuối để ghi đè. Network I/O (Social APIs) đã chạy xong ở trên, KHÔNG
      // nằm trong transaction này — chỉ thao tác DB thuần trong lock ngắn.
      await postRepository.lockAndAssertFresh(id, post.updatedAt, tx);

      const updated = await postRepository.update(id, data, tx);

      // Ghi lại networkOverrides + PostTarget khi bài CHƯA publish — bài đã
      // PUBLISHED có luồng xử lý riêng ở nhánh phía trên (dòng 439-468) và
      // không hỗ trợ sửa override/targeting nữa. Dùng post.status (snapshot
      // CŨ trước update) để quyết định: nếu bài chưa từng published tại thời
      // điểm request này, override/targeting phải được lưu, kể cả khi cùng
      // request đó đổi status sang SCHEDULED/DRAFT trong payload mới.
      // targetPlatforms lấy từ updated (đã qua _prepareUpdateData) — luôn là string
      // chuẩn hoá, split SEPARATORS.COMMA là đủ, không cần xử lý mảng/string 2 nhánh.
      if (post.status !== POST_STATUS.PUBLISHED) {
        const targetPlatformsArr = updated.targetPlatforms
          ? updated.targetPlatforms.split(SEPARATORS.COMMA).filter(Boolean)
          : [];

        await this.upsertPostTargets(updated.id, targetPlatformsArr, postData.selectedAccountIds, tx, brandId);

        if (postData.networkOverrides) {
          await this.upsertNetworkOverrides(updated.id, postData.networkOverrides, targetPlatformsArr, tx, brandId);
        }
      }

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

      const oldMediaUrls = post.mediaUrls ? post.mediaUrls.split(',').map(u => u.trim()).filter(Boolean) : [];
      const newMediaUrls = updated.mediaUrls ? updated.mediaUrls.split(',').map(u => u.trim()).filter(Boolean) : [];
      const addedUrls = newMediaUrls.filter(u => !oldMediaUrls.includes(u));
      const removedUrls = oldMediaUrls.filter(u => !newMediaUrls.includes(u));

      const mediaLibraryService = require('./media-library.service');
      await mediaLibraryService.syncMediaUsage(brandId, addedUrls, removedUrls, tx);

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

    // Chỉ cho phép retry khi post ở trạng thái thất bại — tránh double publish
    const RETRYABLE_STATUSES = [POST_STATUS.FAILED, POST_STATUS.RETRYING];
    if (!RETRYABLE_STATUSES.includes(post.status)) {
      const error = new Error(`Không thể retry bài viết ở trạng thái "${post.status}". Chỉ retry được bài có trạng thái: ${RETRYABLE_STATUSES.join(', ')}.`);
      error.statusCode = 422;
      throw error;
    }

    logger.debug(`[Post Service] Queueing retry job for Post ${postId} on platforms: ${platforms.join(', ')}`);
    const { safeUpsertPublishJob } = require('../../queues/publish.queue');
    const jobId = `publish-post-${postId}`;

    // Đặt trạng thái RETRYING trước khi enqueue — PublishPostHandler.claimForPublishing
    // chỉ chấp nhận SCHEDULED/DRAFT/RETRYING, bài FAILED sẽ bị skip nếu không set trước.
    await postRepository.updateStatus(postId, POST_STATUS.RETRYING);

    // safeUpsertPublishJob skips the upsert if a job for this post is
    // currently active — a plain remove-then-add here would race the running
    // worker (#106): remove() can't touch an active job, so the stale job
    // keeps running while this add() either gets deduped away (retry lost)
    // or coexists once the active job completes (double publish).
    const { applied } = await safeUpsertPublishJob(jobId, QUEUE_CONFIG.PUBLISH.JOB_PUBLISH, {
      postId,
      retryPlatforms: platforms
    }, { delay: 0 });

    if (!applied) {
      // Rollback status nếu không enqueue được
      await postRepository.updateStatus(postId, post.status);
      const error = new Error('Post đang được xử lý bởi một job khác, vui lòng thử lại sau ít phút.');
      error.statusCode = 409;
      throw error;
    }

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
          logger.debug(`[Post Service] Attempting social deletion for post: ${post.id}, targetPlatforms: ${targetPlatforms.join(', ')}, platformPostId: ${post.platformPostId}`);
          for (const platform of targetPlatforms) {
            try {
              const service = socialPlatformFactory.getService(platform);
              if (service.deletePost) {
                logger.debug(`[Post Service] Found deletePost for ${platform}. Invoking service.deletePost...`);
                const platformId = this._getPlatformPostId(post, platform);
                if (platformId) {
                  // socialAccountId(s) come from PostTarget — the source of
                  // truth for which account(s) this platform actually
                  // published to (see PostTarget in schema.prisma). A post
                  // may target multiple accounts of the same platform, so
                  // delete from each one.
                  const targets = (post.targets || []).filter(t => t.platform === platform);
                  const accountIds = targets.length > 0 ? targets.map(t => t.socialAccountId) : [null];
                  for (const socialAccountId of accountIds) {
                    await service.deletePost(brandId, platformId, socialAccountId);
                  }
                  logger.debug(`[Post Service] Successfully deleted post on ${platform}`);
                } else {
                  logger.debug(`[Post Service] No platform post ID found for ${platform}`);
                }
              } else {
                logger.debug(`[Post Service] Platform ${platform} service does not implement deletePost`);
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
      const deleted = await postRepository.updateMany({ id: { in: ids }, brandId }, { isDeleted: true, deletedAt: new Date() }, tx);

      for (const postId of scheduledPostIds) {
        await outboxEventRepository.create(OUTBOX_EVENT_TYPES.POST_PUBLISH_REMOVE, postId, { postId }, {}, tx);
      }
      await outboxEventRepository.create(OUTBOX_EVENT_TYPES.POST_DOMAIN_EVENT, brandId, { eventName: EVENTS.POST.BULK_DELETED, eventArgs: { autolistIds } }, {}, tx);

      const deletedMediaUrls = posts.flatMap(p => p.mediaUrls ? p.mediaUrls.split(',').map(u => u.trim()).filter(Boolean) : []);
      const mediaLibraryService = require('./media-library.service');
      await mediaLibraryService.syncMediaUsage(brandId, [], deletedMediaUrls, tx);

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
      libraryVisibility: p.libraryVisibility,
      options,
      approvalInfo,
      platformPostId,
      networkOverrides: (p.networkOverrides || []).map((o) => ({
        platform: o.platform,
        socialAccountId: o.socialAccountId,
        useTemplate: o.useTemplate,
        caption: o.caption,
        mediaUrls: o.mediaUrls ? splitMediaUrls(o.mediaUrls) : [],
        threadPosts: o.threadPosts ? JSON.parse(o.threadPosts) : null,
      }))
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

    // Re-fetch platformPostId mới nhất từ DB — post truyền vào có thể là snapshot cũ
    // từ outbox payload (retry sau lỗi), không phản ánh các platform đã publish thành công trước đó.
    const latestPost = await postRepository.findById(post.id);
    const currentPlatformPostId = latestPost?.platformPostId || post.platformPostId;

    // Parse platformPostId hiện tại (nếu có) thành JSON map
    let platformIdMap = {};
    if (currentPlatformPostId) {
      try {
        platformIdMap = JSON.parse(currentPlatformPostId);
        if (typeof platformIdMap !== 'object' || platformIdMap === null) {
          // Trường hợp là chuỗi đơn (tương thích ngược)
          platformIdMap = { [PLATFORMS.YOUTUBE]: currentPlatformPostId };
        }
      } catch (e) {
        platformIdMap = { [PLATFORMS.YOUTUBE]: currentPlatformPostId };
      }
    }

    let hasChanges = false;
    let errors = [];

    for (const platform of platformsToSchedule) {
      // Nếu platform này đã được lên lịch gốc rồi thì bỏ qua
      if (platformIdMap[platform]) {
        continue;
      }

      logger.debug(`[PostService] 🚀 Triggering early Native Scheduling for platform: ${platform}, Post: ${post.id}`);
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
          logger.debug(`[PostService] ✅ ${platform} Native Scheduling successful! ID: ${result.platformVideoId}`);
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
    
    logger.debug(`[PostService] 🧹 Cleaning up Native Scheduling on platforms for post: ${post.id}`);
    
    for (const platform of targetPlatforms) {
      try {
        const service = socialPlatformFactory.getService(platform);
        if (service && typeof service.deletePost === 'function') {
          const platformId = this._getPlatformPostId(post, platform);
          if (platformId) {
            logger.debug(`[PostService] Invoking deletePost on ${platform} for ID: ${platformId}`);
            const targets = (post.targets || []).filter(t => t.platform === platform);
            const accountIds = targets.length > 0 ? targets.map(t => t.socialAccountId) : [null];
            for (const socialAccountId of accountIds) {
              await service.deletePost(post.brandId, platformId, socialAccountId);
            }
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

  /**
   * Delegate việc map AutoList metadata -> post options cho presetStrategyFactory
   * (Tuân thủ nguyên tắc SOLID: OCP, SRP, DIP).
   */
  _mapAutoListPresets(meta) {
    return presetStrategyFactory.mapAllPresets(meta);
  }

  /**
   * Apply preset options and target platforms from AutoList metadata if post belongs to an AutoList
   */
  async _applyAutoListPresets(postData) {
    if (!postData || !postData.autoListId) return postData;

    try {
      const autoList = await autoListRepository.findById(postData.autoListId);
      if (!autoList) return postData;

      // Default targetPlatforms from AutoList if not explicitly provided
      if ((!postData.targetPlatforms || postData.targetPlatforms.length === 0) && autoList.targetPlatforms) {
        postData.targetPlatforms = autoList.targetPlatforms.split(',').filter(Boolean);
      }

      // Merge preset options from AutoList metadata
      if (autoList.metadata) {
        const meta = typeof autoList.metadata === 'string' ? JSON.parse(autoList.metadata) : autoList.metadata;
        const presetOptions = this._mapAutoListPresets(meta);

        postData.options = {
          ...presetOptions,
          ...(postData.options || {})
        };
      }
    } catch (err) {
      console.warn(`[_applyAutoListPresets] Failed to apply AutoList presets for ${postData.autoListId}:`, err.message);
    }

    return postData;
  }

  _preparePostData(postData, userId, brandId) {
    const { title, caption, type = POST_TYPES.VIDEO, status = POST_STATUS.DRAFT, targetPlatforms = [], mediaUrls = [], mediaThumbnailUrls = [], scheduledAt, isLibrary = false, libraryVisibility, altText = null, autoListId = null, options = {} } = postData;
    
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
      libraryVisibility: Object.values(CHANNEL_GROUP_VISIBILITY).includes(libraryVisibility) ? libraryVisibility : CHANNEL_GROUP_VISIBILITY.TEAM,
      autoListId,
      firstComment: normalizedOptions.firstComment || null,
      metadata: normalizedOptions ? JSON.stringify(normalizedOptions) : null
    };
  }

  _prepareUpdateData(postData) {
    const { title, caption, type, status, targetPlatforms, mediaUrls, mediaThumbnailUrls, scheduledAt, isLibrary, libraryVisibility, altText, autoListId, firstComment } = postData;
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
    if (libraryVisibility !== undefined && Object.values(CHANNEL_GROUP_VISIBILITY).includes(libraryVisibility)) {
      data.libraryVisibility = libraryVisibility;
    }
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
}

module.exports = new PostService();
