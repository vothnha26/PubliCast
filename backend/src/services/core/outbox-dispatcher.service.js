const prisma = require('../../config/prisma');
const logger = require('../../utils/logger');
const outboxEventRepository = require('../../repositories/core/outbox-event.repository');
const { OUTBOX_HANDLERS } = require('./outbox-handlers');
const { decideRetryOutcome } = require('./outbox-retry-policy');
const { OUTBOX_DISPATCHER_CONFIG } = require('../../constants/outbox.constants');

/**
 * Outbox Dispatcher — poll bảng outbox_events định kỳ (self-scheduling setTimeout,
 * KHÔNG setInterval trần để tránh chồng lấp nếu 1 lượt xử lý chạy lâu hơn interval),
 * thực thi side-effect qua OUTBOX_HANDLERS, retry có backoff, dead-letter khi hết
 * maxAttempts.
 */
class OutboxDispatcherService {
  constructor() {
    this._timer = null;
  }

  /** Bắt đầu polling, chạy ngay lượt đầu tiên. */
  start() {
    this._scheduleNext(0);
  }

  /** Dừng polling — an toàn gọi nhiều lần / khi chưa start. */
  stop() {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  _scheduleNext(delayMs) {
    this._timer = setTimeout(async () => {
      try {
        await this.runOnce();
      } catch (err) {
        logger.error('[OutboxDispatcher] runOnce failed', err);
      } finally {
        this._scheduleNext(OUTBOX_DISPATCHER_CONFIG.POLL_INTERVAL_MS);
      }
    }, delayMs);
  }

  /** Xử lý 1 batch outbox event đến hạn. Public để test/verify tay dễ dàng. */
  async runOnce() {
    const rows = await prisma.$transaction((tx) =>
      outboxEventRepository.claimBatch(OUTBOX_DISPATCHER_CONFIG.BATCH_SIZE, tx)
    );

    for (const row of rows) {
      await this._processRow(row);
    }

    return { processed: rows.length };
  }

  /** Xử lý 1 row — bọc try/catch riêng để 1 row lỗi không làm hỏng cả batch. */
  async _processRow(row) {
    const handler = OUTBOX_HANDLERS[row.eventType];
    try {
      if (!handler) throw new Error(`No outbox handler registered for eventType=${row.eventType}`);
      await handler(JSON.parse(row.payload));
      await outboxEventRepository.markCompleted(row.id);
    } catch (err) {
      const { outcome, attempts, nextRunAt, lastError } = decideRetryOutcome(row, err);
      if (outcome === 'DEAD_LETTER') {
        await outboxEventRepository.markDeadLetter(row.id, attempts, lastError);
        logger.error(`[OutboxDispatcher] Event ${row.id} (${row.eventType}) moved to FAILED after ${attempts} attempts`, err);
      } else {
        await outboxEventRepository.markFailedRetry(row.id, nextRunAt, attempts, lastError);
      }
    }
  }
}

module.exports = new OutboxDispatcherService();
