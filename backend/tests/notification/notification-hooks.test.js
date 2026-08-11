const UpdatePostStatusStep = require('../../src/services/workspace/post/publish-steps/update-db.step');
const postRepository = require('../../src/repositories/workspace/post.repository');
const autoListRepository = require('../../src/repositories/workspace/auto-list.repository');
const notificationService = require('../../src/services/core/notification.service');
const socialService = require('../../src/services/social/social.service');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');
const { POST_STATUS, NOTIFICATION_TYPES, PLATFORMS } = require('../../src/utils/constants');

jest.mock('../../src/repositories/workspace/post.repository', () => ({
  update: jest.fn(),
  create: jest.fn()
}));

jest.mock('../../src/repositories/workspace/auto-list.repository', () => ({
  findById: jest.fn()
}));

jest.mock('../../src/services/core/notification.service', () => ({
  create: jest.fn(),
  notifyBrandMembers: jest.fn()
}));

jest.mock('../../src/services/social/social-platform.factory', () => ({
  getService: jest.fn(),
  isSupported: jest.fn().mockReturnValue(true)
}));

const socialPlatformFactory = require('../../src/services/social/social-platform.factory');

jest.mock('../../src/repositories/social/social-account.repository', () => ({
  findByBrandAndPlatform: jest.fn(),
  findByBrandAndPlatformFirst: jest.fn().mockResolvedValue(null),
  deleteManyByBrandAndPlatform: jest.fn()
}));

jest.mock('../../src/services/social/google-drive.service', () => ({
  listVideos: jest.fn(),
  downloadFile: jest.fn()
}));

jest.mock('../../src/config/prisma', () => ({
  brand: { findUnique: jest.fn().mockResolvedValue({ name: 'Acme' }) }
}));

describe('Notification integration hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('post publish pipeline', () => {
    it('creates a content notification when publishing succeeds', async () => {
      const step = new UpdatePostStatusStep();
      const post = {
        id: 'post-1',
        title: 'Launch video',
        brandId: 'brand-1',
        createdByUserId: 'user-1',
        autoListId: null
      };

      postRepository.update.mockResolvedValue({});
      notificationService.create.mockResolvedValue({});

      await step.execute({
        post,
        results: [
          {
            platform: 'YouTube',
            success: true,
            result: {
              platformVideoId: 'yt-1',
              publishedAt: new Date('2026-05-30T10:00:00Z')
            }
          }
        ]
      });

      expect(postRepository.update).toHaveBeenCalledWith('post-1', expect.objectContaining({
        status: POST_STATUS.PUBLISHED,
        platformPostId: '{"YouTube":{"null":"yt-1"}}'
      }));
      expect(notificationService.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user-1',
        brandId: 'brand-1',
        type: NOTIFICATION_TYPES.CONTENT,
        title: 'Post published successfully',
        actionUrl: '/planner'
      }));
    });

    it('creates a content notification when publishing fails', async () => {
      const step = new UpdatePostStatusStep();
      const post = {
        id: 'post-2',
        title: 'Failed video',
        brandId: 'brand-1',
        createdByUserId: 'user-1',
        autoListId: null
      };

      postRepository.update.mockResolvedValue({});
      notificationService.create.mockResolvedValue({});

      await expect(step.execute({
        post,
        results: [
          { platform: 'TikTok', success: false, error: 'Token expired' }
        ]
      })).rejects.toThrow();

      expect(postRepository.update).toHaveBeenCalledWith('post-2', expect.objectContaining({
        status: POST_STATUS.RETRYING,
        failureReason: 'TikTok: Token expired'
      }));
      expect(notificationService.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user-1',
        brandId: 'brand-1',
        type: NOTIFICATION_TYPES.CONTENT,
        title: 'Post publishing failed',
        actionUrl: '/planner'
      }));
    });
  });

  describe('social connection', () => {
    it('creates a platform notification when disconnecting an account', async () => {
      socialAccountRepository.deleteManyByBrandAndPlatform.mockResolvedValue({ count: 1 });
      notificationService.notifyBrandMembers.mockResolvedValue({});

      await socialService.disconnectAccount('brand-1', PLATFORMS.YOUTUBE);

      expect(socialAccountRepository.deleteManyByBrandAndPlatform).toHaveBeenCalledWith('brand-1', PLATFORMS.YOUTUBE);
      expect(notificationService.notifyBrandMembers).toHaveBeenCalledWith('brand-1', expect.objectContaining({
        type: NOTIFICATION_TYPES.PLATFORM,
        title: `${PLATFORMS.YOUTUBE} disconnected`,
        actionUrl: '/manage/connections'
      }), 'notifyChannelDisconnect', expect.objectContaining({
        template: 'channelDisconnected',
        templateData: expect.objectContaining({ platform: PLATFORMS.YOUTUBE })
      }));
    });

    // "creates a platform notification when social metric sync fails" was
    // removed — it tested getAggregatedMetrics firing a background sync +
    // failure notification, a behavior intentionally deleted when
    // dashboard-load-sync was removed (getAggregatedMetrics is now a pure
    // DB read; the cron scheduler and initial connect are the only sync
    // sources, and sync-cache.proxy.js's Observer — see
    // social.subscriber.js's handleMetricsSyncFailed — is what fires this
    // notification today, not getAggregatedMetrics).
  });
});
