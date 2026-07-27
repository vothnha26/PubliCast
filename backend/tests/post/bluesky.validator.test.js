const validatorFactory = require('../../src/services/workspace/post/validators/validator.factory');
const { PLATFORMS } = require('../../src/utils/constants');

describe('Bluesky vs Telegram Caption Limit Validation Unit Tests', () => {
  const limitConfig = {
    maxCaptionLength: 300,
    allowedMediaTypes: 'ALL'
  };

  describe('BlueskyValidator (Grapheme counting)', () => {
    let blueskyValidator;

    beforeEach(() => {
      blueskyValidator = validatorFactory.getValidator(PLATFORMS.BLUESKY, limitConfig);
    });

    it('should pass validation when caption contains emoji ZWJ sequence within grapheme limit but exceeding string length', () => {
      // '👨‍👩‍👧‍👧' có grapheme = 1, nhưng .length = 11
      // 30 lần emoji này = 30 graphemes, nhưng .length = 330
      const caption = '👨‍👩‍👧‍👧'.repeat(30);
      expect(caption.length).toBeGreaterThan(300);

      const errors = blueskyValidator.validate({ caption }, { hasMedia: false });
      expect(errors).toHaveLength(0);
    });

    it('should pass validation when caption is exactly 300 normal characters', () => {
      const caption = 'a'.repeat(300);
      const errors = blueskyValidator.validate({ caption }, { hasMedia: false });
      expect(errors).toHaveLength(0);
    });

    it('should fail validation when caption is 301 normal characters', () => {
      const caption = 'a'.repeat(301);
      const errors = blueskyValidator.validate({ caption }, { hasMedia: false });
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Caption length exceeds the maximum limit of 300 characters.');
    });
  });

  describe('GenericValidator (String length counting for Telegram/default)', () => {
    let telegramValidator;

    beforeEach(() => {
      telegramValidator = validatorFactory.getValidator(PLATFORMS.TELEGRAM, limitConfig);
    });

    it('should fail validation when caption contains emoji ZWJ sequence exceeding string length limit', () => {
      const caption = '👨‍👩‍👧‍👧'.repeat(30); // length = 330 > 300
      const errors = telegramValidator.validate({ caption }, { hasMedia: false });
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Caption length exceeds the maximum limit of 300 characters.');
    });

    it('should pass validation when caption length is within limits', () => {
      const caption = 'a'.repeat(300);
      const errors = telegramValidator.validate({ caption }, { hasMedia: false });
      expect(errors).toHaveLength(0);
    });
  });
});
