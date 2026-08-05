const BaseStep = require('../../../../core/pipeline/base.step');
const socialPlatformFactory = require('../../../social/social-platform.factory');
const { SEPARATORS, splitMediaUrls } = require('../../../../utils/constants');
const logger = require('../../../../utils/logger');

class SocialPublishStep extends BaseStep {
  async execute(context) {
    const { post, platforms, options, brandId, networkOverrides = {}, targetsByPlatform = {} } = context;
    context.results = [];

    const publishPromises = platforms.map(async (platform) => {
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

        // Account to publish to: the first PostTarget row for this platform
        // (see PostTarget in schema.prisma) — the source of truth for
        // targeting. NOTE: a post may target multiple accounts of the same
        // platform, but this step still only publishes to one per platform;
        // true multi-account fan-out (independent publish/retry per account)
        // is tracked as separate follow-up work.
        const socialAccountId = targetsByPlatform[platform]?.[0] || null;

        // Per-platform override (see PostNetworkOverride): only takes effect
        // when the composer's "edit by network" was actually turned on for
        // this platform (useTemplate === false). Otherwise every platform
        // shares the post's own caption/mediaUrls, same as before overrides
        // existed.
        const override = networkOverrides[`${platform}:${socialAccountId || 'null'}`];
        const useOverride = override && override.useTemplate === false;
        const effectiveCaption = useOverride && override.caption != null ? override.caption : post.caption;
        const effectiveMediaUrls = useOverride && override.mediaUrls
          ? splitMediaUrls(override.mediaUrls)
          : splitMediaUrls(post.mediaUrls);

        let effectiveThreadPosts = undefined;
        if (useOverride && override.threadPosts) {
          try {
            effectiveThreadPosts = typeof override.threadPosts === 'string'
              ? JSON.parse(override.threadPosts)
              : override.threadPosts;
          } catch (e) {
            effectiveThreadPosts = override.threadPosts;
          }
        }

        logger.debug(`[SocialPublishStep] 🚀 Publishing post ${post.id} to platform ${platform}...`);

        const result = await service.publishPost(brandId, {
          title: post.title,
          caption: effectiveCaption,
          mediaUrls: effectiveMediaUrls,
          type: post.type,
          platformPostId: platformPostId,
          socialAccountId,
          scheduledAt: post.scheduledAt,
          options: {
            ...options,
            ...(effectiveThreadPosts ? { threadPosts: effectiveThreadPosts } : {}),
          }
        });
        
        logger.debug(`[SocialPublishStep] ✅ Successfully published post ${post.id} to platform ${platform}! Result:`, JSON.stringify(result));
        return { platform, success: true, result };
      } catch (error) {
        console.error(`[SocialPublishStep] ❌ Failed to publish post ${post.id} to platform ${platform}:`, error);
        return { platform, success: false, error: error.message };
      }
    });

    context.results = await Promise.all(publishPromises);
  }
}

module.exports = SocialPublishStep;
