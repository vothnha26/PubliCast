const MessageProcessorStrategy = require('./message-processor.strategy');
const { MESSAGE_TYPES } = require('../../../../utils/socket-constants');

class ImageProcessorStrategy extends MessageProcessorStrategy {
  async process(payload) {
    const { content, attachmentUrl } = payload;
    if (!attachmentUrl) {
      const error = new Error('Image message requires an attachmentUrl');
      error.status = 400;
      throw error;
    }

    return {
      messageType: MESSAGE_TYPES.IMAGE,
      content: content || 'Sent an image',
      attachmentUrl
    };
  }
}

module.exports = ImageProcessorStrategy;
