import type { Translations } from './locales/en';

// Use the leaf-widened `Translations` (string leaves) rather than `typeof en` (literal
// leaves). The key structure is preserved either way, so `t()` autocomplete/validation
// still works — but t() now returns `string` instead of narrow literals like `"Save"`,
// which would otherwise poison inferred union types at call sites.
type TranslationKeys = Translations;

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: TranslationKeys;
    };
  }
}
