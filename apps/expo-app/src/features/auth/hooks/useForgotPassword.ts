import { useCallback, useState } from 'react';
import { authApi } from '@/src/features/auth/api/authApi';
import { toApiError } from '@/src/core/http/toApiError';
import { mapAuthError } from '@/src/features/auth/errors/mapAuthError';
import { useGlobalToast } from '@/src/shared/ui';

export function useForgotPassword() {
  const { showError } = useGlobalToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Request a reset code. Always resolves true on a 202 (the backend never reveals whether the
   * email exists); only network/unknown failures return false and surface a toast.
   */
  const request = useCallback(
    async (email: string): Promise<boolean> => {
      setIsSubmitting(true);
      try {
        await authApi.forgotPassword(email.trim());
        return true;
      } catch (e) {
        const uiErr = mapAuthError(toApiError(e));
        showError(uiErr);
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [showError],
  );

  return { isSubmitting, request };
}
