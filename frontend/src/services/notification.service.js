import { apiV2 } from './api';

class NotificationService {
  async getUnread(limit = 1) {
    const data = await apiV2.get(`/notifications?isRead=false&limit=${limit}`);
    return data;
  }

  async getAll(params = {}) {
    const query = new URLSearchParams(params).toString();
    const data = await apiV2.get(`/notifications?${query}`);
    return data;
  }

  async markRead(id) {
    const data = await apiV2.put(`/notifications/${id}/read`);
    return data;
  }

  async markAllRead() {
    const data = await apiV2.put('/notifications/read-all');
    return data;
  }
}

const notificationService = new NotificationService();
export default notificationService;
