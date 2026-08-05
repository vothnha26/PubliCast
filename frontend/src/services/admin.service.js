import { apiV2 } from './api';

class AdminService {
  async getPlatformLockStatus() {
    const data = await apiV2.get('/admin/platform-lock');
    return data;
  }

  async getPlatformLimits() {
    const data = await apiV2.get('/admin/platform-limits');
    return data;
  }

  async updatePlatformLimitLock(limitId, payload) {
    const data = await apiV2.patch(`/admin/platform-limits/${limitId}/lock`, payload);
    return data;
  }

  async togglePlatformLock(isLocked) {
    const data = await apiV2.post('/admin/platform-lock', { isLocked });
    return data;
  }

  async getPricingPlans() {
    const data = await apiV2.get('/admin/pricing');
    return data;
  }

  async getPricingLimits() {
    const data = await apiV2.get('/admin/pricing/limits');
    return data;
  }

  async getPricingProducts() {
    const data = await apiV2.get('/admin/pricing/products');
    return data;
  }

  async createPricingPlan(payload) {
    const data = await apiV2.post('/admin/pricing', payload);
    return data;
  }

  async updatePricingPlan(id, payload) {
    const data = await apiV2.patch(`/admin/pricing/${id}`, payload);
    return data;
  }

  async updatePricingPlanPatch(id, payload) {
    const data = await apiV2.patch(`/admin/pricing/${id}`, payload);
    return data;
  }

  async deletePricingPlan(id) {
    const data = await apiV2.delete(`/admin/pricing/${id}`);
    return data;
  }

  async getProducts() {
    const data = await apiV2.get('/admin/products');
    return data;
  }

  async getProductsMatrix() {
    const data = await apiV2.get('/admin/products/matrix');
    return data;
  }

  async saveProductsMatrix(payload) {
    const data = await apiV2.post('/admin/products/matrix', payload);
    return data;
  }

  async disableProductsMatrix(payload) {
    const data = await apiV2.post('/admin/products/matrix/disable', payload);
    return data;
  }

  async createProductPlatform(payload) {
    const data = await apiV2.post('/admin/products/platforms', payload);
    return data;
  }

  async createProductModule(payload) {
    const data = await apiV2.post('/admin/products/modules', payload);
    return data;
  }

  async createProduct(payload) {
    const data = await apiV2.post('/admin/products', payload);
    return data;
  }

  async updateProduct(id, payload) {
    const data = await apiV2.put(`/admin/products/${id}`, payload);
    return data;
  }

  async deleteProduct(id) {
    const data = await apiV2.delete(`/admin/products/${id}`);
    return data;
  }

  async getUsers(searchParamsString = '') {
    const data = await apiV2.get(`/admin/users?${searchParamsString}`);
    return data;
  }

  async updateUserRole(userId, role) {
    const data = await apiV2.patch(`/admin/users/${userId}/role`, { role });
    return data;
  }

  async updateUserStatus(userId, isActive) {
    const data = await apiV2.patch(`/admin/users/${userId}/status`, { isActive });
    return data;
  }

  async getAuditLogs(searchParamsString = '') {
    const data = await apiV2.get(`/admin/audit-logs?${searchParamsString}`);
    return data;
  }

  async getRevenueStats(searchParamsString = '') {
    const data = await apiV2.get(`/admin/revenue?${searchParamsString}`);
    return data;
  }

  async getTemplates() {
    const data = await apiV2.get('/admin/templates');
    return data;
  }

  async createTemplateCategory(payload) {
    const data = await apiV2.post('/admin/templates/categories', payload);
    return data;
  }

  async updateTemplateCategory(id, payload) {
    const data = await apiV2.put(`/admin/templates/categories/${id}`, payload);
    return data;
  }

  async deleteTemplateCategory(id) {
    const data = await apiV2.delete(`/admin/templates/categories/${id}`);
    return data;
  }

  async createTemplate(payload) {
    const data = await apiV2.post('/admin/templates', payload);
    return data;
  }

  async updateTemplate(id, payload) {
    const data = await apiV2.put(`/admin/templates/${id}`, payload);
    return data;
  }

  async deleteTemplate(id) {
    const data = await apiV2.delete(`/admin/templates/${id}`);
    return data;
  }

  async getSystemFeeds() {
    const data = await apiV2.get('/admin/feeds');
    return data;
  }

  async createSystemFeed(payload) {
    const data = await apiV2.post('/admin/feeds', payload);
    return data;
  }

  async updateSystemFeed(id, payload) {
    const data = await apiV2.put(`/admin/feeds/${id}`, payload);
    return data;
  }

  async deleteSystemFeed(id) {
    const data = await apiV2.delete(`/admin/feeds/${id}`);
    return data;
  }
}

const adminService = new AdminService();
export default adminService;
