import { httpClient } from '@/src/core/http/httpClient';

export const accountApi = {
  delete(): Promise<void> {
    return httpClient.appApi.delete<void>('/api/account');
  },
};
