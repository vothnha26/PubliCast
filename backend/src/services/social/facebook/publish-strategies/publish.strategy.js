class FacebookPublishStrategy {
  /**
   * Execute the publish logic
   * @param {string} pageId 
   * @param {string} pageAccessToken 
   * @param {Object} postData 
   */
  async publish(pageId, pageAccessToken, postData) {
    throw new Error('Method publish() must be implemented');
  }
}

module.exports = FacebookPublishStrategy;
