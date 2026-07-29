const postService = require('../../services/workspace/post.service');
const asyncHandler = require('../../utils/async-handler');
const videoProcessorFacade = require('../../services/workspace/video/video-processor.facade');
const TranscriptionStrategyFactory = require('../../services/workspace/ai/transcription/transcription-strategy.factory');
const { TASK_STATUS, REDIS_PREFIXES, QUEUE_CONFIG } = require('../../constants/video-publish.constants');

class PostController {
  /**
   * GET /api/posts
   * Fetch all posts with filters.
   * brandId is required — prevents cross-brand data leakage via omission.
   */
  getPosts = asyncHandler(async (req, res) => {
    const brandId = req.query.brandId;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });

    const result = await postService.getPosts(req.query, brandId);

    res.status(200).json({
      message: 'Posts retrieved successfully',
      ...result
    });
  });

  /**
   * GET /api/posts/platform-limits
   * Fetch all limits configuration from DB
   */
  getPlatformLimits = asyncHandler(async (req, res) => {
    const limits = await postService.getPlatformLimits();
    res.status(200).json({
      message: 'Platform limits retrieved successfully',
      data: limits
    });
  });

  /**
   * GET /api/posts/best-times
   */
  getBestTimes = asyncHandler(async (req, res) => {
    const brandId = req.query.brandId;
    const platform = req.query.platform || 'INSTAGRAM';
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });

    const data = await postService.getBestTimes(brandId, platform);
    res.status(200).json({
      message: 'Best times retrieved successfully',
      data
    });
  });

  /**
   * POST /api/posts
   * Create a new post
   */
  createPost = asyncHandler(async (req, res) => {
    const { brandId } = req.body;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });

    console.log("=== CREATE POST ===");
    console.log("Request Body:", JSON.stringify(req.body, null, 2));

    const userId = req.user.id;
    const post = await postService.createPost(req.body, userId, brandId);

    res.status(201).json({
      message: 'Post created successfully',
      data: post
    });
  });

  /**
   * PUT /api/posts/:id
   * Update an existing post
   */
  updatePost = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { brandId } = req.body;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });

    const post = await postService.updatePost(id, req.body, brandId, req.user.id);

    res.status(200).json({
      message: 'Post updated successfully',
      data: post
    });
  });

  /**
   * POST /api/posts/bulk-approve
   */
  bulkApprove = asyncHandler(async (req, res) => {
    const { brandId } = req.body;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });
    
    const targetIds = this._getBulkIds(req.body);
    if (!targetIds) return res.status(400).json({ message: 'ids array is required' });

    const count = await postService.bulkApprove(targetIds, brandId);
    res.status(200).json({ message: 'Posts approved successfully', count });
  });

  /**
   * DELETE /api/posts/bulk
   */
  bulkDelete = asyncHandler(async (req, res) => {
    const { brandId, deleteFromSocials } = req.body;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });
    
    const targetIds = this._getBulkIds(req.body);
    if (!targetIds) return res.status(400).json({ message: 'ids array is required' });

    const count = await postService.bulkDelete(targetIds, brandId, deleteFromSocials === true || deleteFromSocials === 'true');
    res.status(200).json({ message: 'Posts deleted successfully', count });
  });

  /**
   * POST /api/posts/bulk-restore
   */
  bulkRestore = asyncHandler(async (req, res) => {
    const { brandId } = req.body;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });
    
    const targetIds = this._getBulkIds(req.body);
    if (!targetIds) return res.status(400).json({ message: 'ids array is required' });

    const count = await postService.bulkRestore(targetIds, brandId);
    res.status(200).json({ message: 'Posts restored successfully', count });
  });

  /**
   * DELETE /api/posts/trash
   */
  emptyTrash = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });

    const count = await postService.emptyTrash(brandId);
    res.status(200).json({ message: 'Trash emptied successfully', count });
  });

  /**
   * POST /api/posts/upload
   * See postService.processUploadedFile for the enforcement logic (shared
   * with v2's uploadVideoV2 below).
   */
  uploadVideo = asyncHandler(async (req, res) => {
    const { videoUrl, sizeMb, duration, format } = await postService.processUploadedFile(req);
    res.status(200).json({ message: 'Video uploaded successfully', videoUrl, sizeMb, duration, format });
  });

  /**
   * GET /api/posts/:id/analytics
   */
  getPostAnalytics = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const brandId = req.query.brandId;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });

    const data = await postService.getPostAnalytics(id, brandId);
    res.status(200).json({
      message: 'Post analytics history retrieved successfully',
      data
    });
  });

  /**
   * POST /api/posts/trim
   */
  trimVideo = asyncHandler(async (req, res) => {
    const {
      videoUrl,
      startTime,
      endTime,
      aspectRatio,
      keyframes,
      adjustments,
      filterPreset,
      resize,
      audioUrl,
      audioVolume,
      textOverlays,
      subtitles,
      brandId
    } = req.body;
    if (!videoUrl) return res.status(400).json({ message: 'videoUrl is required' });
    if (startTime === undefined || endTime === undefined) {
      return res.status(400).json({ message: 'startTime and endTime are required' });
    }

    const crypto = require('crypto');
    const redisClient = require('../../config/redis');
    const { videoQueue } = require('../../queues/video.queue');
    const userId = req.user.id;

    // 1. Tạo taskId duy nhất kết hợp userId để tránh rò rỉ dữ liệu chéo người dùng
    const taskDataString = JSON.stringify({
      userId,
      videoUrl,
      startTime,
      endTime,
      aspectRatio,
      keyframes,
      adjustments,
      filterPreset,
      resize,
      audioUrl,
      audioVolume,
      textOverlays,
      subtitles
    });
    const taskHash = crypto.createHash('sha256').update(taskDataString).digest('hex');
    const taskId = `trim_${taskHash}`;

    const lockKey = `${REDIS_PREFIXES.LOCK_VIDEO_TRIM}${taskId}`;

    // 2. Chống Race Condition khi double-click đồng thời bằng Lock Key tạm thời
    const acquireLock = await redisClient.set(lockKey, 'LOCKED', { NX: true, EX: 10 });
    if (!acquireLock) {
      res.set('Retry-After', '1'); // Khuyến nghị client đợi 1 giây trước khi thử lại
      return res.status(429).json({ message: 'Yêu cầu đang được xử lý, vui lòng không gửi dồn dập.' });
    }

    try {
      // 3. Kiểm tra trạng thái hiện tại của task
      const taskKey = `${REDIS_PREFIXES.TASK_VIDEO_TRIM}${taskId}`;
      const existingTaskData = await redisClient.get(taskKey);

      if (existingTaskData) {
        const task = JSON.parse(existingTaskData);
        // Chỉ tái sử dụng và trả về 202 nếu đang PROCESSING hoặc đã SUCCESS
        if (task.status === TASK_STATUS.PROCESSING || task.status === TASK_STATUS.SUCCESS) {
          return res.status(202).json({
            message: 'Video processing already in progress or completed',
            taskId
          });
        }
        
        // Nếu trạng thái cũ là FAILED, dọn dẹp job cũ trong BullMQ để tránh trùng lặp jobId
        if (task.status === TASK_STATUS.FAILED) {
          console.log(`[Queue Cleanup] Removing failed old job ${taskId} from BullMQ queue...`);
          const oldJob = await videoQueue.getJob(taskId);
          if (oldJob) {
            await oldJob.remove();
            console.log(`[Queue Cleanup] Successfully removed failed old job ${taskId}`);
          }
        }
      }

      // 4. Thiết lập trạng thái PROCESSING lên Redis (Ghi đè nếu trước đó là FAILED)
      await redisClient.set(taskKey, JSON.stringify({
        status: TASK_STATUS.PROCESSING,
        userId,
        startTime: Date.now()
      }), { EX: 86400 });

      // 5. Thêm job xử lý vào BullMQ với cơ chế Rollback toàn phần
      try {
        await videoQueue.add(QUEUE_CONFIG.VIDEO.JOB_TRIM, {
          videoUrl,
          startTime: parseFloat(startTime),
          endTime: parseFloat(endTime),
          aspectRatio,
          keyframes: Array.isArray(keyframes) ? keyframes : [],
          adjustments,
          filterPreset,
          resize,
          audioUrl,
          audioVolume: audioVolume !== undefined ? parseInt(audioVolume) : 50,
          textOverlays: Array.isArray(textOverlays) ? textOverlays : [],
          subtitles: Array.isArray(subtitles) ? subtitles : [],
          brandId,
          userId
        }, { jobId: taskId });
      } catch (queueErr) {
        // Rollback trạng thái Redis nếu không đẩy được job vào queue thành công
        console.error(`[Queue Error] Failed to add job ${taskId} to BullMQ. Rolling back Redis state.`, queueErr.message);
        await redisClient.del(taskKey);
        throw queueErr; // Ném lỗi để Express Handler trả về lỗi 500
      }

      res.status(202).json({
        message: 'Video processing started in background',
        taskId
      });
    } finally {
      // 6. Giải phóng lock key
      await redisClient.del(lockKey);
    }
  });

  /**
   * GET /api/posts/trim/:taskId/status
   */
  getTrimStatus = asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const redisClient = require('../../config/redis');
    const userId = req.user.id;

    const taskKey = `${REDIS_PREFIXES.TASK_VIDEO_TRIM}${taskId}`;
    const taskData = await redisClient.get(taskKey);
    if (!taskData) {
      return res.status(404).json({ message: 'Task not found or expired' });
    }

    const task = JSON.parse(taskData);
    // Kiểm tra quyền sở hữu để tránh rò rỉ chéo dữ liệu người dùng
    if (task.userId !== userId) {
      return res.status(403).json({ message: 'Access denied: You do not own this task.' });
    }

    res.status(200).json(task);
  });

  /**
   * POST /api/posts/:id/retry-failed
   */
  retryFailedPlatforms = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const brandId = req.brandId || req.body.brandId || req.headers['x-brand-id'];
    const { platforms } = req.body;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });
    if (!platforms || !Array.isArray(platforms)) return res.status(400).json({ message: 'platforms array is required' });

    const result = await postService.retryFailedPlatforms(id, platforms, brandId, req.user.id);
    res.status(200).json({
      message: 'Đã xếp hàng gửi lại bài viết thành công.',
      platforms: result.platforms
    });
  });

  /**
   * POST /api/posts/transcribe
   */
  transcribeVideo = asyncHandler(async (req, res) => {
    const { videoUrl } = req.body;
    if (!videoUrl) return res.status(400).json({ message: 'videoUrl is required' });

    // Download video to temp folder to perform transcribe locally
    const fs = require('fs');
    const path = require('path');
    const tempDir = path.join(process.cwd(), 'uploads', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const localPath = path.join(tempDir, `transcribe-${Date.now()}.mp4`);

    try {
      await videoProcessorFacade._resolveFile(videoUrl, localPath);

      // Perform transcription
      const strategy = TranscriptionStrategyFactory.getStrategy();
      const subtitles = await strategy.transcribe(localPath, 'video/mp4');

      res.status(200).json({
        message: 'Video speech transcribed successfully',
        subtitles
      });
    } finally {
      // Clean up temp file
      if (fs.existsSync(localPath)) {
        try {
          fs.unlinkSync(localPath);
        } catch (err) {
          console.warn(`Failed to delete temp transcribe file: ${err.message}`);
        }
      }
    }
  });

  /**
   * GET /api/posts/music
   */
  getMusicTracks = asyncHandler(async (req, res) => {
    const { mood } = req.query;
    
    // Provide real public domain or CC-licensed audio files so that previewing works 100% in frontend!
    const defaultTracks = {
      upbeat: [
        { id: 'upbeat_1', name: 'Summer Energetic Party', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', duration: 372 },
        { id: 'upbeat_2', name: 'Dance Pop Club Wave', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', duration: 423 }
      ],
      chill: [
        { id: 'chill_1', name: 'Lofi Sunset Lounge', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', duration: 302 },
        { id: 'chill_2', name: 'Ocean Air Chillout', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', duration: 502 }
      ],
      corporate: [
        { id: 'corp_1', name: 'Modern Tech Presentation', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', duration: 362 },
        { id: 'corp_2', name: 'Professional Corporate Motion', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', duration: 440 }
      ],
      epic: [
        { id: 'epic_1', name: 'Synthwave Cinematic Saga', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', duration: 312 },
        { id: 'epic_2', name: 'Cyberpunk Chase Anthem', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', duration: 350 }
      ]
    };

    const tracks = defaultTracks[mood] || defaultTracks.chill;

    res.status(200).json({
      message: 'Music tracks retrieved successfully',
      data: tracks
    });
  });

  // ============= Private Helper Methods =============

  _getBulkIds(body) {
    const targetIds = body.ids || body.postIds;
    return (targetIds && Array.isArray(targetIds)) ? targetIds : null;
  }
}

module.exports = new PostController();
