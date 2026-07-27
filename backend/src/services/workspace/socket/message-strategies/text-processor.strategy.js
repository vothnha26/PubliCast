const MessageProcessorStrategy = require('./message-processor.strategy');
const { MESSAGE_TYPES } = require('../../../../utils/socket-constants');

class TextProcessorStrategy extends MessageProcessorStrategy {
  async process(payload) {
    const content = (payload.content || '').trim();
    if (!content) {
      const error = new Error('Message content cannot be empty');
      error.status = 400;
      throw error;
    }

    // Example of clean processing - basic bad words/forbidden pattern filter
    const sanitizedContent = content.replace(/<(?:.|\n)*?>/gm, ''); // strip HTML

    return {
      messageType: MESSAGE_TYPES.TEXT,
      content: sanitizedContent,
      attachmentUrl: null
    };
  }
}

module.exports = TextProcessorStrategy;
