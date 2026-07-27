const request = require('supertest');
const crypto = require('node:crypto');

// Encrypt/decrypt need ENCRYPTION_KEY set before src/utils/encryption.js
// (and anything requiring it, transitively) is first loaded.
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'a'.repeat(32);

const { encrypt } = require('../../src/utils/encryption');

const CLIENT_SECRET = 'test-client-secret-for-convo-integration';
const CLIENT_ID = 'test-client-id';
const mockClient = {
  id: 'ic-1',
  name: 'convo',
  clientId: CLIENT_ID,
  clientSecretEncrypted: encrypt(CLIENT_SECRET),
  isActive: true,
  revokedAt: null
};

jest.mock('../../src/config/redis', () => ({
  set: jest.fn().mockResolvedValue('OK'),
  incr: jest.fn().mockResolvedValue(1),
  expire: jest.fn().mockResolvedValue(1)
}));

jest.mock('../../src/config/prisma', () => ({
  integrationClient: {
    findFirst: jest.fn()
  },
  brand: {
    findFirst: jest.fn()
  },
  user: {
    findFirst: jest.fn()
  },
  team: {
    findUnique: jest.fn()
  }
}));

const prisma = require('../../src/config/prisma');

function signPayload(payload, secret) {
  const serialized = `${payload.brandId}|${payload.userId}|${payload.timestamp}|${payload.nonce}`;
  return crypto.createHmac('sha256', secret).update(serialized).digest('hex');
}

function buildApp() {
  // Mount only the routes under test on a minimal Express app, rather than
  // requiring the full src/app.js — the full app pulls in unrelated routes
  // (e.g. auth.routes.js -> otplib) that currently fail to parse under Jest
  // on this branch (see branch fix/jest-otplib-esm-parse), unrelated to
  // this feature. Keeping the test scoped to convo-integration.routes.js
  // avoids depending on that unrelated fix landing first.
  // eslint-disable-next-line global-require
  const express = require('express');
  // eslint-disable-next-line global-require
  const convoIntegrationRoutes = require('../../src/routes/integrations/convo-integration.routes');
  const app = express();
  app.use(express.json());
  app.use('/api/integrations', convoIntegrationRoutes);
  return app;
}

describe('Convo integration routes', () => {
  let app;

  beforeAll(() => {
    app = buildApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.integrationClient.findFirst.mockResolvedValue(mockClient);
  });

  describe('POST /api/integrations/verify-token', () => {
    function validPayload(overrides = {}) {
      return {
        brandId: 'brand-1',
        userId: 'user-1',
        timestamp: Date.now(),
        nonce: `nonce-${Math.random()}`,
        ...overrides
      };
    }

    it('returns 200 with valid:true for an existing brand/user', async () => {
      prisma.brand.findFirst.mockResolvedValue({
        id: 'brand-1',
        name: 'Acme Corp',
        subscription: { plan: { name: 'PRO' } }
      });
      prisma.user.findFirst.mockResolvedValue({ id: 'user-1' });

      const payload = validPayload();
      const signature = signPayload(payload, CLIENT_SECRET);

      const res = await request(app)
        .post('/api/integrations/verify-token')
        .send({ payload, signature, client_id: CLIENT_ID });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        valid: true,
        brandId: 'brand-1',
        brandName: 'Acme Corp',
        publicastUserId: 'user-1',
        planName: 'PRO'
      });
    });

    it('returns 200 with valid:false when brand does not exist', async () => {
      prisma.brand.findFirst.mockResolvedValue(null);
      prisma.user.findFirst.mockResolvedValue({ id: 'user-1' });

      const payload = validPayload();
      const signature = signPayload(payload, CLIENT_SECRET);

      const res = await request(app)
        .post('/api/integrations/verify-token')
        .send({ payload, signature, client_id: CLIENT_ID });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ valid: false });
    });

    it('returns 401 when signature is invalid', async () => {
      const payload = validPayload();

      const res = await request(app)
        .post('/api/integrations/verify-token')
        .send({ payload, signature: 'deadbeef'.repeat(8), client_id: CLIENT_ID });

      expect(res.status).toBe(401);
    });

    it('returns 401 when client_id does not exist', async () => {
      prisma.integrationClient.findFirst.mockResolvedValue(null);
      const payload = validPayload();
      const signature = signPayload(payload, CLIENT_SECRET);

      const res = await request(app)
        .post('/api/integrations/verify-token')
        .send({ payload, signature, client_id: 'unknown-client' });

      expect(res.status).toBe(401);
    });

    it('returns 401 when nonce was already used', async () => {
      const redisClient = require('../../src/config/redis');
      redisClient.set.mockResolvedValueOnce('OK').mockResolvedValueOnce(null);
      prisma.brand.findFirst.mockResolvedValue({ id: 'brand-1', name: 'Acme', subscription: null });
      prisma.user.findFirst.mockResolvedValue({ id: 'user-1' });

      const payload = validPayload();
      const signature = signPayload(payload, CLIENT_SECRET);

      await request(app)
        .post('/api/integrations/verify-token')
        .send({ payload, signature, client_id: CLIENT_ID });

      const res = await request(app)
        .post('/api/integrations/verify-token')
        .send({ payload, signature, client_id: CLIENT_ID });

      expect(res.status).toBe(401);
    });

    it('returns 400 when payload is malformed', async () => {
      const res = await request(app)
        .post('/api/integrations/verify-token')
        .send({ payload: { brandId: 'b' }, signature: 'x', client_id: CLIENT_ID });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/integrations/brand/:brandId/user-permissions', () => {
    it('returns 200 with permissions for the brand owner', async () => {
      prisma.brand.findFirst.mockResolvedValue({ id: 'brand-1', ownerId: 'user-1' });

      const payload = {
        brandId: 'brand-1',
        userId: 'user-1',
        timestamp: Date.now(),
        nonce: `nonce-${Math.random()}`
      };
      const signature = signPayload(payload, CLIENT_SECRET);

      const res = await request(app)
        .get('/api/integrations/brand/brand-1/user-permissions')
        .query({ publicastUserId: 'user-1' })
        .set('X-Client-Id', CLIENT_ID)
        .set('X-Signature', signature)
        .set('X-Payload', JSON.stringify(payload));

      expect(res.status).toBe(200);
      expect(res.body.isOwner).toBe(true);
      expect(res.body.role).toBe('OWNER');
      expect(res.body.permissions).toBeDefined();
    });

    it('returns 400 when URL brandId does not match the signed payload (confused deputy guard)', async () => {
      prisma.brand.findFirst.mockResolvedValue({ id: 'brand-2', ownerId: 'user-1' });

      const payload = {
        brandId: 'brand-1', // signed for brand-1
        userId: 'user-1',
        timestamp: Date.now(),
        nonce: `nonce-${Math.random()}`
      };
      const signature = signPayload(payload, CLIENT_SECRET);

      const res = await request(app)
        .get('/api/integrations/brand/brand-2/user-permissions') // but URL asks for brand-2
        .query({ publicastUserId: 'user-1' })
        .set('X-Client-Id', CLIENT_ID)
        .set('X-Signature', signature)
        .set('X-Payload', JSON.stringify(payload));

      expect(res.status).toBe(400);
    });

    it('returns 403 when user has no active membership in the brand', async () => {
      prisma.brand.findFirst.mockResolvedValue({ id: 'brand-1', ownerId: 'someone-else' });
      prisma.team.findUnique.mockResolvedValue(null);

      const payload = {
        brandId: 'brand-1',
        userId: 'user-1',
        timestamp: Date.now(),
        nonce: `nonce-${Math.random()}`
      };
      const signature = signPayload(payload, CLIENT_SECRET);

      const res = await request(app)
        .get('/api/integrations/brand/brand-1/user-permissions')
        .query({ publicastUserId: 'user-1' })
        .set('X-Client-Id', CLIENT_ID)
        .set('X-Signature', signature)
        .set('X-Payload', JSON.stringify(payload));

      expect(res.status).toBe(403);
    });
  });
});
