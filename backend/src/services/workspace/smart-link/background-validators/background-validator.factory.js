const ColorValidator = require('./color.validator');
const GradientValidator = require('./gradient.validator');
const ImageValidator = require('./image.validator');
const ThemeValidator = require('./theme.validator');

// Centralize constants (No magic strings rule)
const BACKGROUND_TYPES = {
  COLOR: 'COLOR',
  GRADIENT: 'GRADIENT',
  IMAGE: 'IMAGE',
  THEME: 'THEME'
};

class BackgroundValidatorFactory {
  constructor() {
    this.validators = {
      [BACKGROUND_TYPES.COLOR]: new ColorValidator(),
      [BACKGROUND_TYPES.GRADIENT]: new GradientValidator(),
      [BACKGROUND_TYPES.IMAGE]: new ImageValidator(),
      [BACKGROUND_TYPES.THEME]: new ThemeValidator()
    };
  }

  /**
   * Get validator for a specific background type.
   * @param {string} type - The background type (COLOR, GRADIENT, IMAGE, THEME).
   * @returns {BackgroundValidatorStrategy}
   */
  getValidator(type) {
    const key = String(type).toUpperCase();
    const validator = this.validators[key];
    if (!validator) {
      throw new Error(`Unsupported background type: ${type}`);
    }
    return validator;
  }
}

module.exports = new BackgroundValidatorFactory();
