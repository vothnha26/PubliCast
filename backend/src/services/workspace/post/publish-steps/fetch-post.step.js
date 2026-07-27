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
