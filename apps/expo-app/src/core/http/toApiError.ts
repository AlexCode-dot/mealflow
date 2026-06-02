import { HttpError } from './HttpError';
import type { ApiError, ApiProblemDetails } from './apiErrorTypes';

type FieldError = { field: string; message: string };
type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

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
    value.every((e) => isRecord(e) && typeof e.field === 'string' && typeof e.message === 'string')
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

    const retryValue = isRecord(problem) ? problem.retryAfterSeconds : undefined;
    const retryAfterSeconds =
      typeof retryValue === 'number'
        ? retryValue
        : typeof retryValue === 'string'
          ? Number.parseInt(retryValue, 10)
          : undefined;

    const codeValue = isRecord(problem) ? (problem as UnknownRecord).code : undefined;

    return {
      kind: 'http',
      status: err.status,
      title: typeof problem.title === 'string' ? problem.title : undefined,
      detail: typeof problem.detail === 'string' ? problem.detail : undefined,
      code: typeof codeValue === 'string' ? codeValue : undefined,
      fieldErrors: fieldErrorsFromObject,
      retryAfterSeconds: Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined,
      body: err.body,
    };
  }

  return { kind: 'unknown' };
}
