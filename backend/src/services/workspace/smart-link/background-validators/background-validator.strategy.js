class BackgroundValidatorStrategy {
  /**
   * Validate the background value.
   * @param {string} value - The background value to validate.
   * @returns {boolean} - True if valid, throws error or returns false otherwise.
   */
  validate(value) {
    throw new Error("Method 'validate(value)' must be implemented.");
  }
}

module.exports = BackgroundValidatorStrategy;
