class BaseTrendingStrategy {
  /**
   * Lấy danh sách hashtag đang trending
   * @param {number} limit - Số lượng hashtag tối đa cần lấy
   * @returns {Promise<Array<{hashtag: string, postsCount: number, reach: number, growthRate: number}>>}
   */
  async fetchTrending(limit) {
    throw new Error('Method "fetchTrending" must be implemented');
  }
}

module.exports = BaseTrendingStrategy;
