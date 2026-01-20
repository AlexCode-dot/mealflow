import { useCallback, useMemo, useState } from 'react';
import { authApi } from '@/src/features/auth/api/authApi';
import { tokenStore } from '@/src/core/auth/tokenStore';
import { toApiError } from '@/src/core/http/toApiError';
import { mapAuthError } from '@/src/features/auth/errors/mapAuthError';
import type { UiError } from '@/src/shared/errors/errorTypes';

export type RegisterState = {
  isLoading: boolean;
  error: UiError | null;
};

export type RegisterActions = {
  register: (email: string, password: string) => Promise<boolean>;
  clearError: () => void;
};

export type RegisterView = {
  state: RegisterState;
  actions: RegisterActions;
};

export const useRegister = (): RegisterView => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<UiError | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const register = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await authApi.register(email.trim(), password);
      tokenStore.setAccessToken(res.accessToken);
      await tokenStore.setRefreshToken(res.refreshToken);
      return true;
    } catch (e) {
      setError(mapAuthError(toApiError(e)));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const state = useMemo<RegisterState>(
    () => ({
      isLoading,
      error,
    }),
    [isLoading, error],
  );

  const actions = useMemo<RegisterActions>(
    () => ({
      register,
      clearError,
    }),
    [register, clearError],
  );

  return useMemo(
    () => ({
      state,
      actions,
    }),
    [state, actions],
  );
};
