import { apiV2 } from './api';

class HashtagService {
  async getHashtags(brandId) {
    const data = await apiV2.get(`/content-extras/hashtags?brandId=${brandId}`);
    return data;
  }

  async getTrendingHashtags(platformParam) {
    const data = await apiV2.get(`/content-extras/hashtags/trending?platform=${platformParam}&limit=20`);
    return data;
  }

  async createSet(payload) {
    const data = await apiV2.post('/content-extras/hashtags/sets', payload);
    return data;
  }

  async updateSet(setId, payload) {
    const data = await apiV2.put(`/content-extras/hashtags/sets/${setId}`, payload);
    return data;
  }

  async deleteSet(setId) {
    const data = await apiV2.delete(`/content-extras/hashtags/sets/${setId}`);
    return data;
  }

  async trackHashtag(payload) {
    const data = await apiV2.post('/content-extras/hashtags/track', payload);
    return data;
  }

  async refreshTracker(trackerId) {
    const data = await apiV2.post(`/content-extras/hashtags/track/${trackerId}/refresh`);
    return data;
  }

  async deleteTracker(trackerId) {
    const data = await apiV2.delete(`/content-extras/hashtags/track/${trackerId}`);
    return data;
  }
}

const hashtagService = new HashtagService();
export default hashtagService;
