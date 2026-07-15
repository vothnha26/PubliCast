const postService = require('../../services/workspace/post.service');
const postRepository = require('../../repositories/workspace/post.repository');
const { POST_STATUS } = require('../../utils/constants');

class PublishPostHandler {
  async handle(job) {
    // KHÔNG dùng property 'this.xxx' của class. Mọi biến đều khai báo cục bộ!
    const { postId, retryPlatforms, partialRetryCount } = job.data;

    console.log(`[PublishPostHandler] 📝 Processing job ${job.id} for Post: ${postId}`);

    try {
      // 1. Double check post status in DB (Safety check). RETRYING included —
      //    a post left RETRYING by a previous failed attempt is exactly what a
      //    retry job is meant to process.
      const post = await postRepository.findById(postId);
      const validStatuses = [POST_STATUS.SCHEDULED, POST_STATUS.DRAFT, POST_STATUS.RETRYING];
      if (!post || !validStatuses.includes(post.status)) {
        console.log(`[PublishPostHandler] ⏩ Post ${postId} is not in a valid state for publishing. Skipping.`);
        return;
      }

      // 2. Execute the publish pipeline (truyền thêm retryPlatforms/partialRetryCount nếu có)
      await postService.publishToPlatforms(postId, { retryPlatforms, partialRetryCount });
      
      console.log(`[PublishPostHandler] ✅ Successfully processed Post: ${postId}`);
    } catch (err) {
      console.error(`[PublishPostHandler] ❌ Error processing job ${job.id}:`, err.message);
      throw err; // Allow BullMQ to handle retries based on queue config
    }
  }
}

module.exports = new PublishPostHandler();
