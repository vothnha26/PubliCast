const BaseStep = require('../../../../core/pipeline/base.step');
const socialPlatformFactory = require('../../../social/social-platform.factory');
const { SEPARATORS, splitMediaUrls } = require('../../../../utils/constants');

class SocialPublishStep extends BaseStep {
  async execute(context) {
    const { post, platforms, options, brandId } = context;
    context.results = [];

    for (const platform of platforms) {
      try {
        const service = socialPlatformFactory.getService(platform);
        
        let platformPostId = null;
        if (post.platformPostId) {
          try {
            const platformIdMap = JSON.parse(post.platformPostId);
            if (platformIdMap && typeof platformIdMap === 'object') {
              platformPostId = platformIdMap[platform] || null;
            } else {
              platformPostId = platform === 'YOUTUBE' ? post.platformPostId : null;
            }
          } catch (e) {
            platformPostId = platform === 'YOUTUBE' ? post.platformPostId : null;
          }
        }

        console.log(`[SocialPublishStep] 🚀 Publishing post ${post.id} to platform ${platform}...`);

        const result = await service.publishPost(brandId, {
          title: post.title,
          caption: post.caption,
          mediaUrls: splitMediaUrls(post.mediaUrls),
          type: post.type,
          platformPostId: platformPostId,
          options: options
        });
        
        console.log(`[SocialPublishStep] ✅ Successfully published post ${post.id} to platform ${platform}! Result:`, JSON.stringify(result));
        context.results.push({ platform, success: true, result });
      } catch (error) {
        console.error(`[SocialPublishStep] ❌ Failed to publish post ${post.id} to platform ${platform}:`, error);
        context.results.push({ platform, success: false, error: error.message });
        // We continue to other platforms even if one fails
      }
    }
  }
}

module.exports = SocialPublishStep;
