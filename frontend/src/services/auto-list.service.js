import { apiV2 } from './api';

class AutoListService {
  async getAutoLists(brandId) {
    const data = await apiV2.get(`/posts/auto-lists?brandId=${brandId}`);
    return data;
  }

  async getAutoListDetails(id) {
    const data = await apiV2.get(`/posts/auto-lists/${id}`);
    return data;
  }

  async createAutoList(payload) {
    const data = await apiV2.post('/posts/auto-lists', payload);
    return data;
  }

  async updateAutoList(id, payload) {
    const data = await apiV2.put(`/posts/auto-lists/${id}`, payload);
    return data;
  }

  async deleteAutoList(id) {
    const data = await apiV2.delete(`/posts/auto-lists/${id}`);
    return data;
  }

  async toggleStatus(id) {
    const data = await apiV2.patch(`/posts/auto-lists/${id}/toggle`);
    return data;
  }

  async reorderPosts(id, orderedPostIds) {
    const data = await apiV2.put(`/posts/auto-lists/${id}/reorder`, { orderedPostIds });
    return data;
  }
}

const autoListService = new AutoListService();
export default autoListService;
