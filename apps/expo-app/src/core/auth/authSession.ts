import { tokenStore } from './tokenStore';
import type { AuthTokens } from '@/src/features/auth/types';
import { HttpError } from '@/src/core/http/HttpError';
import { identityAuthApi } from '@/src/core/auth/identityAuthApi';
import { authEvents } from '@/src/core/auth/authEvents';

const NO_REFRESH_TOKEN = 'NO_REFRESH_TOKEN';

let refreshInFlight: Promise<AuthTokens> | null = null;

async function doRefresh(): Promise<AuthTokens> {
  const refreshToken = await tokenStore.getRefreshToken();
  if (!refreshToken) throw new Error(NO_REFRESH_TOKEN);
  return identityAuthApi.refresh(refreshToken);
}

export async function refreshSession(): Promise<string> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const tokens = await doRefresh();
      tokenStore.setAccessToken(tokens.accessToken);
      await tokenStore.setRefreshToken(tokens.refreshToken);
      return tokens;
    })().finally(() => {
      refreshInFlight = null;
    });
  }

  const tokens = await refreshInFlight;
  return tokens.accessToken;
}

export function isRefreshTokenInvalid(err: unknown): boolean {
  if (err instanceof HttpError) return err.status === 401 || err.status === 403;
  return err instanceof Error && err.message === NO_REFRESH_TOKEN;
}

/**
 * Canonical logout:
 * - Best-effort server logout
 * - Always clears local tokens
 * - Optionally emits loggedOut event (default true)
 */
export async function logoutAndClearTokens(opts?: { emitEvent?: boolean }): Promise<void> {
  const emitEvent = opts?.emitEvent ?? true;

  try {
    const refreshToken = await tokenStore.getRefreshToken();
    if (refreshToken) {
      await identityAuthApi.logout(refreshToken);
    }
  } catch {
    // best-effort
  } finally {
    await tokenStore.clearAll();
    if (emitEvent) authEvents.emit('loggedOut');
  }
}

/**
 * Boot-time session init:
 * - No global side effects
 * - Returns boolean only
 */
export async function initSession(): Promise<boolean> {
  const rt = await tokenStore.getRefreshToken();
  if (!rt) return false;

  try {
    await refreshSession();
    return true;
  } catch (err) {
    if (isRefreshTokenInvalid(err)) {
      await tokenStore.clearAll();
    }
    return false;
  }
}
