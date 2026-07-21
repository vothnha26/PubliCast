/**
 * Regression tests for issue #51: getHighlightStatus and publishToYouTube
 * must verify brand ownership instead of trusting the caller's id/brandId.
 */
jest.mock('../../src/config/prisma', () => ({
  livestreamHighlight: {
    findUnique: jest.fn(),
    update: jest.fn()
  }
}));
jest.mock('../../src/config/redis', () => ({
  hGet: jest.fn(),
  hDel: jest.fn(),
  lPush: jest.fn()
}));
jest.mock('../../src/services/social/youtube/youtube-publish.service', () => ({
  publishPost: jest.fn()
}));
jest.mock('../../src/services/auth/authorization.facade', () => ({
  checkBrandAccess: jest.fn()
}));

const highlightService = require('../../src/services/workspace/highlight.service');
const prisma = require('../../src/config/prisma');
const youtubePublishService = require('../../src/services/social/youtube/youtube-publish.service');
const authorizationFacade = require('../../src/services/auth/authorization.facade');

describe('highlight.service brand ownership (#51)', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getHighlightStatus', () => {
    test('returns the highlight when the caller belongs to its brand', async () => {
      prisma.livestreamHighlight.findUnique.mockResolvedValue({
        id: 'hl-1', brandId: 'brand-1', status: 'completed', progress: 100
      });
      authorizationFacade.checkBrandAccess.mockResolvedValue(true);

      const result = await highlightService.getHighlightStatus('hl-1', 'user-1');

      expect(result.id).toBe('hl-1');
      expect(authorizationFacade.checkBrandAccess).toHaveBeenCalledWith('user-1', 'brand-1');
    });

    test('throws 403 when the caller does not belong to the highlight brand', async () => {
      prisma.livestreamHighlight.findUnique.mockResolvedValue({ id: 'hl-1', brandId: 'brand-victim', status: 'completed' });
      authorizationFacade.checkBrandAccess.mockResolvedValue(false);

      await expect(highlightService.getHighlightStatus('hl-1', 'attacker'))
        .rejects.toThrow('Bạn không có quyền truy cập highlight này.');
    });
  });

  describe('publishToYouTube', () => {
    test('publishes when brandId matches the highlight and caller belongs to it', async () => {
      prisma.livestreamHighlight.findUnique.mockResolvedValue({
        id: 'hl-1', brandId: 'brand-1', videoUrl: 'https://cdn/video.mp4'
      });
      authorizationFacade.checkBrandAccess.mockResolvedValue(true);
      youtubePublishService.publishPost.mockResolvedValue({ platformVideoId: 'yt-123' });
      prisma.livestreamHighlight.update.mockResolvedValue({});

      const result = await highlightService.publishToYouTube('hl-1', 'brand-1', 'Title', 'Desc', 'user-1');

      expect(result.platformVideoId).toBe('yt-123');
      expect(youtubePublishService.publishPost).toHaveBeenCalledWith('brand-1', expect.any(Object));
    });

    test('rejects when the supplied brandId does not match the highlight\'s real brand (#51 core bug)', async () => {
      // Attacker has legitimate access to "brand-attacker" but supplies
      // another brand's highlightId — the old code never checked this.
      prisma.livestreamHighlight.findUnique.mockResolvedValue({
        id: 'hl-victim', brandId: 'brand-victim', videoUrl: 'https://cdn/video.mp4'
      });
      authorizationFacade.checkBrandAccess.mockResolvedValue(true); // caller IS a member of brand-attacker

      await expect(
        highlightService.publishToYouTube('hl-victim', 'brand-attacker', 'Title', 'Desc', 'attacker')
      ).rejects.toThrow('Highlight không thuộc thương hiệu này.');
      expect(youtubePublishService.publishPost).not.toHaveBeenCalled();
    });

    test('rejects when the caller does not belong to the (matching) brand', async () => {
      prisma.livestreamHighlight.findUnique.mockResolvedValue({
        id: 'hl-1', brandId: 'brand-1', videoUrl: 'https://cdn/video.mp4'
      });
      authorizationFacade.checkBrandAccess.mockResolvedValue(false);

      await expect(
        highlightService.publishToYouTube('hl-1', 'brand-1', 'Title', 'Desc', 'outsider')
      ).rejects.toThrow('Bạn không có quyền truy cập thương hiệu này.');
      expect(youtubePublishService.publishPost).not.toHaveBeenCalled();
    });
  });
});
