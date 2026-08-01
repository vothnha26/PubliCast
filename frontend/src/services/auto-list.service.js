import { apiV2 } from './api';

class AutoListService {
  async getAutoLists(brandId) {
    const data = await apiV2.get(`/content-extras/auto-lists?brandId=${brandId}`);
    return data;
  }

  async getAutoListDetails(id) {
    const data = await apiV2.get(`/content-extras/auto-lists/${id}`);
    return data;
  }

  async createAutoList(payload) {
    const data = await apiV2.post('/content-extras/auto-lists', payload);
    return data;
  }

  async updateAutoList(id, payload) {
    const data = await apiV2.put(`/content-extras/auto-lists/${id}`, payload);
    return data;
  }

  async deleteAutoList(id) {
    const data = await apiV2.delete(`/content-extras/auto-lists/${id}`);
    return data;
  }

  async toggleStatus(id) {
    const data = await apiV2.patch(`/content-extras/auto-lists/${id}/toggle`);
    return data;
  }

  async reorderPosts(id, orderedPostIds) {
    const data = await apiV2.put(`/content-extras/auto-lists/${id}/reorder`, { orderedPostIds });
    return data;
  }
}

const autoListService = new AutoListService();
export default autoListService;
