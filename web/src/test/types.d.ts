/**
 * TypeScript declarations for Vitest + Testing Library
 * Extends Vitest's expect with jest-dom matchers
 */

// `export {}` keeps this file a module so the block below augments (merges
// with) vitest's types rather than replacing them.
export {};

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
  }
}
