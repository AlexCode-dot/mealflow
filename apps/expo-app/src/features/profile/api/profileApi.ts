import { httpClient } from '@/src/core/http/httpClient';
import type { Profile, UpdateProfileRequest } from '@/src/features/profile/types';

export const profileApi = {
  get(): Promise<Profile> {
    return httpClient.appApi.get<Profile>('/api/profile');
  },

  patch(body: UpdateProfileRequest): Promise<Profile> {
    return httpClient.appApi.patch<Profile>('/api/profile', body);
  },
};
