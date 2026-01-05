import type { ApiError } from '@/src/core/http/apiErrorTypes';
import type { UiError } from '@/src/shared/errors/errorTypes';

// Convert backend validator messages to user-friendly copy.
function normalizeAuthFieldMessage(field: string, raw: string): string {
  const msg = raw.trim().toLowerCase();

  if (field === 'email') {
    if (msg.includes('well-formed')) return 'Please enter a valid email address.';
    if (msg.includes('must not be blank')) return 'Email is required.';
    return 'Please check your email address.';
  }

  if (field === 'password') {
    if (msg.includes('size must be between')) return 'Password must be at least 8 characters.';
    if (msg.includes('must not be blank')) return 'Password is required.';
    return 'Please check your password.';
  }

  return raw.trim() || 'Please check this field.';
}

export function mapAuthError(apiErr: ApiError): UiError {
  if (apiErr.kind === 'network') {
    return { kind: 'network', message: 'Network error. Check your connection and try again.' };
  }

  if (apiErr.kind === 'unknown') {
    return { kind: 'unknown', message: 'Something went wrong. Please try again.' };
  }

  // kind === 'http'
  const status = apiErr.status;

  // Auth-safe login message (don’t leak whether email exists)
  if (status === 401) {
    return { kind: 'auth', message: 'Invalid email or password.', status };
  }

  // Register conflict -> inline on email
  if (status === 409) {
    const msg = 'An account with this email already exists.';
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
      message: firstFieldMsg ?? apiErr.detail ?? 'Please check your details and try again.',
      fieldErrors: normalizedFieldErrors,
      status,
    };
  }

  // Fallback for other status codes
  return {
    kind: 'unknown',
    message: apiErr.detail || 'Something went wrong. Please try again.',
    status,
  };
}
