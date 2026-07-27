const TelegramPublishStrategy = require('./publish.strategy');
const telegramGateway = require('../telegram.gateway');

class TextPublishStrategy extends TelegramPublishStrategy {
  async publish(chatId, botToken, postData) {
    return telegramGateway.sendMessage(botToken, chatId, postData.caption, {
      parseMode: 'HTML',
      disableWebPagePreview: false,
      disableNotification: postData.silent || false
    });
  }
}

module.exports = TextPublishStrategy;
