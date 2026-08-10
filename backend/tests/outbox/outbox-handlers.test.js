jest.mock('../../src/services/workspace/post/publish-qstash.service', () => ({
  upsertPublishJob: jest.fn().mockResolvedValue(true),
  removePublishJob: jest.fn().mockResolvedValue(true),
  enqueueImmediate: jest.fn().mockResolvedValue('msg-mock')
}));

jest.mock('../../src/config/qstash', () => ({
  qstashClient: {
    publishJSON: jest.fn().mockResolvedValue({ messageId: 'mock-message-id' })
  }
}));

jest.mock('../../src/events/subscribers/post.subscriber', () => {
  const fn = jest.fn(() => {});
  fn.POST_DOMAIN_EVENT_HANDLERS = {
    'post.created': jest.fn().mockResolvedValue(undefined)
  };
  return fn;
});

jest.mock('../../src/services/workspace/brand.service', () => ({
  createDefaultBrand: jest.fn().mockResolvedValue({ id: 'brand-default' })
}));

jest.mock('../../src/services/core/email.service', () => ({
  sendOTP: jest.fn().mockResolvedValue(true),
  sendNotificationEmail: jest.fn().mockResolvedValue(true)
}));

jest.mock('../../src/repositories/auth/user.repository', () => ({
  findById: jest.fn()
}));

const { upsertPublishJob, removePublishJob } = require('../../src/services/workspace/post/publish-qstash.service');
const { qstashClient } = require('../../src/config/qstash');
const initPostSubscribers = require('../../src/events/subscribers/post.subscriber');
const brandService = require('../../src/services/workspace/brand.service');
const emailService = require('../../src/services/core/email.service');
const userRepository = require('../../src/repositories/auth/user.repository');
const { OUTBOX_HANDLERS } = require('../../src/services/core/outbox-handlers');
const { OUTBOX_EVENT_TYPES } = require('../../src/constants/outbox.constants');

describe('OUTBOX_HANDLERS', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST_PUBLISH_UPSERT calls upsertPublishJob with the payload', async () => {
    const scheduledAt = new Date();
    await OUTBOX_HANDLERS[OUTBOX_EVENT_TYPES.POST_PUBLISH_UPSERT]({ postId: 'post-1', scheduledAt });
    expect(upsertPublishJob).toHaveBeenCalledWith('post-1', scheduledAt);
  });

  it('POST_PUBLISH_REMOVE calls removePublishJob with the payload', async () => {
    await OUTBOX_HANDLERS[OUTBOX_EVENT_TYPES.POST_PUBLISH_REMOVE]({ postId: 'post-1' });
    expect(removePublishJob).toHaveBeenCalledWith('post-1');
  });

  it('POST_DOMAIN_EVENT calls the matching handler directly (not via eventEmitter)', async () => {
    const eventArgs = { post: { id: 'post-1' } };
    await OUTBOX_HANDLERS[OUTBOX_EVENT_TYPES.POST_DOMAIN_EVENT]({ eventName: 'post.created', eventArgs });
    expect(initPostSubscribers.POST_DOMAIN_EVENT_HANDLERS['post.created']).toHaveBeenCalledWith(eventArgs);
  });

  it('POST_DOMAIN_EVENT throws (for dispatcher retry) when eventName has no registered handler', async () => {
    await expect(
      OUTBOX_HANDLERS[OUTBOX_EVENT_TYPES.POST_DOMAIN_EVENT]({ eventName: 'unknown.event', eventArgs: {} })
    ).rejects.toThrow('No POST_DOMAIN_EVENT handler registered for eventName=unknown.event');
  });

  describe('USER_DEFAULT_BRAND_CREATE (#108 I10)', () => {
    it('calls brandService.createDefaultBrand with the payload userId', async () => {
      await OUTBOX_HANDLERS[OUTBOX_EVENT_TYPES.USER_DEFAULT_BRAND_CREATE]({ userId: 'user-1' });
      expect(brandService.createDefaultBrand).toHaveBeenCalledWith('user-1');
    });
  });

  describe('USER_SEND_WELCOME_OTP (#108 I10)', () => {
    it('calls emailService.sendOTP with the payload email and otp', async () => {
      await OUTBOX_HANDLERS[OUTBOX_EVENT_TYPES.USER_SEND_WELCOME_OTP]({ email: 'a@b.com', otp: '123456' });
      expect(emailService.sendOTP).toHaveBeenCalledWith('a@b.com', '123456');
    });
  });

  describe('NOTIFICATION_EMAIL', () => {
    it('looks up the user fresh and sends the notification email to their address', async () => {
      userRepository.findById.mockResolvedValue({ id: 'user-1', email: 'user1@example.com' });

      await OUTBOX_HANDLERS[OUTBOX_EVENT_TYPES.NOTIFICATION_EMAIL]({
        userId: 'user-1',
        title: 'Post failed',
        message: 'Your post failed to publish',
        actionUrl: 'http://localhost:5173/planner'
      });

      expect(userRepository.findById).toHaveBeenCalledWith('user-1');
      expect(emailService.sendNotificationEmail).toHaveBeenCalledWith(
        'user1@example.com', 'Post failed', 'Your post failed to publish', 'http://localhost:5173/planner'
      );
    });

    it('no-ops without throwing when the user no longer exists (deleted between enqueue and dispatch)', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(
        OUTBOX_HANDLERS[OUTBOX_EVENT_TYPES.NOTIFICATION_EMAIL]({ userId: 'deleted-user', title: 't', message: 'm' })
      ).resolves.toBeUndefined();

      expect(emailService.sendNotificationEmail).not.toHaveBeenCalled();
    });
  });

  describe('SOCIAL_SYNC_ENQUEUE', () => {
    it('publishes to the QStash social-sync webhook with a deduplicationId derived from socialAccountId', async () => {
      await OUTBOX_HANDLERS[OUTBOX_EVENT_TYPES.SOCIAL_SYNC_ENQUEUE]({
        socialAccountId: 'sa-1',
        platform: 'FACEBOOK',
        brandId: 'brand-1'
      });

      expect(qstashClient.publishJSON).toHaveBeenCalledWith(
        expect.objectContaining({
          body: { socialAccountId: 'sa-1', platform: 'FACEBOOK', brandId: 'brand-1' },
          deduplicationId: 'social-sync-sa-1'
        })
      );
    });

    it('produces the same deduplicationId for repeated calls with the same socialAccountId (idempotent)', async () => {
      await OUTBOX_HANDLERS[OUTBOX_EVENT_TYPES.SOCIAL_SYNC_ENQUEUE]({ socialAccountId: 'sa-2', platform: 'YOUTUBE', brandId: 'brand-1' });
      await OUTBOX_HANDLERS[OUTBOX_EVENT_TYPES.SOCIAL_SYNC_ENQUEUE]({ socialAccountId: 'sa-2', platform: 'YOUTUBE', brandId: 'brand-1' });

      const dedupIds = qstashClient.publishJSON.mock.calls.map(call => call[0].deduplicationId);
      expect(dedupIds).toEqual(['social-sync-sa-2', 'social-sync-sa-2']);
    });
  });
});
