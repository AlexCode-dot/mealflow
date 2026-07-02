import { httpClient } from '@/src/core/http/httpClient';
import { AuthTokens, RegisterResponse } from '../types';

export const authApi = {
  login(email: string, password: string): Promise<AuthTokens> {
    return httpClient.identity.post<AuthTokens>('/auth/login', { email, password });
  },

  register(email: string, password: string): Promise<RegisterResponse> {
    return httpClient.identity.post<RegisterResponse>('/auth/register', { email, password });
  },

  verifyEmail(email: string, code: string): Promise<AuthTokens> {
    return httpClient.identity.post<AuthTokens>('/auth/verify-email', { email, code });
  },

  resendVerification(email: string): Promise<void> {
    return httpClient.identity.post<void>('/auth/resend-verification', { email });
  },

  me(): Promise<{ userId: string; email: string }> {
    return httpClient.identity.get<{ userId: string; email: string }>('/auth/me');
  },

  forgotPassword(email: string): Promise<void> {
    return httpClient.identity.post<void>('/auth/forgot-password', { email });
  },

  resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    return httpClient.identity.post<void>('/auth/reset-password', { email, code, newPassword });
  },
};
