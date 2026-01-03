import { httpClient } from '../http/httpClient';

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
};

export const authApi = {
  login(email: string, password: string): Promise<AuthResponse> {
    return httpClient.identity.post<AuthResponse>('/auth/login', { email, password });
  },

  register(email: string, password: string, displayName?: string): Promise<AuthResponse> {
    return httpClient.identity.post<AuthResponse>('/auth/register', {
      email,
      password,
      displayName: displayName || undefined,
    });
  },
};
