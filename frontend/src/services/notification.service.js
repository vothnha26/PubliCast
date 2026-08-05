import { apiV2 } from './api';

class NotificationService {
  async getUnread(limit = 1) {
    const data = await apiV2.get(`/notifications?isRead=false&limit=${limit}`);
    return data;
  }

  async getNotifications(params = {}) {
    const query = new URLSearchParams(params).toString();
    const data = await apiV2.get(`/notifications${query ? `?${query}` : ''}`);
    return data;
  }

  async markAsRead(id, brandId) {
    const query = brandId ? `?brandId=${encodeURIComponent(brandId)}` : '';
    const data = await apiV2.put(`/notifications/${id}/read${query}`);
    return data;
  }

  async markAllRead(brandId) {
    const query = brandId ? `?brandId=${encodeURIComponent(brandId)}` : '';
    const data = await apiV2.put(`/notifications/read-all${query}`);
    return data;
  }
}

const notificationService = new NotificationService();
export default notificationService;
