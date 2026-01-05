import { ENV } from '@/src/core/config/env';
import { tokenStore } from '@/src/core/auth/tokenStore';
import {
  refreshSession,
  logoutAndClearTokens,
  isRefreshTokenInvalid,
} from '@/src/core/auth/authSession';
import { HttpError } from './HttpError';
import { request } from './request';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

async function authedRequest<T>(
  path: string,
  method: HttpMethod,
  options?: { body?: unknown; accessTokenOverride?: string },
): Promise<T> {
  const token = options?.accessTokenOverride ?? tokenStore.getAccessToken();

  return request<T>(ENV.APP_API_BASE_URL, path, method, {
    body: options?.body,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

async function requestWithAutoRefresh<T>(
  path: string,
  method: HttpMethod,
  options?: { body?: unknown },
): Promise<T> {
  try {
    return await authedRequest<T>(path, method, { body: options?.body });
  } catch (err) {
    if (err instanceof HttpError && err.status === 401) {
      try {
        const newAccess = await refreshSession();
        return await authedRequest<T>(path, method, {
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

export const httpClient = {
  identity: {
    post: <T>(path: string, body: unknown) =>
      request<T>(ENV.IDENTITY_BASE_URL, path, 'POST', { body }),
  },

  appApi: {
    get: <T>(path: string) => requestWithAutoRefresh<T>(path, 'GET'),
    post: <T>(path: string, body: unknown) => requestWithAutoRefresh<T>(path, 'POST', { body }),
    put: <T>(path: string, body: unknown) => requestWithAutoRefresh<T>(path, 'PUT', { body }),
    patch: <T>(path: string, body: unknown) => requestWithAutoRefresh<T>(path, 'PATCH', { body }),
    delete: <T>(path: string) => requestWithAutoRefresh<T>(path, 'DELETE'),
  },
};
