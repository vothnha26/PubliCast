jest.mock('../../src/queues/publish.queue', () => ({
  upsertPublishJob: jest.fn().mockResolvedValue(true),
  removePublishJob: jest.fn().mockResolvedValue(true)
}));

jest.mock('../../src/queues/social.queue', () => ({
  socialQueue: {
    add: jest.fn().mockResolvedValue({ id: 'mock-job' }),
    remove: jest.fn().mockResolvedValue(true)
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
  sendOTP: jest.fn().mockResolvedValue(true)
}));

const { upsertPublishJob, removePublishJob } = require('../../src/queues/publish.queue');
const { socialQueue } = require('../../src/queues/social.queue');
const initPostSubscribers = require('../../src/events/subscribers/post.subscriber');
const brandService = require('../../src/services/workspace/brand.service');
const emailService = require('../../src/services/core/email.service');
const { OUTBOX_HANDLERS } = require('../../src/services/core/outbox-handlers');
const { OUTBOX_EVENT_TYPES } = require('../../src/constants/outbox.constants');
const { QUEUE_CONFIG } = require('../../src/constants/video-publish.constants');

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

  describe('SOCIAL_SYNC_ENQUEUE', () => {
    it('removes any existing job before adding, using a jobId derived from socialAccountId', async () => {
      await OUTBOX_HANDLERS[OUTBOX_EVENT_TYPES.SOCIAL_SYNC_ENQUEUE]({
        socialAccountId: 'sa-1',
        platform: 'FACEBOOK',
        brandId: 'brand-1'
      });

      expect(socialQueue.remove).toHaveBeenCalledWith('social-sync-sa-1');
      expect(socialQueue.add).toHaveBeenCalledWith(
        QUEUE_CONFIG.SOCIAL.JOB_SYNC,
        { socialAccountId: 'sa-1', platform: 'FACEBOOK', brandId: 'brand-1' },
        { jobId: 'social-sync-sa-1' }
      );
    });

    it('produces the same jobId for repeated calls with the same socialAccountId (idempotent)', async () => {
      await OUTBOX_HANDLERS[OUTBOX_EVENT_TYPES.SOCIAL_SYNC_ENQUEUE]({ socialAccountId: 'sa-2', platform: 'YOUTUBE', brandId: 'brand-1' });
      await OUTBOX_HANDLERS[OUTBOX_EVENT_TYPES.SOCIAL_SYNC_ENQUEUE]({ socialAccountId: 'sa-2', platform: 'YOUTUBE', brandId: 'brand-1' });

      const jobIds = socialQueue.add.mock.calls.map(call => call[2].jobId);
      expect(jobIds).toEqual(['social-sync-sa-2', 'social-sync-sa-2']);
    });
  });
});
