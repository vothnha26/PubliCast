const prisma = require('../../config/prisma');
const redisClient = require('../../config/redis');
const youtubePublishService = require('../social/youtube/youtube-publish.service');
const authorizationFacade = require('../auth/authorization.facade');

/**
 * Creates a new Highlight Task in the database and pushes it to Redis
 */
const createHighlightTask = async (youtubeUrl, brandId) => {
  const highlight = await prisma.livestreamHighlight.create({
    data: {
      youtubeUrl,
      brandId,
      status: 'pending',
      progress: 0,
      progressMsg: 'Khởi tạo task...'
    }
  });

  const taskData = {
    task_id: highlight.id,
    video_url: youtubeUrl
  };
  
  await redisClient.lPush('highlight_tasks', JSON.stringify(taskData));

  return highlight;
};

/**
 * Gets the current status of a Highlight task (including progress from Redis)
 * @param {string} id
 * @param {string} userId - required to verify the caller belongs to the
 *   highlight's own brand (see issue #51); the route only carries the
 *   highlight id, so ownership must be checked here.
 */
const getHighlightStatus = async (id, userId) => {
  const highlight = await prisma.livestreamHighlight.findUnique({
    where: { id }
  });

  if (!highlight) {
    throw new Error('Highlight task not found');
  }

  const hasAccess = await authorizationFacade.checkBrandAccess(userId, highlight.brandId);
  if (!hasAccess) {
    const error = new Error('Bạn không có quyền truy cập highlight này.');
    error.status = 403;
    throw error;
  }

  if (highlight.status === 'pending' || highlight.status === 'processing') {
    const redisProgressData = await redisClient.hGet('task_status', id);
    if (redisProgressData) {
      try {
        const parsed = JSON.parse(redisProgressData);
        highlight.progress = parsed.percent || highlight.progress;
        highlight.progressMsg = parsed.message || highlight.progressMsg;
      } catch (err) {
        // ignore JSON parse error
      }
    }
  }

  return highlight;
};

/**
 * Updates the highlight record (called by Python Worker when finished)
 */
const updateHighlightStatus = async (id, data) => {
  const updatePayload = {
    status: 'completed',
    progress: 100,
    progressMsg: 'Hoàn tất!'
  };

  if (data.videoUrl) updatePayload.videoUrl = data.videoUrl;
  if (data.subtitleUrl) updatePayload.subtitleUrl = data.subtitleUrl;
  if (data.duration) updatePayload.duration = data.duration;

  const highlight = await prisma.livestreamHighlight.update({
    where: { id },
    data: updatePayload
  });

  await redisClient.hDel('task_status', id);

  return highlight;
};

/**
 * Publishes a completed highlight video to YouTube Shorts
 * @param {string} highlightId
 * @param {string} brandId
 * @param {string} title
 * @param {string} description
 * @param {string} userId - required to verify the caller belongs to brandId
 *   AND that brandId actually matches the highlight's own brand (see issue
 *   #51) — otherwise a caller could pass their own (authorized) brandId
 *   alongside another brand's highlightId and publish it under the wrong
 *   YouTube account.
 */
const publishToYouTube = async (highlightId, brandId, title, description, userId) => {
  const highlight = await prisma.livestreamHighlight.findUnique({
    where: { id: highlightId }
  });

  if (!highlight) throw new Error('Highlight không tồn tại');
  if (!highlight.videoUrl) throw new Error('Video chưa sẵn sàng để đăng');

  if (highlight.brandId !== brandId) {
    const error = new Error('Highlight không thuộc thương hiệu này.');
    error.status = 403;
    throw error;
  }

  const hasAccess = await authorizationFacade.checkBrandAccess(userId, brandId);
  if (!hasAccess) {
    const error = new Error('Bạn không có quyền truy cập thương hiệu này.');
    error.status = 403;
    throw error;
  }

  const result = await youtubePublishService.publishPost(brandId, {
    title: title || 'Highlight',
    caption: description || '#Shorts',
    mediaUrls: [highlight.videoUrl],
    options: {
      youtubeType: 'short',
      privacyStatus: 'public',
    }
  });

  // Lưu youtube video id vào DB
  await prisma.livestreamHighlight.update({
    where: { id: highlightId },
    data: { youtubeVideoId: result.platformVideoId }
  });

  return result;
};

module.exports = {
  createHighlightTask,
  getHighlightStatus,
  updateHighlightStatus,
  publishToYouTube
};
