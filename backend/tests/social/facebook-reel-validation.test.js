const FacebookValidator = require('../../src/services/workspace/post/validators/facebook.validator');

describe('Facebook Reels Validation Tests', () => {
  let validator;

  beforeEach(() => {
    validator = new FacebookValidator();
  });

  describe('Reel Media Validation', () => {
    it('should pass validation for vertical video within 3-90 seconds', () => {
      const postData = {
        type: 'REEL',
        options: {
          facebookType: 'reel'
        }
      };
      const mediaInfo = {
        hasMedia: true,
        isVideo: true,
        duration: 15,
        width: 1080,
        height: 1920
      };

      const errors = validator.validate(postData, mediaInfo);
      expect(errors).toHaveLength(0);
    });

    it('should fail if reel is not a video', () => {
      const postData = {
        type: 'REEL',
        options: {
          facebookType: 'reel'
        }
      };
      const mediaInfo = {
        hasMedia: true,
        isVideo: false
      };

      const errors = validator.validate(postData, mediaInfo);
      expect(errors).toContainEqual(expect.stringContaining('require a video file'));
    });

    it('should fail if video is horizontal or square', () => {
      const postData = {
        type: 'REEL',
        options: {
          facebookType: 'reel'
        }
      };
      const mediaInfo = {
        hasMedia: true,
        isVideo: true,
        duration: 10,
        width: 1920,
        height: 1080
      };

      const errors = validator.validate(postData, mediaInfo);
      expect(errors).toContainEqual(expect.stringContaining('must be vertical'));
    });

    it('should fail if video duration is less than 3 seconds', () => {
      const postData = {
        type: 'REEL',
        options: {
          facebookType: 'reel'
        }
      };
      const mediaInfo = {
        hasMedia: true,
        isVideo: true,
        duration: 2.5,
        width: 1080,
        height: 1920
      };

      const errors = validator.validate(postData, mediaInfo);
      expect(errors).toContainEqual(expect.stringContaining('between 3 and 90 seconds'));
    });

    it('should fail if video duration is greater than 90 seconds', () => {
      const postData = {
        type: 'REEL',
        options: {
          facebookType: 'reel'
        }
      };
      const mediaInfo = {
        hasMedia: true,
        isVideo: true,
        duration: 95,
        width: 1080,
        height: 1920
      };

      const errors = validator.validate(postData, mediaInfo);
      expect(errors).toContainEqual(expect.stringContaining('between 3 and 90 seconds'));
    });
  });

  describe('Reel Option Field Validations', () => {
    it('should fail if collaborator ID is not numeric', () => {
      const postData = {
        type: 'REEL',
        options: {
          facebookType: 'reel',
          facebookReelCollaboratorId: 'abc1234'
        }
      };
      const mediaInfo = {
        hasMedia: true,
        isVideo: true,
        duration: 30,
        width: 1080,
        height: 1920
      };

      const errors = validator.validate(postData, mediaInfo);
      expect(errors).toContainEqual(expect.stringContaining('Collaborator Page ID must be a numeric string'));
    });

    it('should fail if place ID is not numeric', () => {
      const postData = {
        type: 'REEL',
        options: {
          facebookType: 'reel',
          facebookReelPlaceId: 'abc_place'
        }
      };
      const mediaInfo = {
        hasMedia: true,
        isVideo: true,
        duration: 30,
        width: 1080,
        height: 1920
      };

      const errors = validator.validate(postData, mediaInfo);
      expect(errors).toContainEqual(expect.stringContaining('Place ID must be a numeric string'));
    });

    it('should pass if collaborator ID and place ID are numeric strings', () => {
      const postData = {
        type: 'REEL',
        options: {
          facebookType: 'reel',
          facebookReelCollaboratorId: '1000928374',
          facebookReelPlaceId: '992837465'
        }
      };
      const mediaInfo = {
        hasMedia: true,
        isVideo: true,
        duration: 30,
        width: 1080,
        height: 1920
      };

      const errors = validator.validate(postData, mediaInfo);
      expect(errors).toHaveLength(0);
    });
  });
});
