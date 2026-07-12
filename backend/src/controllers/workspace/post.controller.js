const postService = require('../../services/workspace/post.service');
const asyncHandler = require('../../utils/async-handler');
const videoProcessorFacade = require('../../services/workspace/video/video-processor.facade');
const TranscriptionStrategyFactory = require('../../services/workspace/ai/transcription/transcription-strategy.factory');

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
    const prisma = require('../../config/prisma');
    const limits = await prisma.platformLimit.findMany();
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
   */
  uploadVideo = asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No video file uploaded' });
    }
    const isLocal = process.env.UPLOAD_STORAGE === 'local';
    let videoUrl = req.file.path;
    if (isLocal) {
      const path = require('path');
      const relativePath = path.relative(process.cwd(), req.file.path).replace(/\\/g, '/');
      videoUrl = `/${relativePath}`;
      console.log(`[Upload] Local storage: absolute="${req.file.path}" → relative="${videoUrl}"`);
    } else {
      console.log(`[Upload] Cloudinary: url="${videoUrl}"`);
    }
    res.status(200).json({ message: 'Video uploaded successfully', videoUrl });
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
    const { videoUrl, startTime, endTime, aspectRatio, keyframes, audioUrl, audioVolume, brandId } = req.body;
    if (!videoUrl) return res.status(400).json({ message: 'videoUrl is required' });
    if (startTime === undefined || endTime === undefined) {
      return res.status(400).json({ message: 'startTime and endTime are required' });
    }

    const trimmedUrl = await videoProcessorFacade.processVideo({
      videoUrl,
      startTime: parseFloat(startTime),
      endTime: parseFloat(endTime),
      aspectRatio,
      keyframes: Array.isArray(keyframes) ? keyframes : [],
      audioUrl,
      audioVolume: audioVolume !== undefined ? parseInt(audioVolume) : 50,
      brandId
    });

    res.status(200).json({
      message: 'Video trimmed successfully',
      videoUrl: trimmedUrl
    });
  });

  /**
   * POST /api/posts/transcribe
   */
  transcribeVideo = asyncHandler(async (req, res) => {
    const { videoUrl, brandId } = req.body;
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
