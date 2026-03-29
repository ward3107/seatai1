/**
 * Test setup file for Vitest
 */

import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Simple mocks for testing (avoiding DOM type conflicts)
vi.stubGlobal('indexedDB', {
  open: vi.fn()
});

vi.stubGlobal('ResizeObserver', vi.fn());
vi.stubGlobal('IntersectionObserver', vi.fn());
vi.stubGlobal('performance', {
  now: vi.fn(() => Date.now())
});

export {};