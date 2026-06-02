import { useCallback, useMemo, useState } from 'react';
import { authApi } from '@/src/features/auth/api/authApi';
import { toApiError } from '@/src/core/http/toApiError';
import { mapAuthError } from '@/src/features/auth/errors/mapAuthError';
import type { UiError } from '@/src/shared/errors/errorTypes';
import { useGlobalToast } from '@/src/shared/ui';

export type RegisterState = {
  isLoading: boolean;
  error: UiError | null;
};

export type RegisterActions = {
  /**
   * Register a new account. Resolves with the registered email when the backend has accepted
   * the registration and sent the verification code — the caller should navigate to the verify
   * screen with that email. Resolves with null on failure (with `state.error` populated).
   */
  register: (email: string, password: string) => Promise<string | null>;
  clearError: () => void;
};

export type RegisterView = {
  state: RegisterState;
  actions: RegisterActions;
};

export const useRegister = (): RegisterView => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<UiError | null>(null);
  const { showError } = useGlobalToast();

  const clearError = useCallback(() => setError(null), []);

  const register = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await authApi.register(email.trim(), password);
        return res.email;
      } catch (e) {
        const uiErr = mapAuthError(toApiError(e));
        setError(uiErr);
        if (uiErr.kind === 'rate_limit' || uiErr.kind === 'network' || uiErr.kind === 'unknown') {
          showError(uiErr);
        }
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [showError],
  );

  const state = useMemo<RegisterState>(() => ({ isLoading, error }), [isLoading, error]);
  const actions = useMemo<RegisterActions>(
    () => ({ register, clearError }),
    [register, clearError],
  );
  return useMemo(() => ({ state, actions }), [state, actions]);
};
