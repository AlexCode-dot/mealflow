import { httpClient } from '@/src/core/http/httpClient';
import { AuthTokens } from '../types';

export const authApi = {
  login(email: string, password: string): Promise<AuthTokens> {
    return httpClient.identity.post<AuthTokens>('/auth/login', { email, password });
  },

  register(email: string, password: string): Promise<AuthTokens> {
    return httpClient.identity.post<AuthTokens>('/auth/register', { email, password });
  },
};
