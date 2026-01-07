import { useEffect, useState } from 'react';
import type { RedirectProps } from 'expo-router';
import { initSession } from '@/src/core/auth/authSession';
import { tokenStore } from '@/src/core/auth/tokenStore';

export function useBootstrapRedirect() {
  const [target, setTarget] = useState<RedirectProps['href'] | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      if (tokenStore.hasAccessToken()) {
        if (alive) setTarget('/(app)/overview');
        return;
      }
      try {
        const ok = await initSession();
        if (alive) setTarget(ok ? '/(app)/overview' : '/(auth)/login');
      } catch {
        if (alive) setTarget('/(auth)/login');
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return target;
}
