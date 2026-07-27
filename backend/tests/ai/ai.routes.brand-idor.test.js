/**
 * Regression tests for issue #49: AI settings/history/generate routes must
 * verify the caller belongs to brandId, instead of trusting the query/body
 * value with no ownership check (requireFeature only checks subscription
 * entitlement, not brand membership).
 *
 * Mounts ai.routes.js in an isolated express app (bypassing app.js's full
 * require chain, which hits a pre-existing otplib/Jest parse issue
 * unrelated to this fix) with a fake authenticated user and a mocked
 * authorizationFacade, so this asserts the middleware wiring itself rather
 * than re-testing checkBrandAccess's own logic.
 */
const request = require('supertest');
const express = require('express');

jest.mock('../../src/middlewares/auth.middleware', () => ({
  verifyAuth: (req, res, next) => {
    req.user = { id: 'user-1' };
    next();
  }
}));
jest.mock('../../src/services/auth/authorization.facade', () => ({
  checkBrandAccess: jest.fn(),
  checkPermission: jest.fn()
}));
jest.mock('../../src/services/subscription/subscription-gate.facade', () => ({
  checkFeatureAccess: jest.fn().mockResolvedValue(true)
}));
jest.mock('../../src/controllers/workspace/ai.controller', () => ({
  getConfig: (req, res) => res.status(200).json({ ok: true }),
  getSettings: (req, res) => res.status(200).json({ ok: true }),
  updateSettings: (req, res) => res.status(200).json({ ok: true }),
  getHistory: (req, res) => res.status(200).json({ ok: true }),
  generateContent: (req, res) => res.status(200).json({ ok: true }),
  quickPost: (req, res) => res.status(201).json({ ok: true })
}));

const authorizationFacade = require('../../src/services/auth/authorization.facade');
const aiRoutes = require('../../src/routes/workspace/ai.routes');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/ai', aiRoutes);
  return app;
}

describe('ai.routes brand membership (#49)', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    authorizationFacade.checkFeatureAccess?.mockResolvedValue?.(true);
    app = buildApp();
  });

  test('GET /settings rejects a user who is not a member of brandId', async () => {
    authorizationFacade.checkBrandAccess.mockResolvedValue(false);

    const res = await request(app).get('/api/ai/settings').query({ brandId: 'brand-victim' });

    expect(res.status).toBe(403);
    expect(authorizationFacade.checkBrandAccess).toHaveBeenCalledWith('user-1', 'brand-victim');
  });

  test('GET /settings allows a genuine brand member', async () => {
    authorizationFacade.checkBrandAccess.mockResolvedValue(true);

    const res = await request(app).get('/api/ai/settings').query({ brandId: 'brand-1' });

    expect(res.status).toBe(200);
  });

  test('PUT /settings rejects a non-member', async () => {
    authorizationFacade.checkBrandAccess.mockResolvedValue(false);

    const res = await request(app).put('/api/ai/settings').query({ brandId: 'brand-victim' }).send({});

    expect(res.status).toBe(403);
  });

  test('GET /history rejects a non-member', async () => {
    authorizationFacade.checkBrandAccess.mockResolvedValue(false);

    const res = await request(app).get('/api/ai/history').query({ brandId: 'brand-victim' });

    expect(res.status).toBe(403);
  });

  test('POST /generate rejects a non-member before the feature-gate check', async () => {
    authorizationFacade.checkBrandAccess.mockResolvedValue(false);

    const res = await request(app).post('/api/ai/generate').query({ brandId: 'brand-victim' }).send({});

    expect(res.status).toBe(403);
  });

  test('GET /config requires no brandId (global, unaffected by this fix)', async () => {
    const res = await request(app).get('/api/ai/config');

    expect(res.status).toBe(200);
    expect(authorizationFacade.checkBrandAccess).not.toHaveBeenCalled();
  });
});
