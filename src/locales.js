// The translations themselves, without React: used by the useTranslation hook
// (i18n.js), and by code that runs outside components (loading data).
//
// Every file in data/locales/ is a language, keyed by its file name ("ro.json" -> "ro").
// To add a language, copy en.json, translate it and set meta.name to the
// language's own name; it then appears in the language menu.
// Texts missing from a translation fall back to English.
export const FALLBACK_LOCALE = 'en';

export const locales = Object.fromEntries(
  Object.entries(import.meta.glob('./data/locales/*.json', { eager: true, import: 'default' }))
    .map(([path, translations]) => [path.split('/').pop().replace('.json', ''), translations])
);

// For the language menu, sorted by name
export const localeOptions = Object.entries(locales)
  .map(([code, translations]) => ({ code, name: translations.meta?.name ?? code }))
  .sort((a, b) => a.name.localeCompare(b.name));

// First run: the system language if we have it, otherwise English
const detectLocale = () => {
  const preferred = typeof navigator === 'undefined' ? [] : navigator.languages ?? [navigator.language];
  for (const language of preferred) {
    const code = language?.toLowerCase().split('-')[0];
    if (locales[code]) return code;
  }
  return FALLBACK_LOCALE;
};

// The language in use: the chosen one (settings.locale), or the system's
export const resolveLocale = (chosen) => (locales[chosen] ? chosen : detectLocale());

const lookupIn = (key, locale) =>
  key.split('.').reduce((value, k) => value?.[k], locales[locale]);

// The text for a key, or undefined if no language has it
export const lookup = (key, locale) => lookupIn(key, locale) ?? lookupIn(key, FALLBACK_LOCALE);
