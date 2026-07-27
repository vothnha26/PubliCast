/**
 * Abstract Base Class for a Pipeline Step
 */
class BaseStep {
  /**
   * Execute the step logic
   * @param {Object} context - Shared data between steps
   * @param {Function} next - Function to call the next step (optional, for middleware style)
   */
  async execute(context) {
    throw new Error('Method execute() must be implemented');
  }
}

module.exports = BaseStep;
