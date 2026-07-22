const postService = require('../../services/workspace/post.service');
const postRepository = require('../../repositories/workspace/post.repository');
const { POST_STATUS } = require('../../utils/constants');

class PublishPostHandler {
  async handle(job) {
    // KHÔNG dùng property 'this.xxx' của class. Mọi biến đều khai báo cục bộ!
    const { postId, retryPlatforms, partialRetryCount } = job.data;

    console.log(`[PublishPostHandler] 📝 Processing job ${job.id} for Post: ${postId}`);

    try {
      // 1. Atomically claim the post (status -> PUBLISHING) before doing any
      // publish work. This is a compare-and-swap, not just a read-then-act
      // check: BullMQ's jobId dedup only prevents duplicate jobs from sitting
      // in the queue together, but remove() can't cancel a job that's already
      // active — so a manual retry landing while a scheduled job is mid-flight
      // previously found the post still SCHEDULED/RETRYING and started a
      // second concurrent publish. Only the handler that wins this claim
      // proceeds; a loser skips instead of double-publishing (#54).
      const validStatuses = [POST_STATUS.SCHEDULED, POST_STATUS.DRAFT, POST_STATUS.RETRYING];
      const claimed = await postRepository.claimForPublishing(postId, validStatuses);
      if (!claimed) {
        console.log(`[PublishPostHandler] ⏩ Post ${postId} is not in a valid state for publishing (or already being published). Skipping.`);
        return;
      }

      // 2. Execute the publish pipeline (truyền thêm retryPlatforms/partialRetryCount nếu có)
      await postService.publishToPlatforms(postId, { retryPlatforms, partialRetryCount });
      
      console.log(`[PublishPostHandler] ✅ Successfully processed Post: ${postId}`);
    } catch (err) {
      console.error(`[PublishPostHandler] ❌ Error processing job ${job.id}:`, err.message);

      // Safety net: PublishFailedError (all platforms failed) already moves
      // the post to RETRYING inside UpdatePostStatusStep before throwing, so
      // this is a no-op for that path. But an unexpected failure earlier in
      // the pipeline (e.g. FetchPostStep throwing "Post not found", or a bug
      // before UpdatePostStatusStep runs) would otherwise leave the post
      // stuck at PUBLISHING forever with no path back to a retryable state —
      // only revert if it's still exactly where the claim left it.
      try {
        await postRepository.updateMany(
          { id: postId, status: POST_STATUS.PUBLISHING },
          { status: POST_STATUS.RETRYING }
        );
      } catch (resetErr) {
        console.error(`[PublishPostHandler] Failed to reset stuck PUBLISHING status for ${postId}:`, resetErr.message);
      }

      throw err; // Allow BullMQ to handle retries based on queue config
    }
  }
}

module.exports = new PublishPostHandler();
