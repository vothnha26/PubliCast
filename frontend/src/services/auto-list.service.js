import apiService from './api';

class AutoListService {
  async getAutoLists(brandId) {
    const response = await apiService.get(`/auto-lists?brandId=${brandId}`);
    return response.data;
  }

  async getAutoListDetails(id) {
    const response = await apiService.get(`/auto-lists/${id}`);
    return response.data;
  }

  async createAutoList(data) {
    const response = await apiService.post('/auto-lists', data);
    return response.data;
  }

  async updateAutoList(id, data) {
    const response = await apiService.put(`/auto-lists/${id}`, data);
    return response.data;
  }

  async deleteAutoList(id) {
    const response = await apiService.delete(`/auto-lists/${id}`);
    return response.data;
  }

  async toggleStatus(id) {
    const response = await apiService.patch(`/auto-lists/${id}/toggle`);
    return response.data;
  }

  async reorderPosts(id, orderedPostIds) {
    const response = await apiService.put(`/auto-lists/${id}/reorder`, { orderedPostIds });
    return response.data;
  }
}

const autoListService = new AutoListService();
export default autoListService;
