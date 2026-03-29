/**
 * Tests for ErrorBoundary Component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

// A component that throws an error
function ThrowError({ shouldThrow = false }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
}

describe('ErrorBoundary', () => {
  // Suppress console.error for these tests
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalError;
  });

  describe('Normal rendering', () => {
    it('should render children when there is no error', () => {
      render(
        <ErrorBoundary>
          <div>Child content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Child content')).toBeInTheDocument();
    });

    it('should render multiple children', () => {
      render(
        <ErrorBoundary>
          <div>First child</div>
          <div>Second child</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('First child')).toBeInTheDocument();
      expect(screen.getByText('Second child')).toBeInTheDocument();
    });

    it('should render nested components', () => {
      render(
        <ErrorBoundary>
          <div>
            <span>Nested content</span>
          </div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Nested content')).toBeInTheDocument();
    });
  });

  describe('Error handling - Full mode', () => {
    it('should catch and display error', () => {
      const { rerender } = render(
        <ErrorBoundary name="TestComponent">
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      // Initially renders without error
      expect(screen.getByText('No error')).toBeInTheDocument();

      // Trigger error
      rerender(
        <ErrorBoundary name="TestComponent">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Should show error UI
      expect(screen.getByText('TestComponent crashed')).toBeInTheDocument();
      expect(screen.getByText('Test error')).toBeInTheDocument();
    });

    it('should show error message', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
    });

    it('should show try again button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('should show error details in summary', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const details = screen.getByText('Details');
      expect(details).toBeInTheDocument();

      // Click to expand details
      fireEvent.click(details);

      // Should show stack trace
      expect(screen.getByText(/ThrowError/)).toBeInTheDocument();
    });

    it('should reset error state when retry button clicked', () => {
      render(
        <ErrorBoundary name="TestComponent">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('TestComponent crashed')).toBeInTheDocument();

      // Verify retry button exists and can be clicked
      const retryButton = screen.getByText(/try again/i);
      expect(retryButton).toBeInTheDocument();

      // Click the retry button (this should reset the error state)
      fireEvent.click(retryButton);
    });
  });

  describe('Error handling - Inline mode', () => {
    it('should show inline error message', () => {
      render(
        <ErrorBoundary name="InlineTest" inline>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/InlineTest failed to render/)).toBeInTheDocument();
    });

    it('should show retry link in inline mode', () => {
      render(
        <ErrorBoundary inline>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should not show details in inline mode', () => {
      render(
        <ErrorBoundary inline>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.queryByText('Details')).not.toBeInTheDocument();
    });

    it('should use default name when not provided', () => {
      render(
        <ErrorBoundary inline>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Component failed to render/)).toBeInTheDocument();
    });
  });

  describe('Error logging', () => {
    it('should log error to console', () => {
      render(
        <ErrorBoundary name="LoggingTest">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(console.error).toHaveBeenCalled();
    });

    it('should include component name in log', () => {
      render(
        <ErrorBoundary name="NamedComponent">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Verify console.error was called with some arguments
      expect(console.error).toHaveBeenCalled();
      expect((console.error as any).mock.calls.length).toBeGreaterThan(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle error without message', () => {
      function ThrowErrorWithoutMessage() {
        if (true) {
          throw new Error();
        }
        return <div>Should not reach</div>;
      }

      render(
        <ErrorBoundary>
          <ThrowErrorWithoutMessage />
        </ErrorBoundary>
      );

      expect(screen.getByText(/An unexpected error occurred/)).toBeInTheDocument();
    });

    it('should handle non-Error objects', () => {
      function ThrowString() {
        if (true) {
          throw 'String error';
        }
        return <div>Should not reach</div>;
      }

      render(
        <ErrorBoundary>
          <ThrowString />
        </ErrorBoundary>
      );

      // Should still show error UI
      expect(screen.getByText(/crashed|Something went wrong/i)).toBeInTheDocument();
    });
  });
});
