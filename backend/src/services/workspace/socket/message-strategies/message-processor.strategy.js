/**
 * Abstract Class representing a Strategy for processing incoming messages.
 * This ensures SOLID structure and strict compliance with the Open/Closed Principle (OCP).
 */
class MessageProcessorStrategy {
  /**
   * Process the incoming payload.
   * @param {Object} payload - Raw payload from socket client
   * @returns {Promise<Object>} Processed message data including content, type, attachmentUrl
   */
  async process(payload) {
    throw new Error('Method "process(payload)" must be implemented.');
  }
}

module.exports = MessageProcessorStrategy;
