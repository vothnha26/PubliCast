const request = require('supertest');

// Mock otplib to prevent ESModule parsing errors on @scure/base in Jest
jest.mock('otplib', () => ({
  authenticator: {
    generate: jest.fn(),
    verify: jest.fn()
  }
}));

// Mock auth so req.user is controllable per test.
jest.mock('../../src/middlewares/auth.middleware', () => ({
  verifyAuth: (req, res, next) => {
    req.user = { id: 'caller-user-id', email: 'caller@publicast.com', role: 'USER' };
    next();
  }
}));

jest.mock('../../src/services/auth/authorization.facade');
jest.mock('../../src/services/workspace/media-folder.service');

const app = require('../../src/app');
const authorizationFacade = require('../../src/services/auth/authorization.facade');
const mediaFolderService = require('../../src/services/workspace/media-folder.service');

describe('Media folder routes — permission enforcement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/media-folders', () => {
    it('returns 403 when the caller lacks MANAGE_MEDIA on the brand', async () => {
      authorizationFacade.checkPermission.mockResolvedValue(false);

      await request(app)
        .get('/api/media-folders')
        .query({ brandId: 'brand-1' })
        .expect(403);

      expect(mediaFolderService.getFolders).not.toHaveBeenCalled();
    });

    it('returns 200 when the caller has MANAGE_MEDIA on the brand', async () => {
      authorizationFacade.checkPermission.mockResolvedValue(true);
      mediaFolderService.getFolders.mockResolvedValue([]);

      await request(app)
        .get('/api/media-folders')
        .query({ brandId: 'brand-1' })
        .expect(200);
    });
  });

  describe('POST /api/media-folders', () => {
    it('returns 403 when the caller lacks MANAGE_MEDIA on the brand', async () => {
      authorizationFacade.checkPermission.mockResolvedValue(false);

      await request(app)
        .post('/api/media-folders')
        .send({ brandId: 'brand-1', name: 'New Folder' })
        .expect(403);

      expect(mediaFolderService.createFolder).not.toHaveBeenCalled();
    });
  });

  describe('PUT /api/media-folders/:id', () => {
    it('returns 403 when the caller lacks MANAGE_MEDIA on the brand', async () => {
      authorizationFacade.checkPermission.mockResolvedValue(false);

      await request(app)
        .put('/api/media-folders/folder-1')
        .send({ brandId: 'brand-1', name: 'Renamed' })
        .expect(403);

      expect(mediaFolderService.updateFolder).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/media-folders/:id', () => {
    it('returns 403 when the caller lacks MANAGE_MEDIA on the brand', async () => {
      authorizationFacade.checkPermission.mockResolvedValue(false);

      await request(app)
        .delete('/api/media-folders/folder-1')
        .send({ brandId: 'brand-1' })
        .expect(403);

      expect(mediaFolderService.deleteFolder).not.toHaveBeenCalled();
    });
  });
});
