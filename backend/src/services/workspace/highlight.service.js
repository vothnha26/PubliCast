const prisma = require('../../config/prisma');
const redisClient = require('../../config/redis');
const youtubePublishService = require('../social/youtube/youtube-publish.service');

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
 */
const getHighlightStatus = async (id) => {
  const highlight = await prisma.livestreamHighlight.findUnique({
    where: { id }
  });
  
  if (!highlight) {
    throw new Error('Highlight task not found');
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
 */
const publishToYouTube = async (highlightId, brandId, title, description) => {
  const highlight = await prisma.livestreamHighlight.findUnique({
    where: { id: highlightId }
  });

  if (!highlight) throw new Error('Highlight không tồn tại');
  if (!highlight.videoUrl) throw new Error('Video chưa sẵn sàng để đăng');

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
