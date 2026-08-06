import { apiV2 } from './api';

class TemplateService {
  // params is optional — { page, limit } enables the paginated flat-list
  // response (with `meta`); omitted entirely, the backend returns the
  // legacy full category tree unchanged (FeaturedTemplatesTab.jsx relies
  // on that no-arg shape, so keep calling this with no params there).
  async getFeaturedTemplates(params = {}) {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null))
    ).toString();
    const data = await apiV2.get(`/templates${query ? `?${query}` : ''}`);
    return data;
  }
}

const templateService = new TemplateService();
export default templateService;
