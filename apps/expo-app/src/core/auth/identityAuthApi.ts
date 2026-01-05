import { ENV } from '@/src/core/config/env';
import { request } from '@/src/core/http/request';
import type { AuthTokens } from '@/src/features/auth/types';

export const identityAuthApi = {
  refresh(refreshToken: string): Promise<AuthTokens> {
    return request<AuthTokens>(ENV.IDENTITY_BASE_URL, '/auth/refresh', 'POST', {
      body: { refreshToken },
    });
  },

  logout(refreshToken: string): Promise<void> {
    return request<void>(ENV.IDENTITY_BASE_URL, '/auth/logout', 'POST', {
      body: { refreshToken },
    });
  },
};
