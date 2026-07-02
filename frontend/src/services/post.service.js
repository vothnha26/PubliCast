import apiService from './api';

class PostService {
  async getPosts(brandId, params = {}) {
    const queryParams = new URLSearchParams({ brandId, ...params }).toString();
    const response = await apiService.get(`/posts?${queryParams}`);
    return response.data;
  }

  async createPost(postData) {
    const response = await apiService.post('/posts', postData);
    return response.data;
  }

  async updatePost(id, postData) {
    const response = await apiService.put(`/posts/${id}`, postData);
    return response.data;
  }

  async deletePosts(brandId, ids, deleteFromSocials = false) {
    const response = await apiService.delete('/posts/bulk', {
      data: { brandId, ids, deleteFromSocials }
    });
    return response.data;
  }

  async approvePosts(brandId, ids) {
    const response = await apiService.post('/posts/bulk-approve', { brandId, ids });
    return response.data;
  }

  async restorePosts(brandId, ids) {
    const response = await apiService.post('/posts/bulk-restore', { brandId, ids });
    return response.data;
  }

  async emptyTrash(brandId) {
    const response = await apiService.delete(`/posts/trash?brandId=${brandId}`);
    return response.data;
  }

  async getPlatformLimits() {
    const response = await apiService.get('/posts/platform-limits');
    return response.data;
  }

  async getReviewers(brandId) {
    const response = await apiService.get(`/brands/${brandId}/workflows/reviewers`);
    return response.data;
  }

  async reassignReviewer(brandId, workflowId, reviewerIds, policy) {
    const response = await apiService.put(`/brands/${brandId}/workflows/${workflowId}/reassign`, {
      reviewerIds,
      policy
    });
    return response.data;
  }
}

const postService = new PostService();
export default postService;
