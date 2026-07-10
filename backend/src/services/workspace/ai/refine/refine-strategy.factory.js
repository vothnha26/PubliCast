const { AI_REFINE_ACTIONS } = require('../../../../config/ai.config');
const TranslateStrategy = require('./strategies/translate.strategy');
const AddCtaStrategy = require('./strategies/add-cta.strategy');
const AddHashtagsStrategy = require('./strategies/add-hashtags.strategy');
const LengthenStrategy = require('./strategies/lengthen.strategy');
const ShortenStrategy = require('./strategies/shorten.strategy');
const ChangeToneStrategy = require('./strategies/change-tone.strategy');
const AddEmojisStrategy = require('./strategies/add-emojis.strategy');
const CorrectStrategy = require('./strategies/correct.strategy');
const OptimizeStrategy = require('./strategies/optimize.strategy');
const StructureStrategy = require('./strategies/structure.strategy');
const AdjustStrategy = require('./strategies/adjust.strategy');

/**
 * Factory class for AI refinement strategies (SOLID).
 * Maps action parameters to their corresponding logic handlers.
 */
class RefineStrategyFactory {
  constructor() {
    this.strategies = {
      [AI_REFINE_ACTIONS.TRANSLATE]: new TranslateStrategy(),
      [AI_REFINE_ACTIONS.ADD_CTA]: new AddCtaStrategy(),
      [AI_REFINE_ACTIONS.ADD_HASHTAGS]: new AddHashtagsStrategy(),
      [AI_REFINE_ACTIONS.LENGTHEN]: new LengthenStrategy(),
      [AI_REFINE_ACTIONS.SHORTEN]: new ShortenStrategy(),
      [AI_REFINE_ACTIONS.CHANGE_TONE]: new ChangeToneStrategy(),
      [AI_REFINE_ACTIONS.ADD_EMOJIS]: new AddEmojisStrategy(),
      [AI_REFINE_ACTIONS.CORRECT]: new CorrectStrategy(),
      [AI_REFINE_ACTIONS.OPTIMIZE]: new OptimizeStrategy(),
      [AI_REFINE_ACTIONS.STRUCTURE]: new StructureStrategy(),
      [AI_REFINE_ACTIONS.ADJUST]: new AdjustStrategy()
    };
  }

  /**
   * Get the concrete strategy class based on action value.
   * @param {string} action - Refinement action identifier.
   * @returns {RefineStrategy} Instantiated strategy handler.
   */
  getStrategy(action) {
    const strategy = this.strategies[action];
    if (!strategy) {
      throw new Error(`Unsupported AI refinement action: ${action}`);
    }
    return strategy;
  }
}

module.exports = new RefineStrategyFactory();
