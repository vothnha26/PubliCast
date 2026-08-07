/**
 * Tests for publish-qstash.service.js — replaces publish.queue.js's BullMQ
 * jobId-based upsert/remove with QStash messageId tracking on Post.
 * postRepository.claimForPublishing()'s atomic DB compare-and-swap (tested
 * separately, inside qstash.controller.test.js) is the actual guard against
 * double-publish; this file only covers the scheduling/cancellation plumbing.
 */
jest.mock('../../src/config/qstash', () => ({
  qstashClient: {
    publishJSON: jest.fn(),
    messages: { cancel: jest.fn() }
  }
}));
jest.mock('../../src/repositories/workspace/post.repository', () => ({
  findById: jest.fn(),
  update: jest.fn()
}));

const { qstashClient } = require('../../src/config/qstash');
const postRepository = require('../../src/repositories/workspace/post.repository');
const { upsertPublishJob, removePublishJob, enqueueImmediate } = require('../../src/services/workspace/post/publish-qstash.service');

describe('publish-qstash.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BACKEND_BASE_URL = 'https://api.example.com';
  });

  describe('upsertPublishJob', () => {
    it('cancels no prior message when the post has never been scheduled', async () => {
      postRepository.findById.mockResolvedValue({ id: 'post-1', qstashMessageId: null });
      qstashClient.publishJSON.mockResolvedValue({ messageId: 'msg-new' });

      await upsertPublishJob('post-1', new Date(Date.now() + 60000));

      expect(qstashClient.messages.cancel).not.toHaveBeenCalled();
      expect(qstashClient.publishJSON).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.example.com/api/webhooks/qstash/publish-post',
          body: { postId: 'post-1' }
        })
      );
      expect(postRepository.update).toHaveBeenCalledWith('post-1', { qstashMessageId: 'msg-new' });
    });

    it('cancels the previously tracked message before publishing a reschedule', async () => {
      postRepository.findById.mockResolvedValue({ id: 'post-1', qstashMessageId: 'msg-old' });
      qstashClient.publishJSON.mockResolvedValue({ messageId: 'msg-new' });

      await upsertPublishJob('post-1', new Date(Date.now() + 60000));

      expect(qstashClient.messages.cancel).toHaveBeenCalledWith('msg-old');
      expect(postRepository.update).toHaveBeenCalledWith('post-1', { qstashMessageId: 'msg-new' });
    });

    it('does not throw when cancelling an already-delivered/unknown message fails', async () => {
      postRepository.findById.mockResolvedValue({ id: 'post-1', qstashMessageId: 'msg-old' });
      qstashClient.messages.cancel.mockRejectedValue(new Error('message not found'));
      qstashClient.publishJSON.mockResolvedValue({ messageId: 'msg-new' });

      await expect(upsertPublishJob('post-1', new Date(Date.now() + 60000))).resolves.toBe('msg-new');
    });

    it('clamps delay to 0 for a scheduledAt already in the past', async () => {
      postRepository.findById.mockResolvedValue({ id: 'post-1', qstashMessageId: null });
      qstashClient.publishJSON.mockResolvedValue({ messageId: 'msg-new' });

      await upsertPublishJob('post-1', new Date(Date.now() - 60000));

      expect(qstashClient.publishJSON).toHaveBeenCalledWith(
        expect.objectContaining({ delay: 0 })
      );
    });
  });

  describe('removePublishJob', () => {
    it('cancels the tracked message and clears qstashMessageId', async () => {
      postRepository.findById.mockResolvedValue({ id: 'post-1', qstashMessageId: 'msg-old' });

      await removePublishJob('post-1');

      expect(qstashClient.messages.cancel).toHaveBeenCalledWith('msg-old');
      expect(postRepository.update).toHaveBeenCalledWith('post-1', { qstashMessageId: null });
    });

    it('is a no-op when the post has no tracked message', async () => {
      postRepository.findById.mockResolvedValue({ id: 'post-1', qstashMessageId: null });

      await removePublishJob('post-1');

      expect(qstashClient.messages.cancel).not.toHaveBeenCalled();
      expect(postRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('enqueueImmediate', () => {
    it('publishes without checking or cancelling any prior message', async () => {
      qstashClient.publishJSON.mockResolvedValue({ messageId: 'msg-retry' });

      const messageId = await enqueueImmediate('post-1', { retryTargets: [{ platform: 'FACEBOOK' }] });

      expect(postRepository.findById).not.toHaveBeenCalled();
      expect(qstashClient.messages.cancel).not.toHaveBeenCalled();
      expect(qstashClient.publishJSON).toHaveBeenCalledWith(
        expect.objectContaining({
          body: { postId: 'post-1', retryTargets: [{ platform: 'FACEBOOK' }] },
          delay: 0
        })
      );
      expect(messageId).toBe('msg-retry');
    });
  });
});
