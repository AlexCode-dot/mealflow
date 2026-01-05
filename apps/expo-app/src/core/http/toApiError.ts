import { HttpError } from './httpClient';
import type { ApiError, ApiProblemDetails } from './apiErrorTypes';

type FieldError = { field: string; message: string };

function asProblem(body: unknown): ApiProblemDetails {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as ApiProblemDetails;
    } catch {
      return {};
    }
  }
  if (body && typeof body === 'object') return body as ApiProblemDetails;
  return {};
}

function isFieldErrorArray(value: unknown): value is FieldError[] {
  return (
    Array.isArray(value) &&
    value.every(
      (e) =>
        e &&
        typeof e === 'object' &&
        'field' in e &&
        'message' in e &&
        typeof (e as any).field === 'string' &&
        typeof (e as any).message === 'string',
    )
  );
}

export function toApiError(err: unknown): ApiError {
  // fetch failures / offline / DNS / CORS etc
  if (err instanceof TypeError) {
    return { kind: 'network' };
  }

  if (err instanceof HttpError) {
    const problem = asProblem(err.body);

    const fieldErrors = isFieldErrorArray(problem.errors)
      ? Object.fromEntries(problem.errors.map((e) => [e.field, e.message]))
      : undefined;

    return {
      kind: 'http',
      status: err.status,
      title: typeof problem.title === 'string' ? problem.title : undefined,
      detail: typeof problem.detail === 'string' ? problem.detail : undefined,
      fieldErrors,
      body: err.body,
    };
  }

  return { kind: 'unknown' };
}
