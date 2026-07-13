const postService = require('../../services/workspace/post.service');
const postRepository = require('../../repositories/workspace/post.repository');
const { POST_STATUS } = require('../../utils/constants');

class PublishPostHandler {
  async handle(job) {
    // KHÔNG dùng property 'this.xxx' của class. Mọi biến đều khai báo cục bộ!
    const { postId, retryPlatforms } = job.data;
    
    console.log(`[PublishPostHandler] 📝 Processing job ${job.id} for Post: ${postId}`);
    
    try {
      // 1. Double check post status in DB (Safety check)
      const post = await postRepository.findById(postId);
      if (!post || (post.status !== POST_STATUS.SCHEDULED && post.status !== POST_STATUS.DRAFT)) {
        console.log(`[PublishPostHandler] ⏩ Post ${postId} is not in a valid state for publishing. Skipping.`);
        return;
      }

      // 2. Execute the publish pipeline (truyền thêm retryPlatforms nếu có)
      await postService.publishToPlatforms(postId, { retryPlatforms });
      
      console.log(`[PublishPostHandler] ✅ Successfully processed Post: ${postId}`);
    } catch (err) {
      console.error(`[PublishPostHandler] ❌ Error processing job ${job.id}:`, err.message);
      throw err; // Allow BullMQ to handle retries based on queue config
    }
  }
}

module.exports = new PublishPostHandler();
