import { apiV2 } from './api';

class AIService {
  async quickPost(brandId, payload) {
    const data = await apiV2.post(`/ai/quick-post?brandId=${brandId}`, payload);
    return data;
  }

  async getHistory(brandId, page = 1, limit = 10) {
    const data = await apiV2.get(`/ai/history?brandId=${brandId}&page=${page}&limit=${limit}`);
    return data;
  }

  async getConfig() {
    const data = await apiV2.get('/ai/config');
    return data;
  }

  async getSettings(brandId) {
    const data = await apiV2.get(`/ai/settings?brandId=${brandId}`);
    return data;
  }

  async updateSettings(brandId, payload) {
    const data = await apiV2.put(`/ai/settings?brandId=${brandId}`, payload);
    return data;
  }

  async generateContent(brandId, payload) {
    const data = await apiV2.post(`/ai/generate?brandId=${brandId}`, payload);
    return data;
  }

  async getAutoLists(brandId) {
    const data = await apiV2.get(`/content-extras/auto-lists?brandId=${brandId}`);
    return data;
  }
}

const aiService = new AIService();
export default aiService;
