class TelegramPublishStrategy {
  /**
   * Thực hiện logic đăng bài lên Telegram
   * @param {string} chatId 
   * @param {string} botToken 
   * @param {Object} postData 
   */
  async publish(chatId, botToken, postData) {
    throw new Error('Method publish() must be implemented');
  }
}

module.exports = TelegramPublishStrategy;
