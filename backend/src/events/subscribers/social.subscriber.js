const { eventEmitter, EVENTS } = require('../event-emitter');
const { socialQueue } = require('../../queues/social.queue');
const { QUEUE_CONFIG } = require('../../constants/video-publish.constants');

/**
 * Register social subscriber listeners
 */
function initSocialSubscriber() {
  eventEmitter.on(EVENTS.SOCIAL.CONNECTED, async ({ brandId, platform, socialAccount }) => {
    console.log(`[Social Subscriber] Received ${EVENTS.SOCIAL.CONNECTED} event for brandId: ${brandId}, platform: ${platform}, accountId: ${socialAccount.id}`);
    
    try {
      // Đẩy job đồng bộ dữ liệu chi tiết ngầm vào hàng đợi BullMQ
      await socialQueue.add(
        QUEUE_CONFIG.SOCIAL.JOB_SYNC,
        {
          socialAccountId: socialAccount.id,
          platform: socialAccount.platform,
          brandId: socialAccount.brandId
        }
      );
      
      console.log(`[Social Subscriber] Successfully enqueued sync job for account: ${socialAccount.id}`);
    } catch (error) {
      // An toàn logs: TUYỆT ĐỐI không in object chứa token
      console.error(`[Social Subscriber] Failed to enqueue sync job for account: ${socialAccount.id}. Error: ${error.message}`);
    }
  });
  
  console.log('[Social Subscriber] Listeners registered.');
}

module.exports = {
  initSocialSubscriber
};
