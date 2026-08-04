import { apiV2 } from './api';

class HelpCenterService {
  // ── Workspace (any logged-in user) ────────────────────────────────────
  async askQuestion(question) {
    const data = await apiV2.post('/help/ask', { question });
    return data;
  }

  async listArticles(category) {
    const query = category ? `?category=${encodeURIComponent(category)}` : '';
    const data = await apiV2.get(`/help/articles${query}`);
    return data;
  }

  async getArticleBySlug(slug) {
    const data = await apiV2.get(`/help/articles/${slug}`);
    return data;
  }

  // ── Admin ──────────────────────────────────────────────────────────────
  async adminListArticles({ status, category } = {}) {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (category) params.set('category', category);
    const query = params.toString() ? `?${params.toString()}` : '';
    const data = await apiV2.get(`/admin/help-articles${query}`);
    return data;
  }

  async adminGetArticle(id) {
    const data = await apiV2.get(`/admin/help-articles/${id}`);
    return data;
  }

  async adminCreateArticle(payload) {
    const data = await apiV2.post('/admin/help-articles', payload);
    return data;
  }

  async adminUpdateArticle(id, payload) {
    const data = await apiV2.put(`/admin/help-articles/${id}`, payload);
    return data;
  }

  async adminPublishArticle(id) {
    const data = await apiV2.post(`/admin/help-articles/${id}/publish`);
    return data;
  }

  async adminUnpublishArticle(id) {
    const data = await apiV2.post(`/admin/help-articles/${id}/unpublish`);
    return data;
  }

  async adminDeleteArticle(id) {
    const data = await apiV2.delete(`/admin/help-articles/${id}`);
    return data;
  }
}

const helpCenterService = new HelpCenterService();
export default helpCenterService;
