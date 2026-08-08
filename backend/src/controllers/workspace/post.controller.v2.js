const postService = require('../../services/workspace/post.service');
const asyncHandler = require('../../utils/async-handler');
const { sendSuccess } = require('../../utils/response.util');

/**
 * v2 of POST /api/posts/upload, GET /api/posts/platform-limits, and
 * POST /api/posts — same postService logic as v1 (postController.uploadVideo
 * / getPlatformLimits / createPost), just the {message, data} response
 * envelope instead of v1's shapes. createPostV2 additionally accepts
 * req.body.networkOverrides (see PostNetworkOverride) — v1's createPost
 * ignores that field entirely, so v1 callers are unaffected.
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
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });

    const userId = req.user.id;
    const post = await postService.createPost(req.body, userId, brandId);
    sendSuccess(res, post, 'Post created successfully', 201);
  });
}

module.exports = new PostControllerV2();
