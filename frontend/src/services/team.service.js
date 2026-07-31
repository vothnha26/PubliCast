import { apiV2 } from './api';

class TeamService {
  async getMembers(brandId) {
    const data = await apiV2.get(`/workspace/team?brandId=${brandId}`);
    return data;
  }

  async getInvitations(brandId) {
    const data = await apiV2.get(`/teams/invitations?brandId=${brandId}`);
    return data;
  }

  async getActivityLogs(brandId, page = 1, limit = 10) {
    const data = await apiV2.get(`/teams/activity-logs?brandId=${brandId}&page=${page}&limit=${limit}`);
    return data;
  }

  async inviteMember(payload) {
    const data = await apiV2.post('/workspace/team/invite', payload);
    return data;
  }

  async updateRole(memberId, role) {
    const data = await apiV2.put(`/workspace/team/${memberId}/role`, { role });
    return data;
  }

  async removeMember(memberId) {
    const data = await apiV2.delete(`/workspace/team/${memberId}`);
    return data;
  }

  async resendInvite(memberId) {
    const data = await apiV2.post(`/workspace/team/${memberId}/resend-invite`);
    return data;
  }

  async getBrandRoles(brandId) {
    const data = await apiV2.get(`/workspace/brands/${brandId}/roles`);
    return data;
  }

  async getPermissions() {
    const data = await apiV2.get('/workspace/permissions');
    return data;
  }

  async createRole(brandId, payload) {
    const data = await apiV2.post(`/workspace/brands/${brandId}/roles`, payload);
    return data;
  }

  async updateBrandRole(brandId, roleId, payload) {
    const data = await apiV2.put(`/workspace/brands/${brandId}/roles/${roleId}`, payload);
    return data;
  }

  async deleteRole(brandId, roleId) {
    const data = await apiV2.delete(`/workspace/brands/${brandId}/roles/${roleId}`);
    return data;
  }

  async getBrandTeam(brandId) {
    const data = await apiV2.get(`/workspace/team?brandId=${brandId}`);
    return data;
  }

  async validateInvitation(token) {
    const data = await apiV2.get(`/workspace/team/invitations/validate?token=${token}`);
    return data;
  }

  async acceptInvitation(payload) {
    const data = await apiV2.post('/workspace/team/invitations/accept', payload);
    return data;
  }
}

const teamService = new TeamService();
export default teamService;
