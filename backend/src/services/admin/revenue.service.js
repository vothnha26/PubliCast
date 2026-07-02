const revenueRepository = require('../../repositories/admin/revenue.repository');
const { BILLING_CYCLES, INVOICE_STATUS, SYSTEM_LABELS } = require('../../utils/constants');

class RevenueService {
  /**
   * Get overall revenue dashboard data
   */
  async getDashboardData() {
    const [activeSubscriptions, recentInvoices] = await Promise.all([
      revenueRepository.getActiveSubscriptionRevenue(),
      revenueRepository.getRecentInvoices(5)
    ]);

    const mrrData = this._calculateMRR(activeSubscriptions);
    const transactions = this._formatTransactions(recentInvoices);
    
    // Tính toán mrrTrend và doanh thu theo gói cước thực tế từ DB
    const paidInvoices = await revenueRepository.getPaidInvoices();
    const mrrTrend = this._calculateMRRTrendFromInvoices(paidInvoices);
    const revenueByPlan = this._calculateRevenueByPlan(paidInvoices);

    return {
      kpis: this._buildKPIs(mrrData, activeSubscriptions.length),
      mrrTrend,
      transactions,
      revenueByPlan
    };
  }

  _calculateMRR(subscriptions) {
    let totalMRR = 0;
    subscriptions.forEach(sub => {
      const price = parseFloat(sub.plan.priceAmount);
      if (sub.plan.billingCycle === BILLING_CYCLES.MONTHLY) {
        totalMRR += price;
      } else if (sub.plan.billingCycle === BILLING_CYCLES.ANNUAL) {
        totalMRR += price / 12;
      }
    });
    return { totalMRR, totalARR: totalMRR * 12 };
  }

  _formatTransactions(invoices) {
    return invoices.map(inv => ({
      user: inv.subscription.brand?.owner?.name || SYSTEM_LABELS.UNKNOWN,
      plan: inv.subscription.plan.name,
      amount: `$${parseFloat(inv.amount)}`,
      date: new Date(inv.paidAt || inv.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      status: inv.status.toLowerCase(),
      type: this._getTransactionType(inv)
    }));
  }

  _calculateMRRTrendFromInvoices(paidInvoices) {
    const months = [];
    const now = new Date();
    // Sinh ra danh sách 6 tháng gần nhất kết thúc bằng tháng hiện tại
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: d.toLocaleDateString('en-US', { month: 'short' }),
        year: d.getFullYear(),
        monthNum: d.getMonth(),
        mrr: 0
      });
    }

    paidInvoices.forEach(inv => {
      const date = inv.paidAt || inv.createdAt;
      const invDate = new Date(date);
      const invYear = invDate.getFullYear();
      const invMonth = invDate.getMonth();
      const amount = parseFloat(inv.amount) || 0;

      const match = months.find(m => m.year === invYear && m.monthNum === invMonth);
      if (match) {
        match.mrr += amount;
      }
    });

    return months.map(m => ({
      month: m.label,
      mrr: m.mrr
    }));
  }

  _calculateRevenueByPlan(paidInvoices) {
    const planRevenue = {};

    paidInvoices.forEach(inv => {
      const planName = inv.subscription?.plan?.name || 'UNKNOWN';
      const amount = parseFloat(inv.amount) || 0;
      planRevenue[planName] = (planRevenue[planName] || 0) + amount;
    });

    return Object.keys(planRevenue).map(name => ({
      plan: name,
      revenue: planRevenue[name]
    }));
  }

  _buildKPIs(mrrData, activeSubCount) {
    return [
      { label: 'MRR', value: `$${mrrData.totalMRR.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, delta: '12% ↑' },
      { label: 'ARR', value: `$${mrrData.totalARR.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, delta: '8% ↑' },
      { label: 'Active Subscribers', value: activeSubCount.toString(), delta: '15% ↑' },
      { label: 'LTV', value: '$240', delta: '4% ↑' },
      { label: 'Churn Rate', value: '2.4%', delta: '1.2% ↓' }
    ];
  }

  _getTransactionType(invoice) {
    if (invoice.status === INVOICE_STATUS.PAID && !invoice.paidAt) return SYSTEM_LABELS.NEW;
    return SYSTEM_LABELS.RENEWAL;
  }
}

module.exports = new RevenueService();
