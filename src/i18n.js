import { useMemo } from 'react';
import { useAppData } from './AppData';
import { builtInText, USER_SOUND_PREFIX } from './storage/appData';
import { lookup, resolveLocale } from './locales';

export { locales, localeOptions } from './locales';

// Get translation by key (e.g., "session.start" -> "Pornește")
const getTranslation = (key, locale) => {
  const value = lookup(key, locale);
  if (value === undefined) {
    console.warn(`Translation key not found: ${key}`);
    return key;
  }
  return value;
};

// Custom hook for translations
export const useTranslation = () => {
  const { settings } = useAppData();
  const locale = resolveLocale(settings.locale);
  const t = (key) => getTranslation(key, locale);

  // Built-in exercises are translated (by id); your own show their own text
  const exerciseText = (exercise, field) => builtInText(exercise, field, locale) ?? exercise[field] ?? '';

  // Display name for a background sound: bundled sounds can have a translated
  // name under soundNames.<file name without extension>; otherwise (and for
  // imported sounds) the file name is tidied up: "ocean-waves.mp3" -> "Ocean waves"
  const soundName = (ref) => {
    const isUser = ref.startsWith(USER_SOUND_PREFIX);
    const file = isUser ? ref.slice(USER_SOUND_PREFIX.length) : ref;
    const base = file.replace(/\.[^.]+$/, '');
    const translated = isUser || base.includes('.') ? undefined : lookup(`soundNames.${base}`, locale);
    if (translated !== undefined) return translated;
    const words = base.replace(/[-_]+/g, ' ').trim() || file;
    return words.charAt(0).toUpperCase() + words.slice(1);
  };

  return { t, locale, exerciseText, soundName };
};

// Texts that depend on a number: "1 day", "2 days" (and in Romanian "1 zi",
// "2 zile", "20 de zile"). Keys hold one variant per plural category of the
// language (one, few, other…); a missing one falls back to "other".
export const usePlural = () => {
  const { t, locale } = useTranslation();
  const rules = useMemo(() => new Intl.PluralRules(locale), [locale]);
  return (key, n) => {
    const variant = t(`${key}.${rules.select(n)}`);
    return (variant.startsWith(key) ? t(`${key}.other`) : variant).replace('{n}', n);
  };
};
