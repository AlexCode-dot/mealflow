import { useCallback, useMemo, useState } from 'react';
import { authApi } from '@/src/features/auth/api/authApi';
import { tokenStore } from '@/src/core/auth/tokenStore';
import { toApiError } from '@/src/core/http/toApiError';
import { mapAuthError } from '@/src/features/auth/errors/mapAuthError';
import type { UiError } from '@/src/shared/errors/errorTypes';

export type LoginState = {
  isLoading: boolean;
  error: UiError | null;
};

export type LoginActions = {
  login: (email: string, password: string) => Promise<boolean>;
  clearError: () => void;
};

export type LoginView = {
  state: LoginState;
  actions: LoginActions;
};

export const useLogin = (): LoginView => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<UiError | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const login = useCallback(async (email: string, password: string) => {
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
  }, []);

  const state = useMemo<LoginState>(
    () => ({
      isLoading,
      error,
    }),
    [isLoading, error],
  );

  const actions = useMemo<LoginActions>(
    () => ({
      login,
      clearError,
    }),
    [login, clearError],
  );

  return useMemo(
    () => ({
      state,
      actions,
    }),
    [state, actions],
  );
};
