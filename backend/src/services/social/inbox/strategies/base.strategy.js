class BaseSyncStrategy {
  /**
   * Check if this strategy supports the given platform
   * @param {string} platform 
   * @returns {boolean}
   */
  supports(platform) {
    throw new Error('Not implemented');
  }

  /**
   * Perform synchronization
   * @param {string} brandId 
   * @param {object} inbox 
   * @returns {Promise<Array>} list of synced items
   */
  async sync(brandId, inbox) {
    throw new Error('Not implemented');
  }

  /**
   * Check if this strategy can handle reply for this item
   * @param {object} item 
   * @returns {boolean}
   */
  supportsReply(item) {
    throw new Error('Not implemented');
  }

  /**
   * Perform reply
   * @param {string} brandId 
   * @param {string} parentPlatformItemId 
   * @param {string} text 
   * @returns {Promise<object>} response
   */
  async reply(brandId, parentPlatformItemId, text) {
    throw new Error('Not implemented');
  }

  async updateReply(brandId, platformItemId, text) {
    throw new Error('Not implemented');
  }

  async deleteReply(brandId, platformItemId) {
    throw new Error('Not implemented');
  }
}

module.exports = BaseSyncStrategy;
