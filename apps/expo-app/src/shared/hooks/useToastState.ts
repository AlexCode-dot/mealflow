import { useCallback, useState } from 'react';

export type ToastVariant = 'success' | 'error' | 'info';

export type ToastState = {
  variant: ToastVariant;
  title?: string;
  message: string;
  meta?: string;
  durationMs?: number;
  actionLabel?: string;
  actionDisabled?: boolean;
  onAction?: () => void;
  retryAfterSeconds?: number;
};

export function useToastState() {
  const [toast, setToast] = useState<ToastState | null>(null);

  const show = useCallback((next: ToastState) => {
    setToast(next);
  }, []);

  const clear = useCallback(() => {
    setToast(null);
  }, []);

  return { toast, show, clear };
}
