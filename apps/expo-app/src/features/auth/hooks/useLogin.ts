import { useState } from 'react';
import { authApi } from '@/src/core/auth/authApi';
import { tokenStore } from '@/src/core/auth/tokenStore';

export const useLogin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await authApi.login(email.trim(), password);
      tokenStore.setAccessToken(res.accessToken);
      await tokenStore.setRefreshToken(res.refreshToken);
      return true;
    } catch (e: any) {
      setError(e?.message ?? 'Login failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { login, isLoading, error };
};
