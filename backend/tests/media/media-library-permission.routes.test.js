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
jest.mock('../../src/services/workspace/media-library.service');
jest.mock('../../src/config/cloudinary', () => ({
  cloudinary: {
    utils: { api_sign_request: jest.fn().mockReturnValue('signed') },
    uploader: { destroy: jest.fn() }
  }
}));

const app = require('../../src/app');
const authorizationFacade = require('../../src/services/auth/authorization.facade');
const mediaLibraryService = require('../../src/services/workspace/media-library.service');

describe('Media library routes — permission enforcement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/media/signature', () => {
    it('is not brand-scoped and never consults authorizationFacade', async () => {
      await request(app).get('/api/media/signature').expect(200);
      expect(authorizationFacade.checkPermission).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/media', () => {
    it('returns 403 when the caller lacks MANAGE_MEDIA on the brand', async () => {
      authorizationFacade.checkPermission.mockResolvedValue(false);

      const res = await request(app)
        .get('/api/media')
        .query({ brandId: 'brand-1' })
        .expect(403);

      expect(res.body.message).toContain('không có quyền');
      expect(mediaLibraryService.getMediaFiles).not.toHaveBeenCalled();
    });

    it('returns 200 when the caller has MANAGE_MEDIA on the brand', async () => {
      authorizationFacade.checkPermission.mockResolvedValue(true);
      mediaLibraryService.getMediaFiles.mockResolvedValue([]);

      await request(app)
        .get('/api/media')
        .query({ brandId: 'brand-1' })
        .expect(200);
    });
  });

  describe('POST /api/media/upload', () => {
    it('returns 403 when the caller lacks MANAGE_MEDIA, even though multer already parsed the multipart body', async () => {
      authorizationFacade.checkPermission.mockResolvedValue(false);

      const res = await request(app)
        .post('/api/media/upload')
        .field('brandId', 'brand-1')
        .attach('file', Buffer.from('fake-image-bytes'), 'photo.png')
        .expect(403);

      expect(res.body.message).toContain('không có quyền');
      expect(mediaLibraryService.uploadFile).not.toHaveBeenCalled();
      // Prove brandId really was readable from the parsed body when the check ran.
      expect(authorizationFacade.checkPermission).toHaveBeenCalledWith(
        'caller-user-id',
        'brand-1',
        'MANAGE_MEDIA'
      );
    });
  });

  describe('POST /api/media/save-direct', () => {
    it('returns 403 when the caller lacks MANAGE_MEDIA on the brand', async () => {
      authorizationFacade.checkPermission.mockResolvedValue(false);

      await request(app)
        .post('/api/media/save-direct')
        .send({ brandId: 'brand-1', fileInfo: {} })
        .expect(403);

      expect(mediaLibraryService.saveDirectMedia).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/media/:id', () => {
    it('returns 403 when the caller lacks MANAGE_MEDIA on the brand', async () => {
      authorizationFacade.checkPermission.mockResolvedValue(false);

      await request(app)
        .delete('/api/media/media-1')
        .send({ brandId: 'brand-1' })
        .expect(403);

      expect(mediaLibraryService.deleteMedia).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /api/media/:id/rename', () => {
    it('returns 403 when the caller lacks MANAGE_MEDIA on the brand', async () => {
      authorizationFacade.checkPermission.mockResolvedValue(false);

      await request(app)
        .patch('/api/media/media-1/rename')
        .send({ brandId: 'brand-1', filename: 'new-name.png' })
        .expect(403);

      expect(mediaLibraryService.renameMedia).not.toHaveBeenCalled();
    });
  });
});
