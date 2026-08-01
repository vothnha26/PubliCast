import { apiV2 } from './api';

class InboxService {
  async getInbox(brandId, searchParamsString = '') {
    const data = await apiV2.get(`/social/inbox?brandId=${brandId}&${searchParamsString}`);
    return data;
  }

  async getThread(itemId) {
    const data = await apiV2.get(`/social/inbox/${itemId}`);
    return data;
  }

  async syncInbox(brandId, platform) {
    const data = await apiV2.post('/social/inbox/sync', { brandId, platform });
    return data;
  }

  async updateInboxStatus(itemId, status) {
    const data = await apiV2.patch(`/social/inbox/${itemId}/status`, { status });
    return data;
  }

  async replyInbox(payload) {
    const data = await apiV2.post('/social/inbox/reply', payload);
    return data;
  }

  async updateInboxReply(replyId, payload) {
    const data = await apiV2.patch(`/social/inbox/replies/${replyId}`, payload);
    return data;
  }

  async deleteInboxReply(replyId, brandId) {
    const data = await apiV2.delete(`/social/inbox/replies/${replyId}`, { data: { brandId } });
    return data;
  }

  async getAutoReplySettings(socialAccountId) {
    const data = await apiV2.get(`/social/inbox/auto-reply/settings/${socialAccountId}`);
    return data;
  }

  async saveAutoReplySettings(socialAccountId, payload) {
    const data = await apiV2.post(`/social/inbox/auto-reply/settings/${socialAccountId}`, payload);
    return data;
  }

  async getConversation(id) {
    const data = await apiV2.get(`/inbox/conversations/${id}`);
    return data;
  }

  async sendMessage(conversationId, payload) {
    const data = await apiV2.post(`/inbox/conversations/${conversationId}/messages`, payload);
    return data;
  }

  async markAsRead(conversationId) {
    const data = await apiV2.put(`/inbox/conversations/${conversationId}/read`);
    return data;
  }

  async updateConversationStatus(conversationId, status) {
    const data = await apiV2.put(`/inbox/conversations/${conversationId}/status`, { status });
    return data;
  }

  async assignConversation(conversationId, userId) {
    const data = await apiV2.put(`/inbox/conversations/${conversationId}/assign`, { userId });
    return data;
  }
}

const inboxService = new InboxService();
export default inboxService;
