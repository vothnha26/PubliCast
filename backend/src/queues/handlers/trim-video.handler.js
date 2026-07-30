const videoProcessorFacade = require('../../services/workspace/video/video-processor.facade');
const socketManager = require('../../services/workspace/socket/socket.manager');
const redisClient = require('../../config/redis');
const { TASK_STATUS, SOCKET_EVENTS, REDIS_PREFIXES } = require('../../constants/video-publish.constants');
const { FFMPEG_DEFAULTS } = require('../../constants/video-editor.constants');

class TrimVideoHandler {
  async handle(job) {
    // KHÔNG dùng property 'this.xxx' của class. Mọi biến đều khai báo cục bộ!
    const {
      videoUrl,
      startTime,
      endTime,
      aspectRatio,
      keyframes,
      adjustments,
      filterPreset,
      resize,
      keepAudio,
      audioUrl,
      audioVolume,
      textOverlays,
      subtitles,
      brandId,
      userId
    } = job.data;
    const taskId = job.id;

    console.log(`[TrimVideoHandler] 🎬 Processing job ${taskId} for User ${userId}`);

    try {
      const trimmedUrl = await videoProcessorFacade.processVideo({
        videoUrl,
        startTime: parseFloat(startTime),
        endTime: parseFloat(endTime),
        aspectRatio,
        keyframes: Array.isArray(keyframes) ? keyframes : [],
        adjustments: adjustments && typeof adjustments === 'object' ? adjustments : undefined,
        filterPreset: filterPreset || undefined,
        resize: resize && typeof resize === 'object' ? resize : undefined,
        keepAudio: keepAudio !== undefined ? Boolean(keepAudio) : true,
        audioUrl,
        audioVolume: audioVolume !== undefined ? parseInt(audioVolume) : FFMPEG_DEFAULTS.DEFAULT_AUDIO_VOLUME,
        textOverlays: Array.isArray(textOverlays) ? textOverlays : [],
        subtitles: Array.isArray(subtitles) ? subtitles : [],
        brandId
      });

      const taskKey = `${REDIS_PREFIXES.TASK_VIDEO_TRIM}${taskId}`;

      // 1. Cập nhật trạng thái thành công vào Redis (TTL 24 giờ)
      await redisClient.set(
        taskKey,
        JSON.stringify({
          status: TASK_STATUS.SUCCESS,
          userId,
          videoUrl: trimmedUrl,
          completedAt: Date.now()
        }),
        { EX: 86400 }
      );

      // 2. Broadcast tin nhắn socket đến phòng của user (user_room_{userId})
      socketManager.emitToUser(userId, SOCKET_EVENTS.VIDEO_SUCCESS, {
        taskId,
        originalVideoUrl: videoUrl,
        videoUrl: trimmedUrl,
        aspectRatio,
        keyframes
      });

      console.log(`[TrimVideoHandler] ✅ Successfully processed Video for Job ${taskId}`);
      return { videoUrl: trimmedUrl };
    } catch (err) {
      console.error(`[TrimVideoHandler] ❌ Error processing job ${taskId}:`, err.message);
      throw err; // Ném lỗi để BullMQ kích hoạt cơ chế retry/backoff
    }
  }
}

module.exports = new TrimVideoHandler();
