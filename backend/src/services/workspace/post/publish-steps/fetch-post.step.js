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
    if (context.postDataOptions && Array.isArray(context.postDataOptions.retryPlatforms)) {
      const retryList = context.postDataOptions.retryPlatforms.map(p => p.trim().toUpperCase());
      platforms = platforms.filter(p => retryList.includes(p.toUpperCase()));
    }
    context.platforms = platforms;

    // Which SocialAccount(s) each platform targets — the source of truth is
    // PostTarget (see schema.prisma), not networkOverrides (content-only).
    // A platform with no PostTarget rows (posts created before this table
    // existed) falls back to a single implicit account (socialAccountId:
    // null), same as previous behavior.
    context.targetsByPlatform = {};
    if (Array.isArray(post.targets)) {
      for (const target of post.targets) {
        if (!context.targetsByPlatform[target.platform]) {
          context.targetsByPlatform[target.platform] = [];
        }
        context.targetsByPlatform[target.platform].push(target.socialAccountId);
      }
    }

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
