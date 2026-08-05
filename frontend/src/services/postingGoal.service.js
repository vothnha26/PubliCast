import { apiV2 } from './api';

class PostingGoalService {
  async getGoals(brandId) {
    const data = await apiV2.get(`/content-extras/posting-goals?brandId=${brandId}`);
    return data;
  }

  async saveGoal(payload) {
    const data = await apiV2.put('/content-extras/posting-goals', payload);
    return data;
  }

  async deleteGoal(goalId) {
    const data = await apiV2.delete(`/content-extras/posting-goals/${goalId}`);
    return data;
  }
}

const postingGoalService = new PostingGoalService();
export default postingGoalService;
