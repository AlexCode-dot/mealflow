import { createContext, useCallback, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { UiError } from '@/src/shared/errors/errorTypes';
import { useToastState, type ToastState } from '@/src/shared/hooks/useToastState';

type GlobalToastApi = {
  toast: ToastState | null;
  show: (next: ToastState) => void;
  clear: () => void;
  showError: (err: UiError, opts?: { onRetry?: () => void; retryLabel?: string }) => void;
  showValidationError: (message: string) => void;
  showApiError: (err: UiError, prefix?: string) => void;
};

const GlobalToastContext = createContext<GlobalToastApi | null>(null);

type Props = {
  children: ReactNode;
};

export function GlobalToastProvider({ children }: Props) {
  const { toast, show, clear } = useToastState();

  const showError: GlobalToastApi['showError'] = useCallback(
    (err, opts) => {
      const retry = typeof err.retryAfterSeconds === 'number' ? err.retryAfterSeconds : undefined;
      const isRateLimit = err.status === 429 || err.kind === 'rate_limit';
      const message = isRateLimit ? 'Too many requests.' : err.message;
      const durationMs = isRateLimit ? (retry ? Math.max(8000, (retry + 4) * 1000) : 8000) : 8000;
      show({
        variant: 'error',
        title: isRateLimit ? undefined : err.status === 429 ? 'Too many requests' : undefined,
        message,
        durationMs,
        retryAfterSeconds: retry,
        actionLabel: opts?.retryLabel ?? (opts?.onRetry ? 'Retry' : undefined),
        onAction: opts?.onRetry,
      });
    },
    [show],
  );

  const showValidationError = useCallback<GlobalToastApi['showValidationError']>(
    (message) => {
      showError({ kind: 'validation', message });
    },
    [showError],
  );

  const showApiError = useCallback<GlobalToastApi['showApiError']>(
    (err, prefix) => {
      const trimmedPrefix = prefix?.trim();
      const message = trimmedPrefix ? `${trimmedPrefix}. ${err.message}`.trim() : err.message;
      showError({ ...err, message });
    },
    [showError],
  );

  const value = useMemo(
    () => ({
      toast,
      show,
      clear,
      showError,
      showValidationError,
      showApiError,
    }),
    [toast, show, clear, showError, showValidationError, showApiError],
  );

  return <GlobalToastContext.Provider value={value}>{children}</GlobalToastContext.Provider>;
}

export function useGlobalToast() {
  const ctx = useContext(GlobalToastContext);
  if (!ctx) {
    throw new Error('useGlobalToast must be used within GlobalToastProvider');
  }
  return ctx;
}
