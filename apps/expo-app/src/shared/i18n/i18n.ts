import 'intl-pluralrules';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import { en } from './locales/en';
import { sv } from './locales/sv';

const deviceLocale = getLocales()[0]?.languageCode ?? 'en';
const supportedLocales = ['en', 'sv'];
const detectedLng = supportedLocales.includes(deviceLocale) ? deviceLocale : 'en';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    sv: { translation: sv },
  },
  lng: detectedLng,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: 'v4',
});

export default i18n;
export type { Language } from './useLocale';
