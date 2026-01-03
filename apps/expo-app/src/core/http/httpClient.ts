import { ENV } from '../config/env';
import { tokenStore } from '../auth/tokenStore';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export class HttpError extends Error {
  status: number;
  body?: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(
  baseUrl: string,
  path: string,
  method: HttpMethod,
  options?: { body?: unknown; auth?: boolean },
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options?.auth) {
    const token = tokenStore.getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  const contentType = res.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');

  const data = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

  if (!res.ok) {
    const message =
      (typeof data === 'object' &&
      data &&
      'title' in data &&
      typeof (data as any).title === 'string'
        ? (data as any).title
        : `Request failed (${res.status})`) || `Request failed (${res.status})`;

    throw new HttpError(res.status, message, data);
  }

  return data as T;
}

export const httpClient = {
  identity: {
    post: <T>(path: string, body: unknown) =>
      request<T>(ENV.IDENTITY_BASE_URL, path, 'POST', { body }),
  },

  appApi: {
    get: <T>(path: string) => request<T>(ENV.APP_API_BASE_URL, path, 'GET', { auth: true }),
    post: <T>(path: string, body: unknown) =>
      request<T>(ENV.APP_API_BASE_URL, path, 'POST', { body, auth: true }),
  },
};
