import { moveOutApi as client } from './client';

export const moveOutApi = {
  getStatus: () => client.get<{ success?: boolean; status?: any }>('/api/move-out/status'),
  initiate: (data: any) => client.post('/api/move-out/initiate', data),
};
