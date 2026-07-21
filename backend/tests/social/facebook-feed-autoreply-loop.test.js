/**
 * Regression test for issue #98: the Facebook feed webhook must recognize
 * comments the page itself posted (its own auto-replies) and NOT auto-reply to
 * them, otherwise it loops infinitely. The author id lives in value.from.id.
 */

// Mock every external dependency the strategy touches so we can assert purely
// on the auto-reply decision.
const mockExecuteAutoReply = jest.fn().mockResolvedValue(null);
jest.mock('../../src/services/social/inbox/strategies/auto-reply/auto-reply.service', () => ({
  executeAutoReply: mockExecuteAutoReply
}));

const mockUpsert = jest.fn().mockResolvedValue({ id: 'db-item-1' });
jest.mock('../../src/repositories/social/inbox.repository', () => ({
  upsertInboxItem: mockUpsert,
  findInboxItemByPlatformId: jest.fn().mockResolvedValue(null),
  deleteInboxItem: jest.fn().mockResolvedValue(undefined)
}));

// Silence prisma livestream lookup (no active livestream).
jest.mock('../../src/config/prisma', () => ({
  livestream: { findFirst: jest.fn().mockResolvedValue(null) }
}));

const FacebookFeedStrategy = require('../../src/services/social/facebook/webhooks/facebook-feed.strategy');

const PAGE_ID = 'page-123';

function buildStrategy() {
  const strategy = new FacebookFeedStrategy();
  // Stub base-class helpers that hit Redis / DB / sockets.
  strategy.isDuplicateEvent = jest.fn().mockResolvedValue(false);
  strategy.getAccount = jest.fn().mockResolvedValue({ id: 'acc-1', brandId: 'brand-1' });
  strategy.getInbox = jest.fn().mockResolvedValue({ id: 'inbox-1' });
  strategy.notifyClient = jest.fn();
  return strategy;
}

function feedChange(fromId) {
  return {
    value: {
      item: 'comment',
      verb: 'add',
      comment_id: 'c-1',
      post_id: 'p-1',
      message: 'hello',
      from: { id: fromId, name: 'Someone' }
    }
  };
}

describe('FacebookFeedStrategy auto-reply loop guard (#98)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('does NOT auto-reply to a comment the page itself posted', async () => {
    const strategy = buildStrategy();
    await strategy.handle({ id: PAGE_ID }, feedChange(PAGE_ID));
    expect(mockExecuteAutoReply).not.toHaveBeenCalled();
  });

  test('DOES auto-reply to a genuine customer comment', async () => {
    const strategy = buildStrategy();
    await strategy.handle({ id: PAGE_ID }, feedChange('customer-999'));
    expect(mockExecuteAutoReply).toHaveBeenCalledTimes(1);
  });
});
