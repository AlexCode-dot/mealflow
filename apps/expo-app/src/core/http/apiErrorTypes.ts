export type ApiErrorKind = 'network' | 'http' | 'unknown';

export type ApiProblemDetails = {
  title?: string;
  detail?: string;
  status?: number;
  path?: string;
  instance?: string;

  // backend may return: errors: [{ field, message }]
  errors?: unknown;
};

export type ApiError = {
  kind: ApiErrorKind;
  status?: number;

  // best-effort from problem+json
  title?: string;
  detail?: string;

  // raw field errors from backend (NOT user-friendly)
  fieldErrors?: Record<string, string>;

  // keep raw body for debugging if needed
  body?: unknown;
};
