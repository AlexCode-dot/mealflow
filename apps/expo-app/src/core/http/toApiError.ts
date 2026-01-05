import { HttpError } from './HttpError';
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

function asFieldErrorsObject(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;

  const obj = value as Record<string, unknown>;
  const entries = Object.entries(obj);

  // { email: "msg" }
  const allStrings = entries.every(([, v]) => typeof v === 'string');
  if (allStrings) {
    return Object.fromEntries(entries.map(([k, v]) => [k, String(v)]));
  }

  // { email: ["msg1", "msg2"] } -> take first string
  const allStringArrays = entries.every(
    ([, v]) => Array.isArray(v) && (v as unknown[]).every((x) => typeof x === 'string'),
  );
  if (allStringArrays) {
    return Object.fromEntries(entries.map(([k, v]) => [k, String((v as string[])[0] ?? '')]));
  }

  return undefined;
}

export function toApiError(err: unknown): ApiError {
  // fetch failures / offline / DNS / CORS etc
  if (err instanceof TypeError) {
    return { kind: 'network' };
  }

  if (err instanceof HttpError) {
    const problem = asProblem(err.body);

    const fieldErrorsFromArray = isFieldErrorArray(problem.errors)
      ? Object.fromEntries(problem.errors.map((e) => [e.field, e.message]))
      : undefined;

    const fieldErrorsFromObject =
      fieldErrorsFromArray ?? asFieldErrorsObject(problem.errors) ?? undefined;

    return {
      kind: 'http',
      status: err.status,
      title: typeof problem.title === 'string' ? problem.title : undefined,
      detail: typeof problem.detail === 'string' ? problem.detail : undefined,
      fieldErrors: fieldErrorsFromObject,
      body: err.body,
    };
  }

  return { kind: 'unknown' };
}
