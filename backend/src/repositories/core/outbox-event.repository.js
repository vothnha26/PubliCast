const prisma = require('../../config/prisma');
const { OUTBOX_EVENT_STATUS, OUTBOX_DISPATCHER_CONFIG } = require('../../constants/outbox.constants');

class OutboxEventRepository {
  /** Ghi 1 outbox event mới, status=PENDING. Nhận tx optional để ghi trong transaction đang mở. */
  async create(eventType, aggregateId, payload, options = {}, tx = prisma) {
    return tx.outboxEvent.create({
      data: {
        eventType,
        aggregateId,
        payload: JSON.stringify(payload),
        maxAttempts: options.maxAttempts ?? OUTBOX_DISPATCHER_CONFIG.DEFAULT_MAX_ATTEMPTS
      }
    });
  }

  /**
   * Lấy 1 batch outbox event đến hạn xử lý và khóa chúng an toàn cho nhiều dispatcher
   * instance chạy song song (FOR UPDATE SKIP LOCKED), rồi chuyển sang PROCESSING trong
   * cùng transaction. Phải được gọi bên trong prisma.$transaction(tx => ...).
   */
  async claimBatch(limit, tx) {
    const rows = await tx.$queryRaw`
      SELECT id FROM outbox_events
      WHERE status = ${OUTBOX_EVENT_STATUS.PENDING} AND nextRunAt <= NOW()
      ORDER BY nextRunAt ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    `;

    const ids = rows.map(r => r.id);
    if (ids.length === 0) return [];

    await tx.outboxEvent.updateMany({
      where: { id: { in: ids } },
      data: { status: OUTBOX_EVENT_STATUS.PROCESSING }
    });

    return tx.outboxEvent.findMany({ where: { id: { in: ids } } });
  }

  async markCompleted(id, tx = prisma) {
    return tx.outboxEvent.update({
      where: { id },
      data: { status: OUTBOX_EVENT_STATUS.COMPLETED, processedAt: new Date() }
    });
  }

  /** Quay lại PENDING để lượt poll sau nhặt lại — KHÔNG giữ ở PROCESSING. */
  async markFailedRetry(id, nextRunAt, attempts, lastError, tx = prisma) {
    return tx.outboxEvent.update({
      where: { id },
      data: { status: OUTBOX_EVENT_STATUS.PENDING, attempts, nextRunAt, lastError }
    });
  }

  async markDeadLetter(id, attempts, lastError, tx = prisma) {
    return tx.outboxEvent.update({
      where: { id },
      data: { status: OUTBOX_EVENT_STATUS.FAILED, attempts, lastError, processedAt: new Date() }
    });
  }
}

module.exports = new OutboxEventRepository();
