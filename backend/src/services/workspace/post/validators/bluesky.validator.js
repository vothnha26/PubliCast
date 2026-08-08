const BaseValidator = require('./base.validator');

class BlueskyValidator extends BaseValidator {
  validate(postData, mediaInfo = {}) {
    const errors = [];
    errors.push(...this.validateFixedRules(postData, mediaInfo));
    errors.push(...this.validateCaption(postData.caption));
    errors.push(...this.validateMedia(mediaInfo));
    return errors;
  }

  /**
   * Override: Bluesky đếm giới hạn ký tự theo grapheme cluster (đơn vị người dùng nhìn thấy),
   * không phải theo .length (UTF-16 code unit) — xem guide/bluesky/tutorials/creating-a-post.md
   */
  validateCaption(caption) {
    const errors = [];
    if (!caption) return errors;

    if (this.limitConfig.maxCaptionLength) {
      const graphemeCount = this._graphemeLength(caption);
      if (graphemeCount > this.limitConfig.maxCaptionLength) {
        errors.push(`Caption length exceeds the maximum limit of ${this.limitConfig.maxCaptionLength} characters.`);
      }
    }
    return errors;
  }

  _graphemeLength(text) {
    const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
    return [...segmenter.segment(text)].length;
  }
}

module.exports = BlueskyValidator;
