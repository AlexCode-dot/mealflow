import { Redirect } from 'expo-router';
import type { RedirectProps } from 'expo-router';
import { useEffect, useState } from 'react';
import { initSession } from '@/src/core/auth/authSession';
import { tokenStore } from '@/src/core/auth/tokenStore';
import { LoadingScreen } from '@/src/shared/ui/LoadingScreen';

export default function Index() {
  const [target, setTarget] = useState<RedirectProps['href'] | null>(null);

  useEffect(() => {
    (async () => {
      // Fast path: hot reload / in-memory token
      if (tokenStore.hasAccessToken()) {
        setTarget('/(app)/home');
        return;
      }

      // Cold start: try refresh
      const ok = await initSession();
      setTarget(ok ? '/(app)/home' : '/(auth)/login');
    })();
  }, []);

  if (!target) return <LoadingScreen />;

  return <Redirect href={target} />;
}
