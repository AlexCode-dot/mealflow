import { useEffect } from 'react';
import { getLocales } from 'expo-localization';
import { getStoredLanguage, applyLanguage } from './useLocale';
import { authEvents } from '@/src/core/auth/authEvents';

export function I18nBootstrap() {
  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      const deviceLng = getLocales()[0]?.languageCode ?? 'en';
      const storedLanguage = await getStoredLanguage();
      if (isMounted) {
        await applyLanguage(storedLanguage, deviceLng);
      }
    };

    void bootstrap();

    const unsubscribe = authEvents.subscribe((event) => {
      if (event === 'loggedIn') {
        void bootstrap();
      }
      if (event === 'loggedOut') {
        const deviceLng = getLocales()[0]?.languageCode ?? 'en';
        void applyLanguage('auto', deviceLng);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return null;
}
