import { useEffect, useState } from 'react';
import type { RedirectProps } from 'expo-router';
import { initSession } from '@/src/core/auth/authSession';
import { tokenStore } from '@/src/core/auth/tokenStore';
import { routes } from '@/src/core/navigation/routes';

export function useBootstrapRedirect() {
  const [target, setTarget] = useState<RedirectProps['href'] | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      if (tokenStore.hasAccessToken()) {
        if (alive) setTarget(routes.overview);
        return;
      }

      try {
        const ok = await initSession();
        if (alive) setTarget(ok ? routes.overview : routes.login);
      } catch {
        if (alive) setTarget(routes.login);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return target;
}
