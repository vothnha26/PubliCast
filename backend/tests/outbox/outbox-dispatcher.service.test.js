jest.mock('../../src/repositories/core/outbox-event.repository', () => ({
  claimBatch: jest.fn(),
  markCompleted: jest.fn(),
  markFailedRetry: jest.fn(),
  markDeadLetter: jest.fn()
}));

jest.mock('../../src/services/core/outbox-handlers', () => ({
  OUTBOX_HANDLERS: {
    KNOWN_TYPE: jest.fn()
  }
}));

const outboxEventRepository = require('../../src/repositories/core/outbox-event.repository');
const { OUTBOX_HANDLERS } = require('../../src/services/core/outbox-handlers');
const outboxDispatcherService = require('../../src/services/core/outbox-dispatcher.service');

describe('OutboxDispatcherService._processRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marks the row completed when the handler succeeds', async () => {
    const row = { id: 'row-1', eventType: 'KNOWN_TYPE', payload: JSON.stringify({ foo: 'bar' }), attempts: 0, maxAttempts: 5 };
    OUTBOX_HANDLERS.KNOWN_TYPE.mockResolvedValue(undefined);

    await outboxDispatcherService._processRow(row);

    expect(OUTBOX_HANDLERS.KNOWN_TYPE).toHaveBeenCalledWith({ foo: 'bar' });
    expect(outboxEventRepository.markCompleted).toHaveBeenCalledWith('row-1');
    expect(outboxEventRepository.markFailedRetry).not.toHaveBeenCalled();
    expect(outboxEventRepository.markDeadLetter).not.toHaveBeenCalled();
  });

  it('marks the row for retry with a future nextRunAt when attempts remain', async () => {
    const row = { id: 'row-2', eventType: 'KNOWN_TYPE', payload: '{}', attempts: 1, maxAttempts: 5 };
    OUTBOX_HANDLERS.KNOWN_TYPE.mockRejectedValue(new Error('Redis down'));

    await outboxDispatcherService._processRow(row);

    expect(outboxEventRepository.markFailedRetry).toHaveBeenCalledTimes(1);
    const [id, nextRunAt, attempts, lastError] = outboxEventRepository.markFailedRetry.mock.calls[0];
    expect(id).toBe('row-2');
    expect(attempts).toBe(2);
    expect(lastError).toBe('Redis down');
    expect(nextRunAt.getTime()).toBeGreaterThan(Date.now());
    expect(outboxEventRepository.markDeadLetter).not.toHaveBeenCalled();
    expect(outboxEventRepository.markCompleted).not.toHaveBeenCalled();
  });

  it('marks the row as dead-letter once maxAttempts is exhausted', async () => {
    const row = { id: 'row-3', eventType: 'KNOWN_TYPE', payload: '{}', attempts: 4, maxAttempts: 5 };
    OUTBOX_HANDLERS.KNOWN_TYPE.mockRejectedValue(new Error('Still failing'));

    await outboxDispatcherService._processRow(row);

    expect(outboxEventRepository.markDeadLetter).toHaveBeenCalledWith('row-3', 5, 'Still failing');
    expect(outboxEventRepository.markFailedRetry).not.toHaveBeenCalled();
    expect(outboxEventRepository.markCompleted).not.toHaveBeenCalled();
  });

  it('routes an unregistered eventType through the same retry/dead-letter flow instead of throwing', async () => {
    const row = { id: 'row-4', eventType: 'UNKNOWN_TYPE', payload: '{}', attempts: 0, maxAttempts: 5 };

    await expect(outboxDispatcherService._processRow(row)).resolves.toBeUndefined();

    expect(outboxEventRepository.markFailedRetry).toHaveBeenCalledTimes(1);
    expect(outboxEventRepository.markCompleted).not.toHaveBeenCalled();
  });
});
