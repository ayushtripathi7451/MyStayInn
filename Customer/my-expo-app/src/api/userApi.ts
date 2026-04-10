import { userApi as client } from './client';

export interface UserMe {
  user?: {
    id?: string;
    uniqueId?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    [key: string]: any;
  };
}

export interface CurrentStayResponse {
  success?: boolean;
  currentStay?: any;
}

export const userApi = {
  getMe: () => client.get<UserMe>('/api/users/me'),
  getCurrentStay: () => client.get<CurrentStayResponse>('/api/users/me/current-stay'),
  getAnnouncements: () =>
    client
      .get('/api/users/me/announcements', { params: { allProperties: '1' } })
      .catch(() => ({ data: { success: true, announcements: [] } })),
};
