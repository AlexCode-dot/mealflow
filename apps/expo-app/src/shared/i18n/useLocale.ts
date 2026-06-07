import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { secureStorage } from '@/src/core/storage/secureStorage';

export type Language = 'auto' | 'en' | 'sv';

const LANGUAGE_KEY = 'app_language';
const SUPPORTED_LOCALES = ['en', 'sv'] as const;

export async function getStoredLanguage(): Promise<Language> {
  const stored = await secureStorage.getItem(LANGUAGE_KEY);
  if (stored === 'auto' || stored === 'en' || stored === 'sv') return stored;
  return 'auto';
}

export async function applyLanguage(language: Language, deviceLng: string): Promise<void> {
  const { default: i18n } = await import('./i18n');
  const lng =
    language === 'auto'
      ? (SUPPORTED_LOCALES.includes(deviceLng as (typeof SUPPORTED_LOCALES)[number])
          ? deviceLng
          : 'en')
      : language;
  await i18n.changeLanguage(lng);
}

export function useLocale() {
  const { i18n } = useTranslation();

  const setLanguage = useCallback(
    async (language: Language) => {
      await secureStorage.setItem(LANGUAGE_KEY, language);
      if (language === 'auto') {
        const { getLocales } = await import('expo-localization');
        const deviceLocale = getLocales()[0]?.languageCode ?? 'en';
        const lng = SUPPORTED_LOCALES.includes(
          deviceLocale as (typeof SUPPORTED_LOCALES)[number],
        )
          ? deviceLocale
          : 'en';
        await i18n.changeLanguage(lng);
      } else {
        await i18n.changeLanguage(language);
      }
    },
    [i18n],
  );

  return { setLanguage };
}
