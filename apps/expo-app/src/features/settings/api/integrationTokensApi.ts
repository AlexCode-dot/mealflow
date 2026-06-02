import { ENV } from '@/src/core/config/env';
import { tokenStore } from '@/src/core/auth/tokenStore';
import {
  refreshSession,
  logoutAndClearTokens,
  isRefreshTokenInvalid,
} from '@/src/core/auth/authSession';
import { HttpError } from '@/src/core/http/HttpError';
import { request } from '@/src/core/http/request';

export type IntegrationScope = 'recipes:read' | 'recipes:write';

export type IntegrationTokenSummary = {
  id: string;
  name: string;
  tokenPreview: string;
  scopes: IntegrationScope[];
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  expiresAt: string | null;
};

export type IssuedIntegrationToken = {
  id: string;
  name: string;
  token: string;
  tokenPreview: string;
  scopes: IntegrationScope[];
  createdAt: string;
  expiresAt: string | null;
};

export type CreateIntegrationTokenInput = {
  name: string;
  scopes: IntegrationScope[];
  expiresInDays: number | null;
};

type Method = 'GET' | 'POST' | 'DELETE';

async function authed<T>(path: string, method: Method, body?: unknown): Promise<T> {
  const call = (token: string | null) =>
    request<T>(ENV.IDENTITY_BASE_URL, path, method, {
      body,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

  try {
    return await call(tokenStore.getAccessToken());
  } catch (err) {
    if (err instanceof HttpError && err.status === 401) {
      try {
        const newAccess = await refreshSession();
        return await call(newAccess);
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

export const integrationTokensApi = {
  list(): Promise<IntegrationTokenSummary[]> {
    return authed<IntegrationTokenSummary[]>('/auth/integrations', 'GET');
  },

  create(input: CreateIntegrationTokenInput): Promise<IssuedIntegrationToken> {
    return authed<IssuedIntegrationToken>('/auth/integrations', 'POST', {
      name: input.name,
      scopes: input.scopes,
      expiresInDays: input.expiresInDays ?? undefined,
    });
  },

  revoke(id: string): Promise<void> {
    return authed<void>(`/auth/integrations/${encodeURIComponent(id)}`, 'DELETE');
  },
};
