const TelegramPublishStrategy = require('./publish.strategy');
const telegramGateway = require('../telegram.gateway');

class VideoPublishStrategy extends TelegramPublishStrategy {
  async publish(chatId, botToken, postData) {
    return telegramGateway.sendVideo(botToken, chatId, postData.mediaUrl, postData.caption, {
      parseMode: 'HTML',
      disableNotification: postData.silent || false
    });
  }
}

module.exports = VideoPublishStrategy;
