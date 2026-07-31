import { apiV2 } from './api';

class HighlightService {
  async getStatus(taskId) {
    const data = await apiV2.get(`/highlights/${taskId}/status`);
    return data;
  }

  async importHighlight(payload) {
    const data = await apiV2.post('/highlights/import', payload);
    return data;
  }

  async publishYoutube(taskId, payload) {
    const data = await apiV2.post(`/highlights/${taskId}/publish-youtube`, payload);
    return data;
  }

  async createTwitchClip(payload) {
    const data = await apiV2.post('/social/twitch/clips/create', payload);
    return data;
  }
}

const highlightService = new HighlightService();
export default highlightService;
