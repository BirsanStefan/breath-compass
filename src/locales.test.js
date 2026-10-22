import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FALLBACK_LOCALE, locales, lookup } from './locales';
import { PHASE_TYPES } from './exerciseDraft';
import { defaultExercises, exerciseLevels } from './storage/appData';

const english = locales[FALLBACK_LOCALE];
const otherLocales = Object.keys(locales).filter((code) => code !== FALLBACK_LOCALE);

// "a.b.c" for every text in a translation file
const keysOf = (object, prefix = '') =>
  Object.entries(object).flatMap(([key, value]) =>
    value && typeof value === 'object' ? keysOf(value, `${prefix}${key}.`) : [`${prefix}${key}`]);

// Plural texts are objects of Intl plural categories: { one, few, other }
const PLURAL_CATEGORIES = ['zero', 'one', 'two', 'few', 'many', 'other'];
const isPluralKey = (key) => PLURAL_CATEGORIES.includes(key.split('.').pop());

// The app's source files (not tests)
const srcDir = fileURLToPath(new URL('.', import.meta.url));
const sourceFiles = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  if (statSync(path).isDirectory()) return sourceFiles(path);
  return /\.(js|jsx)$/.test(name) && !name.includes('.test.') ? [path] : [];
});
const source = sourceFiles(srcDir).map((path) => readFileSync(path, 'utf8')).join('\n');

describe('translations', () => {
  it.each(otherLocales)('%s has every English text', (code) => {
    const theirs = new Set(keysOf(locales[code]));
    const missing = keysOf(english).filter((key) => !theirs.has(key) && !isPluralKey(key));
    expect(missing).toEqual([]);
  });

  it.each(otherLocales)('%s has no texts English lacks (typos, leftovers)', (code) => {
    const ours = new Set(keysOf(english));
    const extra = keysOf(locales[code]).filter((key) => !ours.has(key) && !isPluralKey(key));
    expect(extra).toEqual([]);
  });

  it('has every text the code asks for by name', () => {
    const used = [...new Set([...source.matchAll(/\bt\(\s*['"]([\w.]+)['"]/g)].map((match) => match[1]))];
    expect(used.length).toBeGreaterThan(100); // the search itself works
    expect(used.filter((key) => typeof lookup(key, FALLBACK_LOCALE) !== 'string')).toEqual([]);
  });

  it('names every phase, and the countdown', () => {
    for (const type of [...PHASE_TYPES, 'prepare']) expect(typeof english.phases[type]).toBe('string');
  });

  it('has every editor error message', () => {
    for (const key of ['nameRequired', 'cyclesInvalid', 'phasesRequired', 'durationInvalid']) {
      expect(typeof english.settings.errors[key]).toBe('string');
    }
  });

  it('describes every built-in exercise in the Guide', () => {
    for (const exercise of defaultExercises) {
      const { id } = exercise;
      expect(typeof english.exercises.names[id]).toBe('string');
      expect(typeof english.guide.exerciseText[id]).toBe('string');
      // Advanced exercises list their levels instead of a tip on varying them
      if (!exerciseLevels(exercise)) expect(typeof english.guide.exerciseTune[id]).toBe('string');
    }
  });
});

describe('plurals', () => {
  const pluralKeys = [...new Set([...source.matchAll(/\bplural\(\s*['"]([\w.]+)['"]/g)].map((match) => match[1]))];

  it('finds the plural texts in the code', () => {
    expect(pluralKeys.length).toBeGreaterThan(0);
  });

  // Romanian: one (1 zi), few (2 zile, 19 zile), other (20 de zile).
  // A missing form would quietly fall back to "other" ("1 de zile").
  it.each(Object.keys(locales))('%s has every plural form its language needs', (code) => {
    const needed = new Intl.PluralRules(code).resolvedOptions().pluralCategories;
    for (const key of pluralKeys) {
      for (const category of needed) {
        expect(typeof lookup(key, code)?.[category], `${code}: ${key}.${category}`).toBe('string');
      }
    }
  });
});
