export type ApiErrorKind = 'network' | 'http' | 'unknown';

export type ApiProblemDetails = {
  title?: string;
  detail?: string;
  status?: number;
  path?: string;
  instance?: string;
  retryAfterSeconds?: number;

  // backend may return: errors: [{ field, message }]
  errors?: unknown;
};

export type ApiError = {
  kind: ApiErrorKind;
  status?: number;
  retryAfterSeconds?: number;

  // best-effort from problem+json
  title?: string;
  detail?: string;

  /**
   * Application-specific error code surfaced by the backend (e.g. `EMAIL_NOT_VERIFIED`).
   * Used to branch UI flows beyond just the HTTP status.
   */
  code?: string;

  // raw field errors from backend (NOT user-friendly)
  fieldErrors?: Record<string, string>;

  // keep raw body for debugging if needed
  body?: unknown;
};
