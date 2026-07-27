const BackgroundValidatorStrategy = require('./background-validator.strategy');

class ImageValidator extends BackgroundValidatorStrategy {
  validate(value) {
    if (!value || typeof value !== 'string') {
      return false;
    }
    // Simple URL validation (http/https/relative uploads url)
    try {
      if (value.startsWith('/uploads/')) {
        return true;
      }
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
      return false;
    }
  }
}

module.exports = ImageValidator;
