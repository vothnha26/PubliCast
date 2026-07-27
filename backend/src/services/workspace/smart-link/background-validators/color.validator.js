const BackgroundValidatorStrategy = require('./background-validator.strategy');

class ColorValidator extends BackgroundValidatorStrategy {
  validate(value) {
    if (!value || typeof value !== 'string') {
      return false;
    }
    // Hex color regex (e.g. #FFF, #FFFFFF, #FFFFFFFF)
    const hexRegex = /^#([A-Fa-f0-9]{3,4}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/;
    return hexRegex.test(value);
  }
}

module.exports = ColorValidator;
