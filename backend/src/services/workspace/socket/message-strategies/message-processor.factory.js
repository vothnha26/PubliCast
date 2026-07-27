const { MESSAGE_TYPES } = require('../../../../utils/socket-constants');
const TextProcessorStrategy = require('./text-processor.strategy');
const ImageProcessorStrategy = require('./image-processor.strategy');
const FileProcessorStrategy = require('./file-processor.strategy');

class MessageProcessorFactory {
  constructor() {
    this.strategies = {
      [MESSAGE_TYPES.TEXT]: new TextProcessorStrategy(),
      [MESSAGE_TYPES.IMAGE]: new ImageProcessorStrategy(),
      [MESSAGE_TYPES.FILE]: new FileProcessorStrategy()
    };
  }

  /**
   * Get processor by type.
   * @param {string} type - Message type (TEXT, IMAGE, FILE)
   * @returns {MessageProcessorStrategy}
   */
  getProcessor(type) {
    const processor = this.strategies[type || MESSAGE_TYPES.TEXT];
    if (!processor) {
      const error = new Error(`Unsupported message type: ${type}`);
      error.status = 400;
      throw error;
    }
    return processor;
  }
}

module.exports = new MessageProcessorFactory();
