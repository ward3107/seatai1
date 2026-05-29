import { describe, it, expect } from 'vitest';
import en from './en.json';
import he from './he.json';
import ar from './ar.json';
import ru from './ru.json';

/**
 * Guards against the recurring "translation not found" class of bug: every
 * locale must define exactly the same set of keys as the English source.
 * If you add a string to en.json, this test fails until he/ar/ru have it too.
 */
function flatKeys(obj: unknown, prefix = ''): string[] {
  if (obj === null || typeof obj !== 'object') return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return v && typeof v === 'object' ? flatKeys(v, key) : [key];
  });
}

const enKeys = new Set(flatKeys(en));

describe('locale key parity', () => {
  for (const [name, locale] of [
    ['he', he],
    ['ar', ar],
    ['ru', ru],
  ] as const) {
    const localeKeys = new Set(flatKeys(locale));

    it(`${name}.json defines every key that en.json defines`, () => {
      const missing = [...enKeys].filter((k) => !localeKeys.has(k));
      expect(missing, `${name}.json is missing keys: ${missing.join(', ')}`).toEqual([]);
    });

    it(`${name}.json has no keys absent from en.json`, () => {
      const extra = [...localeKeys].filter((k) => !enKeys.has(k));
      expect(extra, `${name}.json has stray keys: ${extra.join(', ')}`).toEqual([]);
    });
  }
});
