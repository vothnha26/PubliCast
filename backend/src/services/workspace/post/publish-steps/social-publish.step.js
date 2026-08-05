const BaseStep = require('../../../../core/pipeline/base.step');
const socialPlatformFactory = require('../../../social/social-platform.factory');
const { SEPARATORS, splitMediaUrls } = require('../../../../utils/constants');
const logger = require('../../../../utils/logger');
const { parsePlatformPostId, getIdForAccount } = require('../platform-post-id.util');

class SocialPublishStep extends BaseStep {
  async execute(context) {
    const { post, platforms, options, brandId, networkOverrides = {}, targetsByPlatform = {} } = context;
    context.results = [];

    // Fan out to every targeted account per platform, not just the first
    // (targetsByPlatform[platform][0]) — a post selecting 3 YouTube channels
    // previously published to only one, silently dropping the other 2 with
    // no error surfaced anywhere. Each (platform, account) pair now gets its
    // own independent publish call and result entry; downstream consumers
    // (UpdatePostStatusStep) already treat `results` as a flat list of
    // pass/fail outcomes, so no change needed there for basic success/fail
    // aggregation.
    const publishTargets = platforms.flatMap((platform) => {
      const accountIds = targetsByPlatform[platform]?.length > 0 ? targetsByPlatform[platform] : [null];
      return accountIds.map((socialAccountId) => ({ platform, socialAccountId }));
    });

    const platformIdMap = parsePlatformPostId(post.platformPostId);

    const publishPromises = publishTargets.map(async ({ platform, socialAccountId }) => {
      try {
        const service = socialPlatformFactory.getService(platform);

        // Per-account lookup (see platform-post-id.util.js) — a legacy
        // per-platform id still matches every account of that platform, so
        // a post published before accountId-scoping existed keeps its
        // "already published, don't re-upload" short-circuit intact.
        const platformPostId = getIdForAccount(platformIdMap, platform, socialAccountId);

        // Per-platform-per-account override (see PostNetworkOverride): only
        // takes effect when the composer's "edit by network" was actually
        // turned on for this platform (useTemplate === false). Otherwise
        // every account shares the post's own caption/mediaUrls, same as
        // before overrides existed.
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

        // Per-account technical settings (YouTube category/privacy/tags,
        // TikTok duet/stitch, etc. — see PostNetworkOverride.settings).
        // Deliberately independent of useOverride/useTemplate: a user can
        // give one account a different category while still sharing the
        // template caption for every account, so this row may carry
        // useTemplate:true (caption not customized) alongside real settings.
        // Merged on top of the post's shared `options` so an account without
        // its own override still gets the post-level defaults, and one
        // account's category/privacy choice can no longer leak into another
        // account of the same platform (previously a single flat
        // options.categoryId applied to every fanned-out account).
        let effectiveSettings = undefined;
        if (override && override.settings) {
          try {
            effectiveSettings = typeof override.settings === 'string'
              ? JSON.parse(override.settings)
              : override.settings;
          } catch (e) {
            effectiveSettings = undefined;
          }
        }

        logger.debug(`[SocialPublishStep] 🚀 Publishing post ${post.id} to platform ${platform} (account: ${socialAccountId || 'default'})...`);

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
            ...(effectiveSettings || {}),
            ...(effectiveThreadPosts ? { threadPosts: effectiveThreadPosts } : {}),
          }
        });

        logger.debug(`[SocialPublishStep] ✅ Successfully published post ${post.id} to platform ${platform} (account: ${socialAccountId || 'default'})! Result:`, JSON.stringify(result));
        return { platform, socialAccountId, success: true, result };
      } catch (error) {
        console.error(`[SocialPublishStep] ❌ Failed to publish post ${post.id} to platform ${platform} (account: ${socialAccountId || 'default'}):`, error);
        return { platform, socialAccountId, success: false, error: error.message };
      }
    });

    context.results = await Promise.all(publishPromises);
  }
}

module.exports = SocialPublishStep;
