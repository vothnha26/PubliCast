const TelegramPublishStrategy = require('./publish.strategy');
const telegramGateway = require('../telegram.gateway');

class ImagePublishStrategy extends TelegramPublishStrategy {
  async publish(chatId, botToken, postData) {
    return telegramGateway.sendPhoto(botToken, chatId, postData.mediaUrl, postData.caption, {
      parseMode: 'HTML',
      disableNotification: postData.silent || false
    });
  }
}

module.exports = ImagePublishStrategy;
