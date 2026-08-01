import { apiV2 } from './api';

class VideoEditorService {
  async transcribe(videoUrl, brandId) {
    const data = await apiV2.post('/posts/transcribe', { videoUrl, brandId }, { timeout: 300000 });
    return data;
  }

  async trim(params) {
    const data = await apiV2.post('/posts/trim', params);
    return data;
  }

  async getStatus(taskId) {
    const data = await apiV2.get(`/posts/trim/${taskId}/status`);
    return data;
  }
}

const videoEditorService = new VideoEditorService();
export default videoEditorService;
