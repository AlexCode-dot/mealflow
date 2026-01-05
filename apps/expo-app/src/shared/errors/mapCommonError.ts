import type { ApiError } from '@/src/core/http/apiErrorTypes';
import type { UiError } from '@/src/shared/errors/errorTypes';

export function mapCommonError(apiErr: ApiError): UiError {
  if (apiErr.kind === 'network') {
    return { kind: 'network', message: 'You seem offline. Check your connection.' };
  }

  if (apiErr.kind === 'http') {
    // keep generic (don’t leak backend titles all over UI)
    return { kind: 'unknown', message: apiErr.detail || 'Something went wrong. Please try again.' };
  }

  return { kind: 'unknown', message: 'Something went wrong. Please try again.' };
}
