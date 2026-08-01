/**
 * Regression tests for #100:
 * - Facebook/Instagram comment webhooks must reconcile a child comment whose
 *   parent hadn't been ingested yet (out-of-order webhook delivery) once the
 *   parent's own webhook lands, instead of dropping the thread link forever.
 * - Instagram comments must use the real webhook timestamp, not ingest time.
 * - Instagram 'remove' events must be deduped like any other event.
 */

const mockExecuteAutoReply = jest.fn().mockResolvedValue(null);
jest.mock('../../src/services/social/inbox/strategies/auto-reply/auto-reply.service', () => ({
  executeAutoReply: mockExecuteAutoReply
}));

const mockUpsert = jest.fn().mockResolvedValue({ id: 'db-item-1' });
const mockFindByPlatformId = jest.fn().mockResolvedValue(null);
const mockReconcile = jest.fn().mockResolvedValue({ count: 0 });
const mockDeleteInboxItem = jest.fn().mockResolvedValue(undefined);
jest.mock('../../src/repositories/social/inbox.repository', () => ({
  upsertInboxItem: mockUpsert,
  findInboxItemByPlatformId: mockFindByPlatformId,
  deleteInboxItem: mockDeleteInboxItem,
  reconcilePendingChildren: mockReconcile
}));



const FacebookFeedStrategy = require('../../src/services/social/facebook/webhooks/facebook-feed.strategy');
const InstagramCommentsStrategy = require('../../src/services/social/facebook/webhooks/instagram-comments.strategy');

const PAGE_ID = 'page-123';
const IG_ACCOUNT_ID = 'ig-acc-123';

function buildFbStrategy() {
  const strategy = new FacebookFeedStrategy();
  strategy.isDuplicateEvent = jest.fn().mockResolvedValue(false);
  strategy.getAccount = jest.fn().mockResolvedValue({ id: 'acc-1', brandId: 'brand-1' });
  strategy.getInbox = jest.fn().mockResolvedValue({ id: 'inbox-1' });
  strategy.notifyClient = jest.fn();
  return strategy;
}

function buildIgStrategy() {
  const strategy = new InstagramCommentsStrategy();
  strategy.isDuplicateEvent = jest.fn().mockResolvedValue(false);
  strategy.getAccount = jest.fn().mockResolvedValue({ id: 'acc-ig-1', brandId: 'brand-1' });
  strategy.getInbox = jest.fn().mockResolvedValue({ id: 'inbox-1' });
  strategy.notifyClient = jest.fn();
  return strategy;
}

describe('Facebook feed threading reconciliation (#100)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('stores pendingParentPlatformId when the parent has not been ingested yet', async () => {
    mockFindByPlatformId.mockResolvedValueOnce(null); // parent not found
    const strategy = buildFbStrategy();
    await strategy.handle({ id: PAGE_ID }, {
      value: {
        item: 'comment', verb: 'add', comment_id: 'child-1', post_id: 'p-1',
        parent_id: 'parent-not-arrived-yet', message: 'reply text',
        from: { id: 'customer-1', name: 'Customer' }
      }
    });

    const createArg = mockUpsert.mock.calls[0][2];
    expect(createArg.pendingParentPlatformId).toBe('parent-not-arrived-yet');
    expect(createArg.parentItemId).toBeUndefined();
  });

  test('reconciles pending children after the parent comment is saved', async () => {
    const strategy = buildFbStrategy();
    await strategy.handle({ id: PAGE_ID }, {
      value: {
        item: 'comment', verb: 'add', comment_id: 'now-arrived-parent', post_id: 'p-1',
        message: 'original comment', from: { id: 'customer-1', name: 'Customer' }
      }
    });

    expect(mockReconcile).toHaveBeenCalledWith('now-arrived-parent', 'db-item-1');
  });
});

describe('Instagram comments webhook robustness (#100)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('uses the real webhook created_time instead of ingest time', async () => {
    const strategy = buildIgStrategy();
    const webhookTimeEpochSec = 1700000000;
    await strategy.handle({ id: IG_ACCOUNT_ID }, {
      value: {
        id: 'ig-comment-1', text: 'hello', verb: 'add',
        from: { id: 'customer-1', username: 'cust' },
        media: { id: 'media-1' },
        created_time: webhookTimeEpochSec
      }
    });

    const createArg = mockUpsert.mock.calls[0][2];
    expect(createArg.platformCreatedAt).toEqual(new Date(webhookTimeEpochSec * 1000));
  });

  test('falls back to now() only when created_time is absent', async () => {
    const strategy = buildIgStrategy();
    const before = Date.now();
    await strategy.handle({ id: IG_ACCOUNT_ID }, {
      value: {
        id: 'ig-comment-2', text: 'hello', verb: 'add',
        from: { id: 'customer-1', username: 'cust' },
        media: { id: 'media-1' }
      }
    });
    const createArg = mockUpsert.mock.calls[0][2];
    expect(createArg.platformCreatedAt.getTime()).toBeGreaterThanOrEqual(before);
  });

  test('stores pendingParentPlatformId when the IG parent has not been ingested yet', async () => {
    mockFindByPlatformId.mockResolvedValueOnce(null);
    const strategy = buildIgStrategy();
    await strategy.handle({ id: IG_ACCOUNT_ID }, {
      value: {
        id: 'ig-child-1', text: 'reply', verb: 'add',
        from: { id: 'customer-1', username: 'cust' },
        media: { id: 'media-1' },
        parent_id: 'ig-parent-not-arrived'
      }
    });
    const createArg = mockUpsert.mock.calls[0][2];
    expect(createArg.pendingParentPlatformId).toBe('ig-parent-not-arrived');
  });

  test('dedupes remove events using a distinct key from add/edit events', async () => {
    const strategy = buildIgStrategy();
    mockFindByPlatformId.mockResolvedValueOnce({ id: 'db-item-x' });

    await strategy.handle({ id: IG_ACCOUNT_ID }, {
      value: { id: 'ig-comment-3', verb: 'remove' }
    });

    expect(strategy.isDuplicateEvent).toHaveBeenCalledWith('remove:ig-comment-3');
  });

  test('a duplicate remove event does not re-broadcast inbox_item_deleted', async () => {
    const strategy = buildIgStrategy();
    strategy.isDuplicateEvent = jest.fn().mockResolvedValue(true); // already processed

    await strategy.handle({ id: IG_ACCOUNT_ID }, {
      value: { id: 'ig-comment-4', verb: 'remove' }
    });

    expect(mockDeleteInboxItem).not.toHaveBeenCalled();
    expect(strategy.notifyClient).not.toHaveBeenCalled();
  });
});
