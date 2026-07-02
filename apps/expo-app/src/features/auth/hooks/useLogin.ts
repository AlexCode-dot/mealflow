import { useCallback, useMemo, useState } from 'react';
import { authApi } from '@/src/features/auth/api/authApi';
import { tokenStore } from '@/src/core/auth/tokenStore';
import { authEvents } from '@/src/core/auth/authEvents';
import { toApiError } from '@/src/core/http/toApiError';
import { mapAuthError } from '@/src/features/auth/errors/mapAuthError';
import type { UiError } from '@/src/shared/errors/errorTypes';
import { useGlobalToast } from '@/src/shared/ui';

export type LoginOutcome =
  | { kind: 'success' }
  | { kind: 'verification-required'; email: string }
  | { kind: 'error' };

export type LoginState = {
  isLoading: boolean;
  error: UiError | null;
};

export type LoginActions = {
  login: (email: string, password: string) => Promise<LoginOutcome>;
  clearError: () => void;
};

export type LoginView = {
  state: LoginState;
  actions: LoginActions;
};

export const useLogin = (): LoginView => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<UiError | null>(null);
  const { showError } = useGlobalToast();

  const clearError = useCallback(() => setError(null), []);

  const login = useCallback(
    async (email: string, password: string): Promise<LoginOutcome> => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await authApi.login(email.trim(), password);
        tokenStore.setAccessToken(res.accessToken);
        await tokenStore.setRefreshToken(res.refreshToken);
        authEvents.emit('loggedIn');
        return { kind: 'success' };
      } catch (e) {
        const apiErr = toApiError(e);
        if (apiErr.kind === 'http' && apiErr.code === 'EMAIL_NOT_VERIFIED') {
          // Login never issues a verification code, so proactively (re)send one — otherwise the
          // user lands on the verify screen with no fresh code. Ignore failures (e.g. resend
          // cooldown): the previously issued code is still usable in that case.
          await authApi.resendVerification(email.trim()).catch(() => {});
          return { kind: 'verification-required', email: email.trim() };
        }
        const uiErr = mapAuthError(apiErr);
        setError(uiErr);
        if (uiErr.kind === 'rate_limit' || uiErr.kind === 'network' || uiErr.kind === 'unknown') {
          showError(uiErr);
        }
        return { kind: 'error' };
      } finally {
        setIsLoading(false);
      }
    },
    [showError],
  );

  const state = useMemo<LoginState>(() => ({ isLoading, error }), [isLoading, error]);
  const actions = useMemo<LoginActions>(() => ({ login, clearError }), [login, clearError]);
  return useMemo(() => ({ state, actions }), [state, actions]);
};
