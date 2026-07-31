import { apiV2 } from './api';

class TicketService {
  async getActiveTicket(brandId) {
    const data = await apiV2.get(`/tickets/active?brandId=${brandId}`);
    return data;
  }

  async getTickets(brandId) {
    const data = await apiV2.get(`/tickets?brandId=${brandId}`);
    return data;
  }

  async getTicketMessages(ticketId) {
    const data = await apiV2.get(`/tickets/${ticketId}/messages`);
    return data;
  }

  async createTicket(brandId, subject) {
    const data = await apiV2.post('/tickets', { brandId, subject });
    return data;
  }

  async sendMessage(ticketId, content) {
    const data = await apiV2.post(`/tickets/${ticketId}/messages`, { content });
    return data;
  }

  async getAllTickets(brandId = null) {
    const query = brandId ? `?brandId=${brandId}` : '';
    const data = await apiV2.get(`/tickets${query}`);
    return data;
  }

  async getTicketDetails(ticketId) {
    const data = await apiV2.get(`/tickets/${ticketId}`);
    return data;
  }

  async assignTicket(ticketId) {
    const data = await apiV2.put(`/tickets/${ticketId}/assign`);
    return data;
  }

  async resolveTicket(ticketId) {
    const data = await apiV2.put(`/tickets/${ticketId}/status`, { status: 'RESOLVED' });
    return data;
  }
}

const ticketService = new TicketService();
export default ticketService;
