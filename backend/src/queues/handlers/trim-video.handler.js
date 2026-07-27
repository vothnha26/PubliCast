const videoProcessorFacade = require('../../services/workspace/video/video-processor.facade');
const socketManager = require('../../services/workspace/socket/socket.manager');
const redisClient = require('../../config/redis');
const { TASK_STATUS, SOCKET_EVENTS, REDIS_PREFIXES } = require('../../constants/video-publish.constants');

class TrimVideoHandler {
  async handle(job) {
    // KHÔNG dùng property 'this.xxx' của class. Mọi biến đều khai báo cục bộ!
    const { videoUrl, startTime, endTime, aspectRatio, keyframes, audioUrl, audioVolume, textOverlays, subtitles, brandId, userId } = job.data;
    const taskId = job.id;
    
    console.log(`[TrimVideoHandler] 🎬 Processing job ${taskId} for User ${userId}`);
    
    try {
      const trimmedUrl = await videoProcessorFacade.processVideo({
        videoUrl,
        startTime: parseFloat(startTime),
        endTime: parseFloat(endTime),
        aspectRatio,
        keyframes: Array.isArray(keyframes) ? keyframes : [],
        audioUrl,
        audioVolume: audioVolume !== undefined ? parseInt(audioVolume) : 50,
        textOverlays: Array.isArray(textOverlays) ? textOverlays : [],
        subtitles: Array.isArray(subtitles) ? subtitles : [],
        brandId
      });
      
      const taskKey = `${REDIS_PREFIXES.TASK_VIDEO_TRIM}${taskId}`;

      // 1. Cập nhật trạng thái thành công vào Redis (TTL 24 giờ)
      await redisClient.set(taskKey, JSON.stringify({
        status: TASK_STATUS.SUCCESS,
        userId,
        videoUrl: trimmedUrl,
        completedAt: Date.now()
      }), { EX: 86400 });

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
      // Terminal-attempt handling (marking the task FAILED in Redis + notifying
      // the user) moved to video.worker.js's 'failed' listener — job.attemptsMade
      // read here runs BEFORE BullMQ finalizes the attempt count for this job,
      // making the in-handler check racy vs. the worker's own bookkeeping. Only
      // the Worker's 'failed' event is guaranteed to fire once per attempt with
      // the final, authoritative count. Matches the publish.worker.js convention.
      throw err; // Ném lỗi để BullMQ kích hoạt cơ chế retry/backoff
    }
  }
}

module.exports = new TrimVideoHandler();
