import { apiV2 } from './api';

class WorkflowService {
  async getWorkflows(brandId) {
    const data = await apiV2.get(`/workspace/brands/${brandId}/workflows`);
    return data;
  }

  async reviewWorkflow(brandId, workflowId, payload) {
    const data = await apiV2.post(`/workspace/brands/${brandId}/workflows/${workflowId}/review`, payload);
    return data;
  }

  async getReviewers(brandId) {
    const data = await apiV2.get(`/workspace/brands/${brandId}/workflows/reviewers`);
    return data;
  }
}

const workflowService = new WorkflowService();
export default workflowService;
