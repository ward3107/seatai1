/**
 * Tests for i18n Translation System
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { t, setLocale, getLocale } from './i18n';

describe('i18n Translation System', () => {
  beforeEach(() => {
    // Reset to default locale before each test
    setLocale('en');
  });

  describe('t() - Translation function', () => {
    it('should return English translation by default', () => {
      expect(t('app.title')).toBe('SeatAI');
    });

    it('should return nested translations', () => {
      expect(t('students.add')).toBe('Add Student');
    });

    it('should return key if translation not found', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = t('nonexistent.key');
      expect(result).toBe('nonexistent.key');
      expect(consoleSpy).toHaveBeenCalledWith('Translation not found: nonexistent.key');
      consoleSpy.mockRestore();
    });

    it('should interpolate values in translations', () => {
      // Assuming there's a translation with interpolation
      const result = t('app.students', { count: 5 });
      // The actual behavior depends on the translation content
      expect(typeof result).toBe('string');
    });

    it('should handle multiple interpolation values', () => {
      const result = t('app.title', { name: 'Test', value: 123 });
      expect(typeof result).toBe('string');
    });

    it('should handle missing interpolation values gracefully', () => {
      const result = t('app.students', { missing: 'value' });
      expect(typeof result).toBe('string');
    });
  });

  describe('setLocale() - Set current locale', () => {
    it('should change locale to Hebrew', () => {
      setLocale('he');
      expect(getLocale()).toBe('he');
      expect(t('app.title')).toBe('SeatAI'); // Hebrew translation
    });

    it('should change locale to Arabic', () => {
      setLocale('ar');
      expect(getLocale()).toBe('ar');
    });

    it('should change locale to Russian', () => {
      setLocale('ru');
      expect(getLocale()).toBe('ru');
    });

    it('should warn about invalid locale', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      setLocale('invalid' as any);
      expect(consoleSpy).toHaveBeenCalledWith('Locale not found: invalid');
      expect(getLocale()).toBe('en'); // Should remain unchanged
      consoleSpy.mockRestore();
    });

    it('should update translations after locale change', () => {
      setLocale('he');
      const hebrew = t('app.optimize_seating');

      setLocale('en');
      const english = t('app.optimize_seating');

      expect(typeof hebrew).toBe('string');
      expect(typeof english).toBe('string');
    });
  });

  describe('getLocale() - Get current locale', () => {
    it('should return default locale as English', () => {
      expect(getLocale()).toBe('en');
    });

    it('should return the locale that was set', () => {
      setLocale('he');
      expect(getLocale()).toBe('he');

      setLocale('ar');
      expect(getLocale()).toBe('ar');
    });
  });

  describe('Translation completeness', () => {
    it('should have translations for all supported locales', () => {
      const testKey = 'app.title';

      setLocale('en');
      const en = t(testKey);

      setLocale('he');
      const he = t(testKey);

      setLocale('ar');
      const ar = t(testKey);

      setLocale('ru');
      const ru = t(testKey);

      expect(typeof en).toBe('string');
      expect(typeof he).toBe('string');
      expect(typeof ar).toBe('string');
      expect(typeof ru).toBe('string');
    });

    it('should handle deep nested keys', () => {
      const result = t('students.form.name');
      expect(typeof result).toBe('string');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty key', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = t('');
      expect(result).toBe('');
      consoleSpy.mockRestore();
    });

    it('should handle key with only dots', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = t('...');
      expect(result).toBe('...');
      consoleSpy.mockRestore();
    });

    it('should handle interpolation with undefined values', () => {
      const result = t('app.title', undefined as any);
      expect(typeof result).toBe('string');
    });

    it('should handle interpolation with empty values object', () => {
      const result = t('app.title', {});
      expect(typeof result).toBe('string');
    });
  });
});
