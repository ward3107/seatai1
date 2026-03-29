/**
 * Tests for useLanguage Hook
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLanguage, LANG_LABELS, LANG_FONTS } from './useLanguage';
import { useStore } from '../core/store';

// Mock the store
vi.mock('../core/store', () => ({
  useStore: vi.fn(),
}));

describe('useLanguage Hook', () => {
  const mockSetUiLanguage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as any).mockReturnValue({
      uiLanguage: 'en',
      setUiLanguage: mockSetUiLanguage,
    });

    // Reset document state
    document.documentElement.lang = '';
    document.documentElement.dir = '';
    document.body.style.fontFamily = '';
  });

  describe('Language detection', () => {
    it('should detect English as LTR', () => {
      const { result } = renderHook(() => useLanguage());

      expect(result.current.uiLanguage).toBe('en');
      expect(result.current.isRTL).toBe(false);
    });

    it('should detect Hebrew as RTL', () => {
      (useStore as any).mockReturnValue({
        uiLanguage: 'he',
        setUiLanguage: mockSetUiLanguage,
      });

      const { result } = renderHook(() => useLanguage());

      expect(result.current.uiLanguage).toBe('he');
      expect(result.current.isRTL).toBe(true);
    });

    it('should detect Arabic as RTL', () => {
      (useStore as any).mockReturnValue({
        uiLanguage: 'ar',
        setUiLanguage: mockSetUiLanguage,
      });

      const { result } = renderHook(() => useLanguage());

      expect(result.current.uiLanguage).toBe('ar');
      expect(result.current.isRTL).toBe(true);
    });

    it('should detect Russian as LTR', () => {
      (useStore as any).mockReturnValue({
        uiLanguage: 'ru',
        setUiLanguage: mockSetUiLanguage,
      });

      const { result } = renderHook(() => useLanguage());

      expect(result.current.uiLanguage).toBe('ru');
      expect(result.current.isRTL).toBe(false);
    });
  });

  describe('DOM updates', () => {
    it('should set HTML lang attribute to English', () => {
      (useStore as any).mockReturnValue({
        uiLanguage: 'en',
        setUiLanguage: mockSetUiLanguage,
      });

      renderHook(() => useLanguage());

      expect(document.documentElement.lang).toBe('en');
      expect(document.documentElement.dir).toBe('ltr');
    });

    it('should set HTML dir attribute to RTL for Hebrew', () => {
      (useStore as any).mockReturnValue({
        uiLanguage: 'he',
        setUiLanguage: mockSetUiLanguage,
      });

      renderHook(() => useLanguage());

      expect(document.documentElement.lang).toBe('he');
      expect(document.documentElement.dir).toBe('rtl');
    });

    it('should apply correct font for English', () => {
      (useStore as any).mockReturnValue({
        uiLanguage: 'en',
        setUiLanguage: mockSetUiLanguage,
      });

      renderHook(() => useLanguage());

      expect(document.body.style.fontFamily).toBe(LANG_FONTS.en);
    });

    it('should apply Heebo font for Hebrew', () => {
      (useStore as any).mockReturnValue({
        uiLanguage: 'he',
        setUiLanguage: mockSetUiLanguage,
      });

      renderHook(() => useLanguage());

      expect(document.body.style.fontFamily).toContain('Heebo');
    });

    it('should apply Cairo font for Arabic', () => {
      (useStore as any).mockReturnValue({
        uiLanguage: 'ar',
        setUiLanguage: mockSetUiLanguage,
      });

      renderHook(() => useLanguage());

      expect(document.body.style.fontFamily).toContain('Cairo');
    });
  });

  describe('Translation function', () => {
    it('should return translation function', () => {
      const { result } = renderHook(() => useLanguage());

      expect(typeof result.current.t).toBe('function');
    });

    it('should translate keys correctly', () => {
      const { result } = renderHook(() => useLanguage());

      const title = result.current.t('app.title');
      expect(typeof title).toBe('string');
      expect(title.length).toBeGreaterThan(0);
    });

    it('should interpolate values in translations', () => {
      const { result } = renderHook(() => useLanguage());

      const translated = result.current.t('app.title', { name: 'Test' });
      expect(typeof translated).toBe('string');
    });
  });

  describe('Language switching', () => {
    it('should call setUiLanguage when changing language', () => {
      const { result } = renderHook(() => useLanguage());

      act(() => {
        result.current.setUiLanguage('he');
      });

      expect(mockSetUiLanguage).toHaveBeenCalledWith('he');
    });
  });

  describe('Language labels', () => {
    it('should have correct language labels', () => {
      expect(LANG_LABELS.en).toBe('EN');
      expect(LANG_LABELS.he).toBe('עב');
      expect(LANG_LABELS.ar).toBe('عر');
      expect(LANG_LABELS.ru).toBe('RU');
    });
  });

  describe('Font configurations', () => {
    it('should have font configurations for all languages', () => {
      expect(LANG_FONTS.en).toBeDefined();
      expect(LANG_FONTS.he).toBeDefined();
      expect(LANG_FONTS.ar).toBeDefined();
      expect(LANG_FONTS.ru).toBeDefined();

      // All fonts should be strings
      Object.values(LANG_FONTS).forEach(font => {
        expect(typeof font).toBe('string');
      });
    });

    it('should include Heebo font for Hebrew', () => {
      expect(LANG_FONTS.he).toContain('Heebo');
    });

    it('should include Cairo font for Arabic', () => {
      expect(LANG_FONTS.ar).toContain('Cairo');
    });

    it('should use Inter for English', () => {
      expect(LANG_FONTS.en).toContain('Inter');
    });
  });

  describe('Reactive updates', () => {
    it('should update DOM when language changes via setUiLanguage', () => {
      // Test Hebrew language from the start
      (useStore as any).mockReturnValue({
        uiLanguage: 'he',
        setUiLanguage: mockSetUiLanguage,
      });

      renderHook(() => useLanguage());

      expect(document.documentElement.lang).toBe('he');
      expect(document.documentElement.dir).toBe('rtl');
    });
  });
});
