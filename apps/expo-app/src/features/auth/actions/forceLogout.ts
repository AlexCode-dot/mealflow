import { logoutAndClearTokens } from '@/src/core/auth/authSession';

/**
 * User-initiated logout action.
 * Calls core auth logout and triggers app-level auth flow.
 */
export async function forceLogout(): Promise<void> {
  await logoutAndClearTokens();
}
