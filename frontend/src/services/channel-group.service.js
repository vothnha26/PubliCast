import { apiV2 } from './api';

class ChannelGroupService {
  async list(brandId) {
    const data = await apiV2.get(`/social/channel-groups?brandId=${encodeURIComponent(brandId)}`);
    return data;
  }

  async create(brandId, { name, color, visibility }) {
    const data = await apiV2.post('/social/channel-groups', { brandId, name, color, visibility });
    return data;
  }

  async update(id, brandId, { name, color, visibility, socialAccountIds }) {
    const data = await apiV2.put(`/social/channel-groups/${id}`, { brandId, name, color, visibility, socialAccountIds });
    return data;
  }

  async remove(id, brandId) {
    const data = await apiV2.delete(`/social/channel-groups/${id}?brandId=${encodeURIComponent(brandId)}`);
    return data;
  }
}

const channelGroupService = new ChannelGroupService();
export default channelGroupService;
