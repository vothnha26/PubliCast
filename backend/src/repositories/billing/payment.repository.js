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

  async updatePendingStatus(transactionCode, status) {
    return prisma.pendingPayment.update({
      where: { transactionCode },
      data: { status, resolvedAt: new Date() }
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

  async createInvoice({ subscriptionId, amount, currency, transactionCode }) {
    return prisma.invoice.create({
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
