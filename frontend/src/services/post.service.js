import { apiV2 } from './api';

class PostService {
  async getPosts(brandId, params = {}) {
    const queryParams = new URLSearchParams({ brandId, ...params }).toString();
    const data = await apiV2.get(`/posts?${queryParams}`);
    return data;
  }

  async createPost(postData) {
    const data = await apiV2.post('/posts', postData);
    return data;
  }

  async createPostV2(postData) {
    const data = await apiV2.post('/posts', postData);
    return data;
  }

  async updatePost(id, postData) {
    const data = await apiV2.put(`/posts/${id}`, postData);
    return data;
  }

  async retryFailedPlatforms(id, brandId, platforms) {
    const data = await apiV2.post(`/posts/${id}/retry-failed`, { brandId, platforms });
    return data;
  }

  async deletePosts(brandId, ids, deleteFromSocials = false) {
    const data = await apiV2.delete('/posts/bulk', {
      data: { brandId, ids, deleteFromSocials }
    });
    return data;
  }

  async approvePosts(brandId, ids) {
    const data = await apiV2.post('/posts/bulk-approve', { brandId, ids });
    return data;
  }

  async restorePosts(brandId, ids) {
    const data = await apiV2.post('/posts/bulk-restore', { brandId, ids });
    return data;
  }

  async emptyTrash(brandId) {
    const data = await apiV2.delete(`/posts/trash?brandId=${brandId}`);
    return data;
  }

  async getPlatformLimits() {
    const data = await apiV2.get('/posts/platform-limits');
    return data;
  }

  async getReviewers(brandId) {
    const data = await apiV2.get(`/workspace/brands/${brandId}/workflows/reviewers`);
    return data;
  }

  async reassignReviewer(brandId, workflowId, reviewerIds, policy) {
    const data = await apiV2.put(`/workspace/brands/${brandId}/workflows/${workflowId}/reassign`, {
      reviewerIds,
      policy
    });
    return data;
  }

  async getCalendarEvents(brandId, startDate, endDate) {
    const data = await apiV2.get(`/content-extras/calendar-events?brandId=${brandId}&startDate=${startDate}&endDate=${endDate}`);
    return data;
  }
}

const postService = new PostService();
export default postService;
