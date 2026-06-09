import type { ApiError } from '@/src/core/http/apiErrorTypes';
import type { UiError } from '@/src/shared/errors/errorTypes';
import i18n from '@/src/shared/i18n/i18n';

export function mapCommonError(apiErr: ApiError): UiError {
  if (apiErr.kind === 'network') {
    return { kind: 'network', message: i18n.t('errors.offline') };
  }

  if (apiErr.kind === 'http') {
    if (apiErr.status === 429) {
      const retry =
        typeof apiErr.retryAfterSeconds === 'number' && apiErr.retryAfterSeconds > 0
          ? apiErr.retryAfterSeconds
          : undefined;
      return {
        kind: 'rate_limit',
        message: retry ? i18n.t('errors.tooManyRequests') : i18n.t('errors.tooManyRequestsRetry'),
        status: apiErr.status,
        retryAfterSeconds: retry,
      };
    }

    // keep generic (don’t leak backend titles all over UI)
    return { kind: 'unknown', message: apiErr.detail || i18n.t('errors.generic') };
  }

  return { kind: 'unknown', message: i18n.t('errors.generic') };
}
