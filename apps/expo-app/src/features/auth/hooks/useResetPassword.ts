import { useCallback, useState } from 'react';
import { authApi } from '@/src/features/auth/api/authApi';
import { toApiError } from '@/src/core/http/toApiError';
import { mapAuthError } from '@/src/features/auth/errors/mapAuthError';
import type { UiError } from '@/src/shared/errors/errorTypes';
import { useGlobalToast } from '@/src/shared/ui';
import i18n from '@/src/shared/i18n/i18n';

export function useResetPassword(email: string) {
  const { showError } = useGlobalToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<UiError | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const submit = useCallback(
    async (code: string, newPassword: string): Promise<boolean> => {
      setIsSubmitting(true);
      setError(null);
      try {
        await authApi.resetPassword(email, code.trim(), newPassword);
        return true;
      } catch (e) {
        const apiErr = toApiError(e);
        // Wrong/expired reset code — show a localized message (backend detail is English).
        if (apiErr.kind === 'http' && apiErr.code === 'INVALID_VERIFICATION_CODE') {
          setError({ kind: 'validation', message: i18n.t('auth.invalidCode'), status: apiErr.status });
          return false;
        }
        // Password-policy failures also come back as 400 (with field errors).
        if (apiErr.kind === 'http' && apiErr.status === 400) {
          setError(mapAuthError(apiErr));
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
    [email, showError],
  );

  return { state: { isSubmitting, error }, actions: { submit, clearError } };
}
