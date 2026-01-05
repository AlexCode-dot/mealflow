import { ENV } from '@/src/core/config/env';
import { tokenStore } from '@/src/core/auth/tokenStore';

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

async function parseResponseBody(res: Response): Promise<unknown> {
  const contentType = res.headers.get('content-type') ?? '';
  const isJson = contentType.includes('json');

  if (isJson) {
    try {
      return await res.json();
    } catch {
      const text = await res.text().catch(() => null);
      if (typeof text === 'string') {
        try {
          return JSON.parse(text);
        } catch {
          return text;
        }
      }
      return null;
    }
  }

  return res.text().catch(() => null);
}

async function request<T>(
  baseUrl: string,
  path: string,
  method: HttpMethod,
  options?: {
    body?: unknown;
    auth?: boolean;
  },
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options?.auth) {
    const token = tokenStore.getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await parseResponseBody(res);

  if (!res.ok) {
    const message =
      typeof data === 'object' &&
      data !== null &&
      'title' in data &&
      typeof (data as { title?: unknown }).title === 'string'
        ? String((data as { title: string }).title)
        : `Request failed (${res.status})`;

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
