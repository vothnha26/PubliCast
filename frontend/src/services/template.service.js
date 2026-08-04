import { apiV2 } from './api';

class TemplateService {
  async getFeaturedTemplates() {
    const data = await apiV2.get('/templates');
    return data;
  }
}

const templateService = new TemplateService();
export default templateService;
