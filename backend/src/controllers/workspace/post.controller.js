const postService = require('../../services/workspace/post.service');
const asyncHandler = require('../../utils/async-handler');
const videoProcessorFacade = require('../../services/workspace/video/video-processor.facade');
const TranscriptionStrategyFactory = require('../../services/workspace/ai/transcription/transcription-strategy.factory');
const { TASK_STATUS, REDIS_PREFIXES, QUEUE_CONFIG } = require('../../constants/video-publish.constants');
const logger = require('../../utils/logger');

class PostController {
  /**
   * GET /api/posts
   * Fetch all posts with filters.
   * brandId is required — prevents cross-brand data leakage via omission.
   */
  getPosts = asyncHandler(async (req, res) => {
    const brandId = req.query.brandId;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });

    const result = await postService.getPosts(req.query, brandId, req.user.id);

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
   * POST /api/posts
   * Create a new post
   */
  createPost = asyncHandler(async (req, res) => {
    const { brandId } = req.body;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });

    logger.debug("=== CREATE POST ===");
    logger.debug("Request Body:", JSON.stringify(req.body, null, 2));

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
    const { videoUrl, sizeMb, duration, format, width, height, frameRate, codec } = await postService.processUploadedFile(req);
    res.status(200).json({ message: 'Video uploaded successfully', videoUrl, sizeMb, duration, format, width, height, frameRate, codec });
  });

  /**
   * DELETE /api/posts/upload
   * Delete uploaded asset file (Rollback uncommitted uploads)
   */
  deleteUploadedFile = asyncHandler(async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ message: 'url is required' });

    const result = await postService.deleteUploadedAsset(url);
    res.status(200).json({
      message: result.deleted ? 'Uploaded asset deleted successfully' : 'Asset not deleted',
      ...result
    });
  });



  /**
   * Submits a single trim job to BullMQ, deduped/locked by a content hash of
   * (userId, videoUrl, edit params). Shared by trimVideo (single clip) and
   * the splitPoints branch (one call per resulting segment) so both paths
   * get the same double-submit lock + FAILED-job cleanup + rollback semantics.
   * Returns { taskId, status } where status is 'queued' | 'in_progress' |
   * 'rate_limited' (the last one only when the caller must surface a 429).
   */
  async _submitTrimJob({ userId, videoUrl, startTime, endTime, aspectRatio, keyframes, adjustments, filterPreset, resize, keepAudio, audioUrl, audioVolume, textOverlays, subtitles, brandId }) {
    const crypto = require('crypto');
    const redisClient = require('../../config/redis');
    const { videoQueue } = require('../../queues/video.queue');

    const taskDataString = JSON.stringify({
      userId, videoUrl, startTime, endTime, aspectRatio, keyframes,
      adjustments, filterPreset, resize, keepAudio, audioUrl, audioVolume,
      textOverlays, subtitles
    });
    const taskHash = crypto.createHash('sha256').update(taskDataString).digest('hex');
    const taskId = `trim_${taskHash}`;

    const lockKey = `${REDIS_PREFIXES.LOCK_VIDEO_TRIM}${taskId}`;
    const acquireLock = await redisClient.set(lockKey, 'LOCKED', { NX: true, EX: 10 });
    if (!acquireLock) {
      return { taskId, status: 'rate_limited' };
    }

    try {
      const taskKey = `${REDIS_PREFIXES.TASK_VIDEO_TRIM}${taskId}`;
      const existingTaskData = await redisClient.get(taskKey);

      if (existingTaskData) {
        const task = JSON.parse(existingTaskData);
        if (task.status === TASK_STATUS.PROCESSING || task.status === TASK_STATUS.SUCCESS) {
          return { taskId, status: 'in_progress' };
        }
        if (task.status === TASK_STATUS.FAILED) {
          logger.debug(`[Queue Cleanup] Removing failed old job ${taskId} from BullMQ queue...`);
          const oldJob = await videoQueue.getJob(taskId);
          if (oldJob) {
            await oldJob.remove();
            logger.debug(`[Queue Cleanup] Successfully removed failed old job ${taskId}`);
          }
        }
      }

      await redisClient.set(taskKey, JSON.stringify({
        status: TASK_STATUS.PROCESSING,
        userId,
        startTime: Date.now()
      }), { EX: 86400 });

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
          keepAudio,
          audioUrl,
          audioVolume: audioVolume !== undefined ? parseInt(audioVolume) : 50,
          textOverlays: Array.isArray(textOverlays) ? textOverlays : [],
          subtitles: Array.isArray(subtitles) ? subtitles : [],
          brandId,
          userId
        }, { jobId: taskId });
      } catch (queueErr) {
        console.error(`[Queue Error] Failed to add job ${taskId} to BullMQ. Rolling back Redis state.`, queueErr.message);
        await redisClient.del(taskKey);
        throw queueErr;
      }

      return { taskId, status: 'queued' };
    } finally {
      await redisClient.del(lockKey);
    }
  }

  /**
   * POST /api/posts/trim
   *
   * splitPoints (optional): sorted array of in-range timestamps (seconds,
   * strictly between startTime and endTime) marking where to cut the
   * selected [startTime, endTime] range into separate output clips —
   * e.g. startTime=0, endTime=30, splitPoints=[10, 20] produces 3 segments:
   * [0,10], [10,20], [20,30]. Each segment is submitted as its own trim job
   * (same aspectRatio/adjustments/filterPreset/resize/audio applied to all),
   * and the response shape changes to `segments: [{taskId, status, startTime,
   * endTime}]` instead of a single `taskId`, so the client polls each
   * segment's status independently. Without splitPoints, behavior is
   * unchanged (single taskId, as before).
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
      saveAudio,
      keepAudio,
      muteAudio,
      audioUrl,
      audioVolume,
      textOverlays,
      subtitles,
      splitPoints,
      brandId
    } = req.body;
    if (!videoUrl) return res.status(400).json({ message: 'videoUrl is required' });
    if (startTime === undefined || endTime === undefined) {
      return res.status(400).json({ message: 'startTime and endTime are required' });
    }

    const rangeStart = parseFloat(startTime);
    const rangeEnd = parseFloat(endTime);

    // Chuẩn hóa cờ giữ âm thanh gốc (Mặc định true ngoại trừ khi saveAudio/keepAudio === false hoặc muteAudio === true)
    const isAudioKept = saveAudio !== undefined ? Boolean(saveAudio) : keepAudio !== undefined ? Boolean(keepAudio) : muteAudio !== undefined ? !muteAudio : true;
    const userId = req.user.id;

    const sharedParams = {
      userId, videoUrl, aspectRatio, keyframes, adjustments, filterPreset,
      resize, keepAudio: isAudioKept, audioUrl, audioVolume, textOverlays,
      subtitles, brandId
    };

    // Split mode: validate points are strictly inside the range and sorted,
    // then submit one job per resulting segment.
    if (Array.isArray(splitPoints) && splitPoints.length > 0) {
      const points = splitPoints.map((p) => parseFloat(p)).filter((p) => Number.isFinite(p));
      const invalid = points.some((p) => p <= rangeStart || p >= rangeEnd);
      if (invalid || points.length !== splitPoints.length) {
        return res.status(400).json({ message: 'splitPoints must be finite numbers strictly between startTime and endTime.' });
      }
      const sortedPoints = [...new Set(points)].sort((a, b) => a - b);
      const boundaries = [rangeStart, ...sortedPoints, rangeEnd];

      const segments = [];
      for (let i = 0; i < boundaries.length - 1; i++) {
        const segStart = boundaries[i];
        const segEnd = boundaries[i + 1];
        const result = await this._submitTrimJob({ ...sharedParams, startTime: segStart, endTime: segEnd });
        if (result.status === 'rate_limited') {
          res.set('Retry-After', '1');
          return res.status(429).json({ message: 'Yêu cầu đang được xử lý, vui lòng không gửi dồn dập.', taskId: result.taskId });
        }
        segments.push({ taskId: result.taskId, status: result.status, startTime: segStart, endTime: segEnd });
      }

      return res.status(202).json({
        message: 'Video split processing started in background',
        segments
      });
    }

    // Single-clip mode (unchanged behavior)
    const result = await this._submitTrimJob({ ...sharedParams, startTime: rangeStart, endTime: rangeEnd });
    if (result.status === 'rate_limited') {
      res.set('Retry-After', '1');
      return res.status(429).json({ message: 'Yêu cầu đang được xử lý, vui lòng không gửi dồn dập.', taskId: result.taskId });
    }

    res.status(202).json({
      message: result.status === 'in_progress' ? 'Video processing already in progress or completed' : 'Video processing started in background',
      taskId: result.taskId
    });
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
