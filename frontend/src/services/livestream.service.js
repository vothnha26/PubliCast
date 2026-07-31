import { apiV2 } from './api';

class LivestreamService {
  async getHistory(paramsString = '') {
    const data = await apiV2.get(`/content-extras/livestreams/history?${paramsString}`);
    return data;
  }
}

const livestreamService = new LivestreamService();
export default livestreamService;
