const BaseValidator = require('./base.validator');

class GenericValidator extends BaseValidator {
  validate(postData, mediaInfo = {}) {
    const errors = [];
    errors.push(...this.validateFixedRules(postData, mediaInfo));
    errors.push(...this.validateCaption(postData.caption));
    errors.push(...this.validateMedia(mediaInfo));
    return errors;
  }
}

module.exports = GenericValidator;
