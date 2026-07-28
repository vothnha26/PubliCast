process.env.DATABASE_URL = process.env.DATABASE_URL || 'mysql://user:pass@localhost:3306/test';
process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'test-access-secret-minimum-32-chars';
process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'test-refresh-secret-minimum-32-chars';
process.env.CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'test-cloud';
process.env.CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || 'test-api-key';
process.env.CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || 'test-api-secret';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'test-encryption-key-minimum-32-chars';
const request = require('supertest');

let mockCurrentUser = { id: 'user-1', role: 'USER' };

jest.mock('../../src/config/redis', () => ({
  on: jest.fn(),
  connect: jest.fn(),
  isOpen: true
}));

jest.mock('../../src/events/subscribers/post.subscriber', () => jest.fn(() => jest.fn()));
jest.mock('../../src/events/subscribers/autolist.subscriber', () => jest.fn(() => jest.fn()));
jest.mock('../../src/queues/dashboard', () => ({
  getRouter: jest.fn(() => (req, res) => res.status(200).end())
}));

jest.mock('googleapis', () => ({ google: {} }), { virtual: true });

jest.mock('../../src/routes/auth/auth.routes', () => {
  const express = require('express');
  return express.Router();
});
jest.mock('../../src/routes/auth/profile.routes', () => {
  const express = require('express');
  return express.Router();
});
jest.mock('../../src/routes/admin/pricing.routes', () => {
  const express = require('express');
  return express.Router();
});
jest.mock('../../src/routes/admin/audit-log.routes', () => {
  const express = require('express');
  return express.Router();
});
jest.mock('../../src/routes/admin/revenue.routes', () => {
  const express = require('express');
  return express.Router();
});
jest.mock('../../src/routes/admin/product.routes', () => {
  const express = require('express');
  return express.Router();
});
jest.mock('../../src/routes/social/social.routes', () => {
  const express = require('express');
  return express.Router();
});
jest.mock('../../src/routes/social/inbox.routes', () => {
  const express = require('express');
  return express.Router();
});
jest.mock('../../src/routes/workspace/livestream.routes', () => {
  const express = require('express');
  return express.Router();
});
jest.mock('../../src/routes/workspace/post.routes', () => {
  const express = require('express');
  return express.Router();
});
jest.mock('../../src/routes/workspace/media-library.routes', () => {
  const express = require('express');
  return express.Router();
});
jest.mock('../../src/routes/workspace/media-folder.routes', () => {
  const express = require('express');
  return express.Router();
});
jest.mock('../../src/routes/workspace/team.routes', () => {
  const express = require('express');
  return express.Router();
});
jest.mock('../../src/routes/workspace/brand.routes', () => {
  const express = require('express');
  return express.Router();
});
jest.mock('../../src/routes/workspace/auto-list.routes', () => {
  const express = require('express');
  return express.Router();
});
jest.mock('../../src/routes/admin/platform-limit.routes', () => {
  const express = require('express');
  return express.Router();
});
jest.mock('../../src/routes/workspace/role.routes', () => {
  const express = require('express');
  return express.Router();
});
jest.mock('../../src/routes/workspace/smart-link.routes', () => {
  const express = require('express');
  return express.Router();
});
jest.mock('../../src/routes/workspace/permission.routes', () => {
  const express = require('express');
  return express.Router();
});
jest.mock('../../src/routes/workspace/approval-workflow.routes', () => {
  const express = require('express');
  return express.Router();
});
jest.mock('../../src/routes/workspace/ai.routes', () => {
  const express = require('express');
  return express.Router();
});
jest.mock('../../src/routes/workspace/report.routes', () => {
  const express = require('express');
  return express.Router();
});
jest.mock('../../src/routes/workspace/hashtag.routes', () => {
  const express = require('express');
  return express.Router();
});
jest.mock('../../src/routes/workspace/ad-account.routes', () => {
  const express = require('express');
  return express.Router();
});
jest.mock('../../src/routes/core/search.routes', () => {
  const express = require('express');
  return express.Router();
});

jest.mock('../../src/utils/jwt.utils', () => ({
  extractToken: jest.fn(() => 'test-token'),
  verifyAccessToken: jest.fn(() => mockCurrentUser)
}));

jest.mock('../../src/services/core/notification.service', () => ({
  getNotifications: jest.fn(),
  create: jest.fn(),
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn()
}));

const notificationService = require('../../src/services/core/notification.service');
const app = require('../../src/app');
const { CSRF_HEADER_NAME } = require('../../src/middlewares/csrf.middleware');

// This suite authenticates via a mocked Bearer token, not cookies, so there's
// no real csrfToken cookie to echo back. enforceCsrfGlobally doesn't
// distinguish auth mechanism though — it just checks the header against the
// cookie — so requests need a cookie+header pair that match each other.
const CSRF_TOKEN = 'test-csrf-token';
const csrfCookieHeader = `csrfToken=${CSRF_TOKEN}`;

describe('Notification Routes Integration', () => {
  beforeEach(() => {
    mockCurrentUser = { id: 'user-1', role: 'USER' };
    jest.clearAllMocks();
  });

  it('GET /api/notifications returns notification list for authenticated user', async () => {
    notificationService.getNotifications.mockResolvedValue({
      data: [],
      meta: {
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
        categoryCounts: { all: 0 }
      }
    });

    const response = await request(app)
      .get('/api/notifications?category=system&isRead=false&page=1&limit=20')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Notifications retrieved successfully');
    expect(notificationService.getNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'system',
        isRead: 'false',
        page: '1',
        limit: '20'
      }),
      'user-1',
      null,
      'USER'
    );
  });

  it('POST /api/notifications allows OWNER to create notification', async () => {
    mockCurrentUser = { id: 'owner-1', role: 'OWNER' };
    notificationService.create.mockResolvedValue({
      id: 'notif-1',
      title: 'Notice'
    });

    const response = await request(app)
      .post('/api/notifications')
      .set('Authorization', 'Bearer token')
      .set('Cookie', csrfCookieHeader)
      .set(CSRF_HEADER_NAME, CSRF_TOKEN)
      .send({
        brandId: 'brand-1',
        title: 'Notice',
        message: 'Brand notice'
      });

    expect(response.status).toBe(201);
    expect(notificationService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        brandId: 'brand-1',
        title: 'Notice',
        message: 'Brand notice'
      }),
      { userId: 'owner-1', role: 'OWNER' }
    );
  });

  it('POST /api/notifications rejects non-owner/admin users', async () => {
    const response = await request(app)
      .post('/api/notifications')
      .set('Authorization', 'Bearer token')
      .set('Cookie', csrfCookieHeader)
      .set(CSRF_HEADER_NAME, CSRF_TOKEN)
      .send({
        title: 'Notice',
        message: 'Not allowed'
      });

    expect(response.status).toBe(403);
    expect(notificationService.create).not.toHaveBeenCalled();
  });

  it('POST /api/notifications/:id/read marks one notification as read', async () => {
    notificationService.markAsRead.mockResolvedValue({ count: 1 });

    const response = await request(app)
      .post('/api/notifications/notif-1/read?brandId=brand-1')
      .set('Authorization', 'Bearer token')
      .set('Cookie', csrfCookieHeader)
      .set(CSRF_HEADER_NAME, CSRF_TOKEN);

    expect(response.status).toBe(200);
    expect(notificationService.markAsRead).toHaveBeenCalledWith('notif-1', 'user-1', 'brand-1', 'USER');
  });

  it('POST /api/notifications/read-all marks visible notifications as read', async () => {
    notificationService.markAllAsRead.mockResolvedValue({ count: 2 });

    const response = await request(app)
      .post('/api/notifications/read-all?brandId=brand-1')
      .set('Authorization', 'Bearer token')
      .set('Cookie', csrfCookieHeader)
      .set(CSRF_HEADER_NAME, CSRF_TOKEN);

    expect(response.status).toBe(200);
    expect(notificationService.markAllAsRead).toHaveBeenCalledWith('user-1', 'brand-1', 'USER');
  });

  it('GET /api/notifications/stream opens an authenticated SSE stream', async () => {
    const response = await request(app)
      .get('/api/notifications/stream?once=true')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/event-stream');
    expect(response.text).toContain('event: notification.connected');
  });
});
