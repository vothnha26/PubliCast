const revenueService = require('../../src/services/admin/revenue.service');
const revenueRepository = require('../../src/repositories/admin/revenue.repository');

jest.mock('../../src/repositories/admin/revenue.repository', () => ({
  getActiveSubscriptionRevenue: jest.fn(),
  getRecentInvoices: jest.fn(),
  getPaidInvoices: jest.fn()
}));

describe('Revenue Service Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateMRR', () => {
    it('should correctly calculate MRR by dividing ANNUAL price by 12 and adding MONTHLY price directly', () => {
      const mockSubscriptions = [
        {
          plan: {
            priceAmount: '30.00',
            billingCycle: 'MONTHLY'
          }
        },
        {
          plan: {
            priceAmount: '120.00',
            billingCycle: 'ANNUAL'
          }
        }
      ];

      const result = revenueService._calculateMRR(mockSubscriptions);
      
      // Expected MRR: 30 + (120 / 12) = 40
      // Expected ARR: 40 * 12 = 480
      expect(result.totalMRR).toBe(40);
      expect(result.totalARR).toBe(480);
    });
  });

  describe('getDashboardData - Real DB Invoices Integration', () => {
    it('should correctly calculate mrrTrend and revenueByPlan from paid invoices in database', async () => {
      const mockSubscriptions = [
        {
          plan: {
            priceAmount: '150.00',
            billingCycle: 'MONTHLY'
          }
        }
      ];

      const now = new Date();
      // Tạo hóa đơn ở tháng trước (lùi 1 tháng)
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 15);
      // Tạo hóa đơn ở tháng hiện tại
      const currentMonthDate = new Date(now.getFullYear(), now.getMonth(), 5);

      const mockPaidInvoices = [
        {
          id: 'inv-1',
          amount: '100.00',
          status: 'PAID',
          paidAt: lastMonthDate,
          subscription: {
            plan: { name: 'PRO' },
            brand: { owner: { name: 'User A' } }
          }
        },
        {
          id: 'inv-2',
          amount: '50.00',
          status: 'PAID',
          paidAt: currentMonthDate,
          subscription: {
            plan: { name: 'PRO' },
            brand: { owner: { name: 'User B' } }
          }
        },
        {
          id: 'inv-3',
          amount: '30.00',
          status: 'PAID',
          paidAt: currentMonthDate,
          subscription: {
            plan: { name: 'STARTER' },
            brand: { owner: { name: 'User C' } }
          }
        }
      ];

      revenueRepository.getActiveSubscriptionRevenue.mockResolvedValue(mockSubscriptions);
      revenueRepository.getRecentInvoices.mockResolvedValue(mockPaidInvoices.slice(0, 2));
      revenueRepository.getPaidInvoices.mockResolvedValue(mockPaidInvoices);

      const dashboardData = await revenueService.getDashboardData();

      // 1. Verify MRR KPIs
      expect(dashboardData.kpis).toBeDefined();
      expect(dashboardData.kpis[0].value).toBe('$150'); // totalMRR = 150

      // 2. Verify mrrTrend (6 months ending in current month)
      const trend = dashboardData.mrrTrend;
      expect(trend).toHaveLength(6);
      
      const lastMonthLabel = lastMonthDate.toLocaleDateString('en-US', { month: 'short' });
      const currentMonthLabel = currentMonthDate.toLocaleDateString('en-US', { month: 'short' });

      const lastMonthTrend = trend.find(t => t.month === lastMonthLabel);
      const currentMonthTrend = trend.find(t => t.month === currentMonthLabel);

      expect(lastMonthTrend.mrr).toBe(100); // 100.00 from inv-1
      expect(currentMonthTrend.mrr).toBe(80);  // 50.00 (inv-2) + 30.00 (inv-3) = 80

      // 3. Verify revenueByPlan aggregation
      const revenueByPlan = dashboardData.revenueByPlan;
      expect(revenueByPlan).toBeDefined();
      
      const proPlan = revenueByPlan.find(p => p.plan === 'PRO');
      const starterPlan = revenueByPlan.find(p => p.plan === 'STARTER');

      expect(proPlan.revenue).toBe(150); // 100 + 50
      expect(starterPlan.revenue).toBe(30);
    });
  });
});
