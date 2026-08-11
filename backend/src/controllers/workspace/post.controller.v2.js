const postService = require('../../services/workspace/post.service');
const asyncHandler = require('../../utils/async-handler');
const videoProcessorFacade = require('../../services/workspace/video/video-processor.facade');
const TranscriptionStrategyFactory = require('../../services/workspace/ai/transcription/transcription-strategy.factory');
const { v2Success: sendSuccess, v2Error: sendError } = require('../../utils/response.helper');
const { submitTrimJob, getBulkIds } = require('./post.controller');

/**
 * v2 of POST /api/posts/upload, GET /api/posts/platform-limits, and
 * POST /api/posts — same postService logic as v1 (postController.uploadVideo
 * / getPlatformLimits / createPost), just the {message, data} response
 * envelope instead of v1's shapes. createPostV2 additionally accepts
 * req.body.networkOverrides (see PostNetworkOverride) — v1's createPost
 * ignores that field entirely, so v1 callers are unaffected.
 *
 * getPosts keeps v1's flat {message, data, meta} shape (not nested under
 * data) — same reasoning as admin's audit-log endpoint: apiV2's pagination
 * unwrap depends on top-level meta. trimVideo/getTrimStatus/transcribeVideo
 * also keep v1's custom top-level shapes (taskId/segments/subtitles at the
 * top level, not under data) since those are polled/read directly by the
 * frontend's video editor. submitTrimJob and getBulkIds are shared with v1
 * (imported from post.controller.js) rather than duplicated.
 */
class PostControllerV2 {
  uploadVideoV2 = asyncHandler(async (req, res) => {
    const { videoUrl, sizeMb, duration, format, width, height, frameRate, codec } = await postService.processUploadedFile(req);
    sendSuccess(res, { videoUrl, sizeMb, duration, format, width, height, frameRate, codec }, 'Video uploaded successfully');
  });

  getPlatformLimitsV2 = asyncHandler(async (req, res) => {
    const limits = await postService.getPlatformLimits();
    sendSuccess(res, limits, 'Platform limits retrieved successfully');
  });

  getPlatformCapabilitiesV2 = asyncHandler(async (req, res) => {
    const { resolveAllCapabilities } = require('../../services/workspace/post/capability-resolver.service');
    const capabilities = await resolveAllCapabilities();
    sendSuccess(res, capabilities, 'Platform capabilities retrieved successfully');
  });

  createPostV2 = asyncHandler(async (req, res) => {
    const { brandId } = req.body;
    if (!brandId) return sendError(res, 'brandId is required', 400);

    const userId = req.user.id;
    const post = await postService.createPost(req.body, userId, brandId);
    sendSuccess(res, post, 'Post created successfully', 201);
  });

  getPosts = asyncHandler(async (req, res) => {
    const brandId = req.query.brandId;
    if (!brandId) return sendError(res, 'brandId is required', 400);

    const result = await postService.getPosts(req.query, brandId, req.user.id);

    res.status(200).json({
      message: 'Posts retrieved successfully',
      ...result
    });
  });

  updatePost = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { brandId } = req.body;
    if (!brandId) return sendError(res, 'brandId is required', 400);

    const post = await postService.updatePost(id, req.body, brandId, req.user.id);
    sendSuccess(res, post, 'Post updated successfully');
  });

  bulkApprove = asyncHandler(async (req, res) => {
    const { brandId } = req.body;
    if (!brandId) return sendError(res, 'brandId is required', 400);

    const targetIds = getBulkIds(req.body);
    if (!targetIds) return sendError(res, 'ids array is required', 400);

    const count = await postService.bulkApprove(targetIds, brandId);
    res.status(200).json({ message: 'Posts approved successfully', count });
  });

  bulkDelete = asyncHandler(async (req, res) => {
    const { brandId, deleteFromSocials } = req.body;
    if (!brandId) return sendError(res, 'brandId is required', 400);

    const targetIds = getBulkIds(req.body);
    if (!targetIds) return sendError(res, 'ids array is required', 400);

    const count = await postService.bulkDelete(targetIds, brandId, deleteFromSocials === true || deleteFromSocials === 'true');
    res.status(200).json({ message: 'Posts deleted successfully', count });
  });

  bulkRestore = asyncHandler(async (req, res) => {
    const { brandId } = req.body;
    if (!brandId) return sendError(res, 'brandId is required', 400);

    const targetIds = getBulkIds(req.body);
    if (!targetIds) return sendError(res, 'ids array is required', 400);

    const count = await postService.bulkRestore(targetIds, brandId);
    res.status(200).json({ message: 'Posts restored successfully', count });
  });

  emptyTrash = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    if (!brandId) return sendError(res, 'brandId is required', 400);

    const count = await postService.emptyTrash(brandId);
    res.status(200).json({ message: 'Trash emptied successfully', count });
  });

  // Keeps v1's custom { message, taskId } / { message, segments } shape —
  // the video editor frontend polls taskId/segments directly, not via a
  // data-wrapped envelope. See submitTrimJob in post.controller.js.
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
    if (!videoUrl) return sendError(res, 'videoUrl is required', 400);
    if (startTime === undefined || endTime === undefined) {
      return sendError(res, 'startTime and endTime are required', 400);
    }

    const rangeStart = parseFloat(startTime);
    const rangeEnd = parseFloat(endTime);

    const isAudioKept = saveAudio !== undefined ? Boolean(saveAudio) : keepAudio !== undefined ? Boolean(keepAudio) : muteAudio !== undefined ? !muteAudio : true;
    const userId = req.user.id;

    const sharedParams = {
      userId, videoUrl, aspectRatio, keyframes, adjustments, filterPreset,
      resize, keepAudio: isAudioKept, audioUrl, audioVolume, textOverlays,
      subtitles, brandId
    };

    if (Array.isArray(splitPoints) && splitPoints.length > 0) {
      const points = splitPoints.map((p) => parseFloat(p)).filter((p) => Number.isFinite(p));
      const invalid = points.some((p) => p <= rangeStart || p >= rangeEnd);
      if (invalid || points.length !== splitPoints.length) {
        return sendError(res, 'splitPoints must be finite numbers strictly between startTime and endTime.', 400);
      }
      const sortedPoints = [...new Set(points)].sort((a, b) => a - b);
      const boundaries = [rangeStart, ...sortedPoints, rangeEnd];

      const segments = [];
      for (let i = 0; i < boundaries.length - 1; i++) {
        const segStart = boundaries[i];
        const segEnd = boundaries[i + 1];
        const result = await submitTrimJob({ ...sharedParams, startTime: segStart, endTime: segEnd });
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

    const result = await submitTrimJob({ ...sharedParams, startTime: rangeStart, endTime: rangeEnd });
    if (result.status === 'rate_limited') {
      res.set('Retry-After', '1');
      return res.status(429).json({ message: 'Yêu cầu đang được xử lý, vui lòng không gửi dồn dập.', taskId: result.taskId });
    }

    res.status(202).json({
      message: result.status === 'in_progress' ? 'Video processing already in progress or completed' : 'Video processing started in background',
      taskId: result.taskId
    });
  });

  getTrimStatus = asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const userId = req.user.id;
    const { TASK_STATUS: _unused, REDIS_PREFIXES } = require('../../constants/video-publish.constants');
    const redisClient = require('../../config/redis');

    const taskKey = `${REDIS_PREFIXES.TASK_VIDEO_TRIM}${taskId}`;
    const taskData = await redisClient.get(taskKey);
    if (!taskData) {
      return sendError(res, 'Task not found or expired', 404);
    }

    const task = JSON.parse(taskData);
    if (task.userId !== userId) {
      return sendError(res, 'Access denied: You do not own this task.', 403);
    }

    res.status(200).json(task);
  });

  retryFailedPlatforms = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const brandId = req.brandId || req.body.brandId || req.headers['x-brand-id'];
    const { platforms } = req.body;
    if (!brandId) return sendError(res, 'brandId is required', 400);
    if (!platforms || !Array.isArray(platforms)) return sendError(res, 'platforms array is required', 400);

    const result = await postService.retryFailedPlatforms(id, platforms, brandId, req.user.id);
    res.status(200).json({
      message: 'Đã xếp hàng gửi lại bài viết thành công.',
      platforms: result.platforms
    });
  });

  transcribeVideo = asyncHandler(async (req, res) => {
    const { videoUrl } = req.body;
    if (!videoUrl) return sendError(res, 'videoUrl is required', 400);

    const fs = require('fs');
    const path = require('path');
    const tempDir = path.join(process.cwd(), 'uploads', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const localPath = path.join(tempDir, `transcribe-${Date.now()}.mp4`);

    try {
      await videoProcessorFacade._resolveFile(videoUrl, localPath);

      const strategy = TranscriptionStrategyFactory.getStrategy();
      const subtitles = await strategy.transcribe(localPath, 'video/mp4');

      res.status(200).json({
        message: 'Video speech transcribed successfully',
        subtitles
      });
    } finally {
      if (fs.existsSync(localPath)) {
        try {
          fs.unlinkSync(localPath);
        } catch (err) {
          console.warn(`Failed to delete temp transcribe file: ${err.message}`);
        }
      }
    }
  });

  getMusicTracks = asyncHandler(async (req, res) => {
    const { mood } = req.query;

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
    sendSuccess(res, tracks, 'Music tracks retrieved successfully');
  });
}

module.exports = new PostControllerV2();
