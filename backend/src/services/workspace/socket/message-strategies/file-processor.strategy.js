const MessageProcessorStrategy = require('./message-processor.strategy');
const { MESSAGE_TYPES } = require('../../../../utils/socket-constants');

class FileProcessorStrategy extends MessageProcessorStrategy {
  async process(payload) {
    const { content, attachmentUrl } = payload;
    if (!attachmentUrl) {
      const error = new Error('File message requires an attachmentUrl');
      error.status = 400;
      throw error;
    }

    return {
      messageType: MESSAGE_TYPES.FILE,
      content: content || 'Sent a file',
      attachmentUrl
    };
  }
}

module.exports = FileProcessorStrategy;
