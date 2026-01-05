import { HttpError } from './HttpError';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

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

export async function request<T>(
  baseUrl: string,
  path: string,
  method: HttpMethod,
  options?: {
    body?: unknown;
    headers?: Record<string, string>;
  },
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers ?? {}),
  };

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
