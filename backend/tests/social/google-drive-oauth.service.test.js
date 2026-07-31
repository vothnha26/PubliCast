const googleOAuthService = require('../../src/services/social/google-oauth.service');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');
const googleDriveOAuthService = require('../../src/services/social/google-drive-oauth.service');
const { GOOGLE_OAUTH_SCOPE_SETS } = require('../../src/utils/constants');

jest.mock('../../src/services/social/google-oauth.service');
jest.mock('../../src/repositories/social/social-account.repository');

describe('GoogleDriveOAuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAuthUrl', () => {
    it('should generate OAuth URL with GOOGLE_DRIVE scope set', () => {
      googleOAuthService.getAuthUrl.mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth?mock=true');
      const url = googleDriveOAuthService.getAuthUrl('brand-1', 'http://localhost/callback');

      expect(googleOAuthService.getAuthUrl).toHaveBeenCalledWith(
        GOOGLE_OAUTH_SCOPE_SETS.GOOGLE_DRIVE,
        'brand-1',
        'http://localhost/callback'
      );
      expect(url).toBe('https://accounts.google.com/o/oauth2/v2/auth?mock=true');
    });
  });

  describe('connectAccount', () => {
    it('should exchange code for tokens, fetch profile, and upsert GOOGLE_DRIVE social account', async () => {
      const mockTokens = { access_token: 'drive_acc_tok', refresh_token: 'drive_ref_tok' };
      const mockProfile = { id: 'g-drive-123', email: 'drive@example.com', name: 'Drive User' };

      googleOAuthService.getTokens.mockResolvedValue(mockTokens);
      googleOAuthService.getUserInfo.mockResolvedValue(mockProfile);
      socialAccountRepository.upsertGoogleDriveAccount.mockResolvedValue({ id: 'acc-1' });

      const result = await googleDriveOAuthService.connectAccount('brand-1', 'code-123', 'http://localhost/callback');

      expect(googleOAuthService.getTokens).toHaveBeenCalledWith('code-123', 'http://localhost/callback');
      expect(googleOAuthService.getUserInfo).toHaveBeenCalledWith(mockTokens);
      expect(socialAccountRepository.upsertGoogleDriveAccount).toHaveBeenCalledWith('brand-1', mockProfile, mockTokens);
      expect(result).toEqual({ id: 'acc-1' });
    });
  });

  describe('disconnectAccount', () => {
    it('should delete GOOGLE_DRIVE social account', async () => {
      socialAccountRepository.disconnectGoogleDriveAccount.mockResolvedValue({ count: 1 });
      const result = await googleDriveOAuthService.disconnectAccount('brand-1');

      expect(socialAccountRepository.disconnectGoogleDriveAccount).toHaveBeenCalledWith('brand-1');
      expect(result).toEqual({ count: 1 });
    });
  });
});
