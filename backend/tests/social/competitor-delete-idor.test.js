// Regression tests for the DELETE /youtube/competitors/:id and
// DELETE /facebook/competitors/:id IDOR: both previously deleted a
// CompetitorAnalysis row by ID alone, with zero brand check anywhere in the
// call chain — any authenticated user could delete any brand's tracked
// competitor by guessing/observing an id.

jest.mock('../../src/repositories/social/competitor.repository', () => ({
  findById: jest.fn(),
  deleteCompetitor: jest.fn()
}));

jest.mock('../../src/services/auth/authorization.facade', () => ({
  checkBrandAccess: jest.fn()
}));

const competitorRepository = require('../../src/repositories/social/competitor.repository');
const authorizationFacade = require('../../src/services/auth/authorization.facade');

describe('Competitor delete IDOR fix', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('YouTubeAnalyticsService.deleteCompetitor', () => {
    const youtubeAnalytics = require('../../src/services/social/youtube/youtube-analytics.service');

    it('should delete when the competitor belongs to the caller-supplied brand and caller has access', async () => {
      competitorRepository.findById.mockResolvedValue({ id: 'comp-1', brandId: 'brand-abc' });
      authorizationFacade.checkBrandAccess.mockResolvedValue(true);
      competitorRepository.deleteCompetitor.mockResolvedValue(true);

      await youtubeAnalytics.deleteCompetitor('comp-1', 'brand-abc', 'user-1');

      expect(authorizationFacade.checkBrandAccess).toHaveBeenCalledWith('user-1', 'brand-abc');
      expect(competitorRepository.deleteCompetitor).toHaveBeenCalledWith('comp-1');
    });

    it('should reject with 404 when the competitor belongs to a different brand than claimed', async () => {
      competitorRepository.findById.mockResolvedValue({ id: 'comp-1', brandId: 'brand-victim' });

      await expect(
        youtubeAnalytics.deleteCompetitor('comp-1', 'brand-attacker', 'user-1')
      ).rejects.toMatchObject({ statusCode: 404 });

      expect(competitorRepository.deleteCompetitor).not.toHaveBeenCalled();
    });

    it('should reject with 403 when caller has no access to the claimed brand', async () => {
      competitorRepository.findById.mockResolvedValue({ id: 'comp-1', brandId: 'brand-abc' });
      authorizationFacade.checkBrandAccess.mockResolvedValue(false);

      await expect(
        youtubeAnalytics.deleteCompetitor('comp-1', 'brand-abc', 'stranger-user')
      ).rejects.toMatchObject({ statusCode: 403 });

      expect(competitorRepository.deleteCompetitor).not.toHaveBeenCalled();
    });

    it('should reject with 404 when the competitor does not exist', async () => {
      competitorRepository.findById.mockResolvedValue(null);

      await expect(
        youtubeAnalytics.deleteCompetitor('missing', 'brand-abc', 'user-1')
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('FacebookCompetitorService.deleteCompetitor', () => {
    const facebookCompetitor = require('../../src/services/social/facebook/facebook-competitor.service');

    it('should delete when the competitor belongs to the caller-supplied brand and caller has access', async () => {
      competitorRepository.findById.mockResolvedValue({ id: 'comp-2', brandId: 'brand-abc' });
      authorizationFacade.checkBrandAccess.mockResolvedValue(true);
      competitorRepository.deleteCompetitor.mockResolvedValue(true);

      await facebookCompetitor.deleteCompetitor('comp-2', 'brand-abc', 'user-1');

      expect(authorizationFacade.checkBrandAccess).toHaveBeenCalledWith('user-1', 'brand-abc');
      expect(competitorRepository.deleteCompetitor).toHaveBeenCalledWith('comp-2');
    });

    it('should reject with 404 when the competitor belongs to a different brand than claimed', async () => {
      competitorRepository.findById.mockResolvedValue({ id: 'comp-2', brandId: 'brand-victim' });

      await expect(
        facebookCompetitor.deleteCompetitor('comp-2', 'brand-attacker', 'user-1')
      ).rejects.toMatchObject({ statusCode: 404 });

      expect(competitorRepository.deleteCompetitor).not.toHaveBeenCalled();
    });

    it('should reject with 403 when caller has no access to the claimed brand', async () => {
      competitorRepository.findById.mockResolvedValue({ id: 'comp-2', brandId: 'brand-abc' });
      authorizationFacade.checkBrandAccess.mockResolvedValue(false);

      await expect(
        facebookCompetitor.deleteCompetitor('comp-2', 'brand-abc', 'stranger-user')
      ).rejects.toMatchObject({ statusCode: 403 });

      expect(competitorRepository.deleteCompetitor).not.toHaveBeenCalled();
    });
  });
});
