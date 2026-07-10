/**
 * Abstract Base Class for Refine Strategies.
 * Follows Strategy Pattern (SOLID) to support multiple text editing features dynamically.
 */
class RefineStrategy {
  /**
   * Build the specific prompt for LLM provider.
   * @param {string} text - Current draft copy.
   * @param {object} option - Additional refinement options (e.g. target tone, target language).
   * @returns {string} Compiled prompt.
   */
  buildPrompt(text, option) {
    throw new Error('Method buildPrompt(text, option) must be implemented');
  }

  /**
   * System instruction specifying JSON schema for response.
   * @returns {string} System instruction.
   */
  getSystemInstruction() {
    const { buildSystemInstruction } = require('../../../../config/ai.config');
    return buildSystemInstruction({});
  }
}

module.exports = RefineStrategy;
