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
// Note: jsdom provides a working `performance` object with high-resolution
// `performance.now()` — don't stub it, or timing-sensitive tests get 0s.

// jsdom doesn't implement URL.createObjectURL / revokeObjectURL.
// Stub them so components that trigger downloads (e.g. CSV template) can be tested.
if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = vi.fn(() => 'blob:mock');
}
if (typeof URL.revokeObjectURL !== 'function') {
  URL.revokeObjectURL = vi.fn();
}

export {};