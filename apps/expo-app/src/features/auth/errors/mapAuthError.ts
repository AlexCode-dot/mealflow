import type { ApiError } from '@/src/core/http/apiErrorTypes';
import type { UiError } from '@/src/shared/errors/errorTypes';
import i18n from '@/src/shared/i18n/i18n';

// Convert backend validator messages to user-friendly copy.
function normalizeAuthFieldMessage(field: string, raw: string): string {
  const msg = raw.trim().toLowerCase();

  if (field === 'email') {
    if (msg.includes('well-formed')) return i18n.t('errors.emailInvalid');
    if (msg.includes('must not be blank')) return i18n.t('errors.emailRequired');
    return i18n.t('errors.emailCheck');
  }

  if (field === 'password') {
    if (msg.includes('size must be between')) return i18n.t('errors.passwordTooShort');
    if (msg.includes('must not be blank')) return i18n.t('errors.passwordRequired');
    return i18n.t('errors.passwordCheck');
  }

  return raw.trim() || i18n.t('errors.fieldCheck');
}

export function mapAuthError(apiErr: ApiError): UiError {
  if (apiErr.kind === 'network') {
    return { kind: 'network', message: i18n.t('errors.networkRetry') };
  }

  if (apiErr.kind === 'unknown') {
    return { kind: 'unknown', message: i18n.t('errors.generic') };
  }

  // kind === 'http'
  const status = apiErr.status;

  // Auth-safe login message (don’t leak whether email exists)
  if (status === 401) {
    return { kind: 'auth', message: i18n.t('errors.invalidCredentials'), status };
  }

  if (status === 429) {
    const retry =
      typeof apiErr.retryAfterSeconds === 'number' && apiErr.retryAfterSeconds > 0
        ? apiErr.retryAfterSeconds
        : undefined;
    return {
      kind: 'rate_limit',
      message: retry ? i18n.t('errors.tooManyRequests') : i18n.t('errors.tooManyRequestsRetry'),
      status,
      retryAfterSeconds: retry,
    };
  }

  // Register conflict -> inline on email
  if (status === 409) {
    const msg = i18n.t('errors.emailExists');
    return {
      kind: 'conflict',
      message: msg,
      fieldErrors: { email: msg },
      status,
    };
  }

  // Validation
  if (status === 400) {
    const normalizedFieldErrors = apiErr.fieldErrors
      ? Object.fromEntries(
          Object.entries(apiErr.fieldErrors).map(([field, raw]) => [
            field,
            normalizeAuthFieldMessage(field, raw),
          ]),
        )
      : undefined;

    const firstFieldMsg =
      normalizedFieldErrors && Object.values(normalizedFieldErrors).length > 0
        ? Object.values(normalizedFieldErrors)[0]
        : undefined;

    return {
      kind: 'validation',
      message: firstFieldMsg ?? apiErr.detail ?? i18n.t('errors.checkDetails'),
      fieldErrors: normalizedFieldErrors,
      status,
    };
  }

  // Fallback for other status codes
  return {
    kind: 'unknown',
    message: apiErr.detail || i18n.t('errors.generic'),
    status,
  };
}
