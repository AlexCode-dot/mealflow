import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authApi } from '@/src/features/auth/api/authApi';
import { tokenStore } from '@/src/core/auth/tokenStore';
import { authEvents } from '@/src/core/auth/authEvents';
import { toApiError } from '@/src/core/http/toApiError';
import { mapAuthError } from '@/src/features/auth/errors/mapAuthError';
import type { UiError } from '@/src/shared/errors/errorTypes';
import { useGlobalToast } from '@/src/shared/ui';

export type VerifyEmailState = {
  isSubmitting: boolean;
  isResending: boolean;
  /** Seconds remaining until the next resend is allowed. 0 means the button is ready. */
  resendCooldown: number;
  error: UiError | null;
};

export type VerifyEmailActions = {
  /**
   * Verify the supplied code. Returns true when the code was accepted (the user has been
   * automatically logged in by the time this resolves).
   */
  submit: (code: string) => Promise<boolean>;
  /** Request a fresh code. Returns true on success — false means the cooldown error was set. */
  resend: () => Promise<boolean>;
  clearError: () => void;
};

export type VerifyEmailView = {
  state: VerifyEmailState;
  actions: VerifyEmailActions;
};

const DEFAULT_RESEND_COOLDOWN_SECONDS = 60;

export function useVerifyEmail(email: string): VerifyEmailView {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<UiError | null>(null);
  const [resendCooldown, setResendCooldown] = useState(DEFAULT_RESEND_COOLDOWN_SECONDS);
  const { showError } = useGlobalToast();
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Count the cooldown down every second.
  useEffect(() => {
    if (resendCooldown <= 0) return;
    tickRef.current = setInterval(() => {
      setResendCooldown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [resendCooldown]);

  const clearError = useCallback(() => setError(null), []);

  const submit = useCallback(
    async (code: string): Promise<boolean> => {
      setIsSubmitting(true);
      setError(null);
      try {
        const tokens = await authApi.verifyEmail(email, code.trim());
        tokenStore.setAccessToken(tokens.accessToken);
        await tokenStore.setRefreshToken(tokens.refreshToken);
        authEvents.emit('loggedIn');
        return true;
      } catch (e) {
        const apiErr = toApiError(e);
        if (apiErr.kind === 'http' && apiErr.code === 'INVALID_VERIFICATION_CODE') {
          setError({
            kind: 'validation',
            message: apiErr.detail || t('auth.invalidCode'),
            status: apiErr.status,
          });
          return false;
        }
        const uiErr = mapAuthError(apiErr);
        setError(uiErr);
        if (uiErr.kind === 'rate_limit' || uiErr.kind === 'network' || uiErr.kind === 'unknown') {
          showError(uiErr);
        }
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [email, showError, t],
  );

  const resend = useCallback(async (): Promise<boolean> => {
    setIsResending(true);
    setError(null);
    try {
      await authApi.resendVerification(email);
      setResendCooldown(DEFAULT_RESEND_COOLDOWN_SECONDS);
      return true;
    } catch (e) {
      const apiErr = toApiError(e);
      if (apiErr.kind === 'http' && apiErr.code === 'VERIFICATION_RESEND_COOLDOWN') {
        const wait = apiErr.retryAfterSeconds ?? DEFAULT_RESEND_COOLDOWN_SECONDS;
        setResendCooldown(wait);
        setError({
          kind: 'rate_limit',
          message: t('auth.resendWait', { seconds: wait }),
          status: apiErr.status,
          retryAfterSeconds: wait,
        });
        return false;
      }
      const uiErr = mapAuthError(apiErr);
      setError(uiErr);
      showError(uiErr);
      return false;
    } finally {
      setIsResending(false);
    }
  }, [email, showError, t]);

  const state = useMemo<VerifyEmailState>(
    () => ({ isSubmitting, isResending, resendCooldown, error }),
    [isSubmitting, isResending, resendCooldown, error],
  );
  const actions = useMemo<VerifyEmailActions>(
    () => ({ submit, resend, clearError }),
    [submit, resend, clearError],
  );
  return useMemo(() => ({ state, actions }), [state, actions]);
}
