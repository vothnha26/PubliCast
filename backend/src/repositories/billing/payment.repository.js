const prisma = require('../../config/prisma');

/**
 * PaymentRepository
 * SRP: Only responsible for DB operations on PendingPayment and Invoice
 */
class PaymentRepository {
  // ─── PendingPayment ──────────────────────────────────────────────

  async createPending({ transactionCode, planId, addonId, brandId, amount, currency, expiredAt }) {
    return prisma.pendingPayment.create({
      data: { transactionCode, planId, addonId, brandId, amount, currency, expiredAt, status: 'PENDING' }
    });
  }

  async findPendingByCode(transactionCode) {
    return prisma.pendingPayment.findUnique({
      where: { transactionCode },
      include: { 
        plan: { include: { planLimit: true } },
        addon: true
      }
    });
  }

  async findPendingByWebhookContent(content) {
    if (!content) return null;
    const normalizedContent = content.toUpperCase().replace(/\s+/g, '');
    
    const pendings = await prisma.pendingPayment.findMany({
      where: { status: 'PENDING' },
      include: { 
        plan: { include: { planLimit: true } },
        addon: true
      }
    });

    return pendings.find(p => {
      const strippedCode = p.transactionCode.replace(/-/g, '').toUpperCase();
      return normalizedContent.includes(strippedCode);
    }) || null;
  }

  /**
   * @param {import('@prisma/client').Prisma.TransactionClient} [client] - pass a
   *   transaction client (`tx`) to run this write as part of a larger atomic
   *   operation; defaults to the global prisma client otherwise.
   */
  async updatePendingStatus(transactionCode, status, client = prisma) {
    return client.pendingPayment.update({
      where: { transactionCode },
      data: { status, resolvedAt: new Date() }
    });
  }

  /**
   * Atomically claim a PENDING payment for processing (compare-and-swap).
   * Only the caller that flips PENDING -> PROCESSING (count === 1) may proceed;
   * concurrent SePay webhook retries see count === 0 and must bail out. This
   * closes the check-then-act race that allowed double activation (#101).
   * @returns {Promise<boolean>} true if this caller won the claim.
   */
  async claimPendingForProcessing(transactionCode) {
    const result = await prisma.pendingPayment.updateMany({
      where: { transactionCode, status: 'PENDING' },
      data: { status: 'PROCESSING' }
    });
    return result.count === 1;
  }

  /**
   * Release a claimed payment back to PENDING so a later webhook retry can
   * reprocess it (used when activation fails after the claim was taken).
   */
  async releasePendingClaim(transactionCode) {
    return prisma.pendingPayment.updateMany({
      where: { transactionCode, status: 'PROCESSING' },
      data: { status: 'PENDING' }
    });
  }

  async expireStalePayments() {
    return prisma.pendingPayment.updateMany({
      where: { status: 'PENDING', expiredAt: { lt: new Date() } },
      data: { status: 'EXPIRED' }
    });
  }

  async findHistoryByBrandId(brandId) {
    return prisma.pendingPayment.findMany({
      where: { brandId },
      orderBy: { createdAt: 'desc' },
      include: {
        plan: true,
        addon: true
      }
    });
  }

  /**
   * @param {import('@prisma/client').Prisma.TransactionClient} [client] - see
   *   updatePendingStatus.
   */
  async createInvoice({ subscriptionId, amount, currency, transactionCode }, client = prisma) {
    return client.invoice.create({
      data: {
        subscriptionId,
        amount,
        currency,
        status: 'PAID',
        pdfUrl: '',
        issuedAt: new Date(),
        paidAt: new Date(),
        dueAt: new Date(),
        // Store transaction reference in pdfUrl field temporarily
        // or add a referenceCode field via migration
      }
    });
  }
}

module.exports = new PaymentRepository();
