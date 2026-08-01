import { apiV2 } from './api';

class BillingService {
  async getCurrentSubscription(brandId) {
    const data = await apiV2.get(`/billing/subscriptions/current?brandId=${brandId}`);
    return data;
  }

  async getSubscriptionHistory(brandId) {
    const data = await apiV2.get(`/billing/subscriptions/history?brandId=${brandId}`);
    return data;
  }

  async getPlans() {
    const data = await apiV2.get('/billing/subscriptions/plans');
    return data;
  }

  async getAddons() {
    const data = await apiV2.get('/billing/subscriptions/addons');
    return data;
  }

  async initiateSubscription(payload) {
    const data = await apiV2.post('/billing/subscriptions/initiate', payload);
    return data;
  }

  async initiateAddon(payload) {
    const data = await apiV2.post('/billing/subscriptions/addons/initiate', payload);
    return data;
  }

  async cancelTransaction(txCode) {
    const data = await apiV2.post('/billing/subscriptions/cancel', { transactionCode: txCode });
    return data;
  }

  async getSubscriptionStatus(txCode) {
    const data = await apiV2.get(`/billing/subscriptions/status/${txCode}`);
    return data;
  }
}

const billingService = new BillingService();
export default billingService;
