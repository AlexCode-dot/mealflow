import { useState } from 'react';
import { authApi } from '@/src/features/auth/api/authApi';
import { tokenStore } from '@/src/core/auth/tokenStore';
import { toApiError } from '@/src/core/http/toApiError';
import { mapAuthError } from '@/src/features/auth/errors/mapAuthError';
import type { UiError } from '@/src/shared/errors/errorTypes';

export const useLogin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<UiError | null>(null);

  const clearError = () => setError(null);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await authApi.login(email.trim(), password);
      tokenStore.setAccessToken(res.accessToken);
      await tokenStore.setRefreshToken(res.refreshToken);
      return true;
    } catch (e) {
      setError(mapAuthError(toApiError(e)));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { login, isLoading, error, clearError };
};
