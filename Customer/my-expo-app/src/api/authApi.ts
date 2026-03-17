import { api } from './client';

export const authApi = {
  getMe: () => api.get<{ user?: any }>('/api/auth/me'),
};
