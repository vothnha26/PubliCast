/**
 * Pure functions cho quyết định "row nào cần retry, khi nào chuyển FAILED".
 * Không I/O, không phụ thuộc Prisma/BullMQ — dùng chung được ở dispatcher thật
 * và ở unit test (theo đúng khuôn mẫu policy-evaluators.js).
 */
const { OUTBOX_DISPATCHER_CONFIG } = require('../../constants/outbox.constants');

function computeNextRunAt(attempts, now = new Date(), config = OUTBOX_DISPATCHER_CONFIG) {
  const delay = Math.min(
    config.BACKOFF_BASE_MS * Math.pow(config.BACKOFF_FACTOR, attempts - 1),
    config.BACKOFF_MAX_MS
  );
  return new Date(now.getTime() + delay);
}

function isExhausted(attempts, maxAttempts) {
  return attempts >= maxAttempts;
}

function decideRetryOutcome(row, error, now = new Date()) {
  const attempts = row.attempts + 1;
  if (isExhausted(attempts, row.maxAttempts)) {
    return { outcome: 'DEAD_LETTER', attempts, lastError: error.message };
  }
  return { outcome: 'RETRY', attempts, nextRunAt: computeNextRunAt(attempts, now), lastError: error.message };
}

module.exports = { computeNextRunAt, isExhausted, decideRetryOutcome };
