/**
 * TypeScript declarations for Vitest + Testing Library
 * Extends Vitest's expect with jest-dom matchers
 */

import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

declare module 'vitest' {
  interface Assertion<T = any> extends jest.Matchers<void, T> {
    toBeInTheDocument(): T;
    toBeVisible(): T;
    toHaveTextContent(content: string | RegExp): T;
    toHaveClass(...classNames: string[]): T;
    toHaveAttribute(name: string, value?: any): T;
    toHaveStyle(css: string): T;
    toBeDisabled(): T;
    toBeEnabled(): T;
    toBeChecked(): T;
    toBeEmpty(): T;
    toBeInTheDocument(): T;
    toBeInTheDocument(): T;
  }
}
