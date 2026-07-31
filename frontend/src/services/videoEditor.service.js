import { apiV2 } from './api';

class VideoEditorService {
  async transcribe(videoUrl, brandId) {
    const data = await apiV2.post('/video-editor/transcribe', { videoUrl, brandId }, { timeout: 300000 });
    return data;
  }

  async trim(params) {
    const data = await apiV2.post('/video-editor/trim', params);
    return data;
  }

  async getStatus(taskId) {
    const data = await apiV2.get(`/video-editor/status/${taskId}`);
    return data;
  }
}

const videoEditorService = new VideoEditorService();
export default videoEditorService;
