const BackgroundValidatorStrategy = require('./background-validator.strategy');

const VALID_THEMES = ['midnight', 'sunset', 'mint', 'cyberpunk'];

class ThemeValidator extends BackgroundValidatorStrategy {
  validate(value) {
    if (!value || typeof value !== 'string') {
      return false;
    }
    return VALID_THEMES.includes(value.toLowerCase());
  }
}

module.exports = ThemeValidator;
