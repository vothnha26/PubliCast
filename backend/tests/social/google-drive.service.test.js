const mockWriteStream = { on: jest.fn(), end: jest.fn() };
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(() => false),
  mkdirSync: jest.fn(),
  createWriteStream: jest.fn(() => mockWriteStream),
  unlink: jest.fn((p, cb) => cb && cb())
}));

const fs = require('fs');

const mockDriveClient = {
  files: {
    list: jest.fn(),
    get: jest.fn()
  }
};

jest.mock('googleapis', () => ({
  google: {
    drive: jest.fn(() => mockDriveClient)
  }
}));

jest.mock('../../src/services/social/google-oauth.service', () => ({
  createClient: jest.fn(() => ({
    setCredentials: jest.fn()
  }))
}));

jest.mock('../../src/repositories/social/social-account.repository', () => ({
  findByBrandAndPlatform: jest.fn()
}));

const socialAccountRepository = require('../../src/repositories/social/social-account.repository');
const googleDriveService = require('../../src/services/social/google-drive.service');

describe('GoogleDriveService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // downloadFile short-circuits (skips the Google API call) when the target
    // file already exists on disk — mocked to false so each test actually
    // exercises the download path instead of depending on filesystem state
    // left over from a previous run.
    fs.existsSync.mockReturnValue(false);
    socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([
      { accessToken: 'tok', refreshToken: 'ref', tokenExpiresAt: null }
    ]);
  });

  describe('downloadFile — fileId validation', () => {
    it('should reject a fileId containing path traversal segments', async () => {
      await expect(
        googleDriveService.downloadFile('brand-1', '../../../../etc/passwd', 'evil.txt')
      ).rejects.toMatchObject({ statusCode: 400 });

      // Must fail before ever calling the Google API
      expect(mockDriveClient.files.get).not.toHaveBeenCalled();
    });

    it('should reject a fileId containing a path separator', async () => {
      await expect(
        googleDriveService.downloadFile('brand-1', 'abc/def', 'file.mp4')
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('should reject a fileId containing null bytes or other unsafe characters', async () => {
      await expect(
        googleDriveService.downloadFile('brand-1', 'abc\0def', 'file.mp4')
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('should accept a realistic Google Drive file ID and resolve inside uploads/', async () => {
      const validFileId = '1A2b3C4d5E6f7G8h9I0j_-XYZ';
      mockDriveClient.files.get.mockResolvedValue({
        data: {
          on(event, cb) {
            if (event === 'end') cb();
            return this;
          },
          pipe() {}
        }
      });

      const result = await googleDriveService.downloadFile('brand-1', validFileId, 'my video.mp4');

      expect(mockDriveClient.files.get).toHaveBeenCalledWith(
        { fileId: validFileId, alt: 'media' },
        { responseType: 'stream' }
      );
      expect(result).toBe(`/uploads/drive-${validFileId}-my_video.mp4`);
    });
  });

  describe('listVideos', () => {
    it('should throw NOT_CONNECTED when no Google account is linked to the brand', async () => {
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([]);

      await expect(googleDriveService.listVideos('brand-1')).rejects.toMatchObject({ code: 'NOT_CONNECTED' });
    });

    it('should return the files list from the Drive API', async () => {
      mockDriveClient.files.list.mockResolvedValue({
        data: { files: [{ id: 'f1', name: 'video.mp4' }] }
      });

      const result = await googleDriveService.listVideos('brand-1');

      expect(result).toEqual([{ id: 'f1', name: 'video.mp4' }]);
    });
  });
});
