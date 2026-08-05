import { apiV2 } from './api';

class FeedService {
  async getFeedSources(brandId) {
    const data = await apiV2.get(`/content-extras/feeds?brandId=${brandId}`);
    return data;
  }

  async createFeedSource(payload) {
    const data = await apiV2.post('/content-extras/feeds', payload);
    return data;
  }

  async deleteFeedSource(feedId, brandId) {
    const data = await apiV2.delete(`/content-extras/feeds/${feedId}?brandId=${brandId}`);
    return data;
  }

  async getFeedEntries(brandId, limit = 50) {
    const data = await apiV2.get(`/content-extras/feeds/entries?brandId=${brandId}&limit=${limit}`);
    return data;
  }

  // Same response for every brand — CDN-cached on the backend, so this can
  // be called independently of the brand-scoped getFeedSources/getFeedEntries.
  async getCuratedFeeds() {
    const data = await apiV2.get('/content-extras/feeds/curated');
    return data;
  }
}

const feedService = new FeedService();
export default feedService;
