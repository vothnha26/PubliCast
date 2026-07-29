const postService = require('../../services/workspace/post.service');
const asyncHandler = require('../../utils/async-handler');
const { sendSuccess } = require('../../utils/response.util');

/**
 * v2 of POST /api/posts/upload and GET /api/posts/platform-limits — same
 * postService logic as v1 (postController.uploadVideo / getPlatformLimits),
 * just the {message, data} response envelope instead of v1's shapes.
 */
class PostControllerV2 {
  uploadVideoV2 = asyncHandler(async (req, res) => {
    const { videoUrl, sizeMb, duration, format } = await postService.processUploadedFile(req);
    sendSuccess(res, { videoUrl, sizeMb, duration, format }, 'Video uploaded successfully');
  });

  getPlatformLimitsV2 = asyncHandler(async (req, res) => {
    const limits = await postService.getPlatformLimits();
    sendSuccess(res, limits, 'Platform limits retrieved successfully');
  });
}

module.exports = new PostControllerV2();
