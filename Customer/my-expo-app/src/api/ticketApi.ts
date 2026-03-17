import { ticketApi as client } from './client';

export interface TicketCounts {
  success?: boolean;
  open?: number;
  closed?: number;
}

export const ticketApi = {
  getCounts: () => client.get<TicketCounts>('/api/tickets/counts'),
  getList: (params?: { status?: string; page?: number }) =>
    client.get('/api/tickets', { params }),
  getById: (id: string) => client.get(`/api/tickets/${id}`),
  create: (data: any) => client.post('/api/tickets', data),
  addComment: (id: string, data: { message: string }) =>
    client.post(`/api/tickets/${id}/comments`, data),
};
