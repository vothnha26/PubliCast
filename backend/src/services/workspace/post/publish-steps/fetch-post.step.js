const BaseStep = require('../../../../core/pipeline/base.step');
const postRepository = require('../../../../repositories/workspace/post.repository');
const { SEPARATORS } = require('../../../../utils/constants');

class FetchPostStep extends BaseStep {
  async execute(context) {
    const { postId } = context;
    const post = await postRepository.findById(postId);
    if (!post) throw new Error(`Post ${postId} not found`);
    
    context.post = post;
    context.brandId = post.brandId;
    let platforms = post.targetPlatforms ? post.targetPlatforms.split(SEPARATORS.COMMA).map(p => p.trim()) : [];

    // Which SocialAccount(s) each platform targets — the source of truth is
    // PostTarget (see schema.prisma), not networkOverrides (content-only).
    // A platform with no PostTarget rows (posts created before this table
    // existed) falls back to a single implicit account (socialAccountId:
    // null), same as previous behavior.
    let targetsByPlatform = {};
    if (Array.isArray(post.targets)) {
      for (const target of post.targets) {
        if (!targetsByPlatform[target.platform]) {
          targetsByPlatform[target.platform] = [];
        }
        targetsByPlatform[target.platform].push(target.socialAccountId);
      }
    }

    // retryTargets ({platform, socialAccountId}[]) scopes a retry down to
    // specific (platform, account) pairs — without this, retrying a post
    // where 2 of 3 YouTube accounts already succeeded would re-fan-out to
    // all 3 again, re-publishing to the 2 that already have a platformPostId
    // (which YouTube's own short-circuit catches, but other platforms may
    // not — better to never re-attempt an account this round didn't fail).
    // retryPlatforms (legacy, platform-only) is still honored for any job
    // already sitting in the BullMQ queue at deploy time with the old shape.
    const retryTargets = context.postDataOptions?.retryTargets;
    const retryPlatforms = context.postDataOptions?.retryPlatforms;
    if (Array.isArray(retryTargets) && retryTargets.length > 0) {
      const retryPlatformSet = new Set(retryTargets.map(t => t.platform.toUpperCase()));
      platforms = platforms.filter(p => retryPlatformSet.has(p.toUpperCase()));

      const scopedTargetsByPlatform = {};
      for (const { platform, socialAccountId } of retryTargets) {
        const key = platform.toUpperCase();
        if (!scopedTargetsByPlatform[key]) scopedTargetsByPlatform[key] = [];
        scopedTargetsByPlatform[key].push(socialAccountId || null);
      }
      targetsByPlatform = scopedTargetsByPlatform;
    } else if (Array.isArray(retryPlatforms) && retryPlatforms.length > 0) {
      const retryList = retryPlatforms.map(p => p.trim().toUpperCase());
      platforms = platforms.filter(p => retryList.includes(p.toUpperCase()));
      // No per-account scoping info in the legacy shape — falls back to
      // retrying every account of the retried platform, same as previous
      // behavior before targetsByPlatform existed.
    }

    context.platforms = platforms;
    context.targetsByPlatform = targetsByPlatform;

    // Map override rows by "platform:socialAccountId" (socialAccountId
    // normalized to the string 'null' when absent) so SocialPublishStep can
    // do an O(1) lookup per (platform, account) pair instead of scanning the
    // array on every iteration.
    context.networkOverrides = {};
    if (Array.isArray(post.networkOverrides)) {
      for (const override of post.networkOverrides) {
        const key = `${override.platform}:${override.socialAccountId || 'null'}`;
        context.networkOverrides[key] = override;
      }
    }

    // Parse options from metadata stored in DB
    let parsedMetadata = {};
    if (post.metadata) {
      try {
        parsedMetadata = JSON.parse(post.metadata);
      } catch (e) {
        console.error('Failed to parse options in FetchPostStep:', e.message);
      }
    }
    // Merge: postDataOptions (như retryPlatforms) đè lên parsedMetadata
    context.options = { ...parsedMetadata, ...(context.postDataOptions || {}) };
  }
}

module.exports = FetchPostStep;
