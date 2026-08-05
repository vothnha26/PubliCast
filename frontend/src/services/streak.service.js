import { apiV2 } from './api';

class StreakService {
  async getStreak(brandId) {
    const data = await apiV2.get(`/content-extras/streak?brandId=${brandId}`);
    return data;
  }
}

const streakService = new StreakService();
export default streakService;
