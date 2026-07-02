import { useEffect, useState } from 'react';
import { authApi } from '@/src/features/auth/api/authApi';

/**
 * Fetches the signed-in user's email from identity (`GET /auth/me`). The email lives in
 * identity-service, not in the app-api profile, so it isn't part of the profile payload.
 * Returns null until loaded (or on failure), so callers can fall back to a placeholder.
 */
export function useAccountEmail(): string | null {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    authApi
      .me()
      .then((me) => {
        if (active) setEmail(me.email);
      })
      .catch(() => {
        // Leave null → caller shows its placeholder.
      });
    return () => {
      active = false;
    };
  }, []);

  return email;
}
