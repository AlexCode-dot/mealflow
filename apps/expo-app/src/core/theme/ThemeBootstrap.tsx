import { useEffect } from 'react';
import { profileApi } from '@/src/features/profile/api/profileApi';
import { tokenStore } from '@/src/core/auth/tokenStore';
import { authEvents } from '@/src/core/auth/authEvents';
import { initSession } from '@/src/core/auth/authSession';
import { DEFAULT_THEME_NAME, isThemeName, useThemeController } from '@/src/shared/theme';

export function ThemeBootstrap() {
  const { setThemeName } = useThemeController();

  useEffect(() => {
    let isMounted = true;

    const loadTheme = async () => {
      if (!tokenStore.hasAccessToken()) {
        const ok = await initSession();
        if (!ok) {
          if (isMounted) setThemeName(DEFAULT_THEME_NAME);
          return;
        }
      }
      try {
        const res = await profileApi.get();
        const themeName = isThemeName(res.theme ?? '') ? res.theme : DEFAULT_THEME_NAME;
        if (isMounted) setThemeName(themeName);
      } catch {
        if (isMounted) setThemeName(DEFAULT_THEME_NAME);
      }
    };

    void loadTheme();

    const unsubscribe = authEvents.subscribe((event) => {
      if (event === 'loggedOut') {
        setThemeName(DEFAULT_THEME_NAME);
        return;
      }
      if (event === 'loggedIn') {
        void loadTheme();
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [setThemeName]);

  return null;
}
