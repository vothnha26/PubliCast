import { apiV2 } from './api';

class SmartLinkService {
  async getSmartLinks(brandId) {
    const data = await apiV2.get(`/content-extras/smart-links/list?brandId=${brandId}`);
    return data;
  }

  async getAnalytics(id, brandId, fromStr, toStr) {
    const data = await apiV2.get(`/content-extras/smart-links/${id}/analytics?brandId=${brandId}&from=${fromStr}&to=${toStr}`);
    return data;
  }

  async createSmartLink(payload) {
    const data = await apiV2.post('/content-extras/smart-links', payload);
    return data;
  }

  async cloneSmartLink(smartLinkId, brandId) {
    const data = await apiV2.post(`/content-extras/smart-links/${smartLinkId}/clone`, { brandId });
    return data;
  }

  async updateSmartLink(smartLinkId, payload) {
    const data = await apiV2.put(`/content-extras/smart-links/${smartLinkId}`, payload);
    return data;
  }

  async deleteSmartLink(smartLinkId, brandId) {
    const data = await apiV2.delete(`/content-extras/smart-links/${smartLinkId}?brandId=${brandId}`);
    return data;
  }

  async getPublicSmartLink(slug) {
    const data = await apiV2.get(`/content-extras/smart-links/public/${slug}`);
    return data;
  }

  async registerClick(linkId) {
    const data = await apiV2.post(`/content-extras/smart-links/click/${linkId}`);
    return data;
  }
}

const smartLinkService = new SmartLinkService();
export default smartLinkService;
