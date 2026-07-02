import { ENV } from '@/src/core/config/env';
import { tokenStore } from '@/src/core/auth/tokenStore';
import {
  refreshSession,
  logoutAndClearTokens,
  isRefreshTokenInvalid,
} from '@/src/core/auth/authSession';
import { HttpError } from './HttpError';
import { parseResponseBody, request } from './request';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

async function authedRequest<T>(
  baseUrl: string,
  path: string,
  method: HttpMethod,
  options?: { body?: unknown; accessTokenOverride?: string },
): Promise<T> {
  const token = options?.accessTokenOverride ?? tokenStore.getAccessToken();

  return request<T>(baseUrl, path, method, {
    body: options?.body,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

async function requestWithAutoRefresh<T>(
  baseUrl: string,
  path: string,
  method: HttpMethod,
  options?: { body?: unknown },
): Promise<T> {
  try {
    return await authedRequest<T>(baseUrl, path, method, { body: options?.body });
  } catch (err) {
    if (err instanceof HttpError && err.status === 401) {
      try {
        const newAccess = await refreshSession();
        return await authedRequest<T>(baseUrl, path, method, {
          body: options?.body,
          accessTokenOverride: newAccess,
        });
      } catch (refreshErr) {
        if (isRefreshTokenInvalid(refreshErr)) {
          await logoutAndClearTokens(); // emits loggedOut internally
          throw err; // keep original 401 semantics
        }
        throw refreshErr;
      }
    }

    throw err;
  }
}

async function authedMultipartRequest<T>(
  path: string,
  formData: FormData,
  accessTokenOverride?: string,
): Promise<T> {
  const token = accessTokenOverride ?? tokenStore.getAccessToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${ENV.APP_API_BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData,
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

async function multipartWithAutoRefresh<T>(path: string, formData: FormData): Promise<T> {
  try {
    return await authedMultipartRequest<T>(path, formData);
  } catch (err) {
    if (err instanceof HttpError && err.status === 401) {
      try {
        const newAccess = await refreshSession();
        return await authedMultipartRequest<T>(path, formData, newAccess);
      } catch (refreshErr) {
        if (isRefreshTokenInvalid(refreshErr)) {
          await logoutAndClearTokens();
          throw err;
        }
        throw refreshErr;
      }
    }

    throw err;
  }
}

export const httpClient = {
  identity: {
    post: <T>(path: string, body: unknown) =>
      request<T>(ENV.IDENTITY_BASE_URL, path, 'POST', { body }),
    // Authenticated GET against identity (e.g. /auth/me) — attaches the access token and
    // retries once after a refresh on 401, same as app-api calls.
    get: <T>(path: string) => requestWithAutoRefresh<T>(ENV.IDENTITY_BASE_URL, path, 'GET'),
  },

  appApi: {
    get: <T>(path: string) => requestWithAutoRefresh<T>(ENV.APP_API_BASE_URL, path, 'GET'),
    post: <T>(path: string, body: unknown) =>
      requestWithAutoRefresh<T>(ENV.APP_API_BASE_URL, path, 'POST', { body }),
    put: <T>(path: string, body: unknown) =>
      requestWithAutoRefresh<T>(ENV.APP_API_BASE_URL, path, 'PUT', { body }),
    patch: <T>(path: string, body: unknown) =>
      requestWithAutoRefresh<T>(ENV.APP_API_BASE_URL, path, 'PATCH', { body }),
    delete: <T>(path: string) => requestWithAutoRefresh<T>(ENV.APP_API_BASE_URL, path, 'DELETE'),
    upload: <T>(path: string, formData: FormData) => multipartWithAutoRefresh<T>(path, formData),
  },
};
