/**
 * ErrorBoundary Component Tests
 * 
 * Phase C: Added tests for storage persistence and error loop protection
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorBoundary from '../../../shared/ui/components/ErrorBoundary';
import storageService from '../../../shared/lib/services/storageService';

// Component that throws an error
const ThrowError = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>Success</div>;
};

// Suppress console.error during tests
const originalError = console.error;
beforeAll(() => {
  console.error = vi.fn();
});

afterAll(() => {
  console.error = originalError;
});

// Clear storage before each test
beforeEach(() => {
  // Mock localStorage with real implementation for Phase C tests
  const store = {};
  localStorage.getItem.mockImplementation((key) => store[key] ?? null);
  localStorage.setItem.mockImplementation((key, value) => { store[key] = String(value); });
  localStorage.removeItem.mockImplementation((key) => { delete store[key]; });
  localStorage.clear.mockImplementation(() => { Object.keys(store).forEach(k => delete store[k]); });
});

afterEach(() => {
  // Reset mocks
  localStorage.getItem.mockReset();
  localStorage.setItem.mockReset();
  localStorage.removeItem.mockReset();
  localStorage.clear.mockReset();
});

describe('ErrorBoundary', () => {
  it('should render children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Test Child</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });

  it('should display fallback UI when error is thrown', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Что-то пошло не так/i)).toBeInTheDocument();
    expect(screen.getByText(/Попробовать снова/i)).toBeInTheDocument();
  });

  it('should call onError callback when error occurs', () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Test error' }),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });

  it('should render custom fallback when provided', () => {
    const CustomFallback = () => <div>Custom Error UI</div>;

    render(
      <ErrorBoundary fallback={<CustomFallback />}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
    expect(screen.queryByText(/Что-то пошло не так/i)).not.toBeInTheDocument();
  });

  it('should render custom fallback function with error and reset', () => {
    const fallbackFn = (error, reset) => (
      <div>
        <p>Error: {error.message}</p>
        <button onClick={reset}>Reset</button>
      </div>
    );

    render(
      <ErrorBoundary fallback={fallbackFn}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Error: Test error')).toBeInTheDocument();
    expect(screen.getByText('Reset')).toBeInTheDocument();
  });

  it('should reset error state when resetError is called', async () => {
    const user = userEvent.setup();
    
    const TestComponent = () => {
      const [shouldThrow, setShouldThrow] = React.useState(true);

      return (
        <div>
          <button onClick={() => setShouldThrow(false)}>Fix Error</button>
          <ErrorBoundary>
            <ThrowError shouldThrow={shouldThrow} />
          </ErrorBoundary>
        </div>
      );
    };

    render(<TestComponent />);

    // Error should be displayed
    expect(screen.getByText(/Что-то пошло не так/i)).toBeInTheDocument();

    // Fix the error condition
    const fixButton = screen.getByText('Fix Error');
    await user.click(fixButton);

    // Click retry button - this should reset error boundary
    const retryButton = screen.getByText(/Попробовать снова/i);
    await user.click(retryButton);

    // Should show success after reset
    expect(screen.queryByText(/Что-то пошло не так/i)).not.toBeInTheDocument();
    expect(screen.getByText('Success')).toBeInTheDocument();
  });

  it('should log error to console', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error');

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(consoleErrorSpy).toHaveBeenCalled();
    const logCall = consoleErrorSpy.mock.calls.find(
      call => call[0] === '[ErrorBoundary] Component error caught:'
    );
    expect(logCall).toBeDefined();
    expect(logCall[1]).toHaveProperty('error', 'Test error');
  });

  it('should display error details in development mode', () => {
    const originalMode = import.meta.env.MODE;
    import.meta.env.MODE = 'development';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Детали ошибки/i)).toBeInTheDocument();

    import.meta.env.MODE = originalMode;
  });

  // Phase C: Storage persistence tests
  describe('Storage Persistence (Phase C)', () => {
    it('should track error count in storage when error occurs', async () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Wait for componentDidCatch to execute
      await waitFor(() => {
        const errorCount = storageService.get('app_error_count', 0);
        expect(errorCount).toBe(1);
      });
      
      expect(storageService.get('app_last_error_at')).toBeTruthy();
    });

    it('should increment error count on multiple errors', async () => {
      const { unmount } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(storageService.get('app_error_count')).toBe(1);
      });
      unmount();

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(storageService.get('app_error_count')).toBe(2);
      });
    });

    it('should reset error count if outside time window', async () => {
      // First error
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(storageService.get('app_error_count')).toBe(1);
      });

      // Simulate time passing (61 seconds)
      const oldTimestamp = Date.now() - 61000;
      storageService.set('app_last_error_at', oldTimestamp);

      // Second error after window
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Should reset to 1, not increment to 2
      await waitFor(() => {
        expect(storageService.get('app_error_count')).toBe(1);
      });
    });

    it('should clear storage when resetError is called', async () => {
      const user = userEvent.setup();

      const TestComponent = () => {
        const [shouldThrow, setShouldThrow] = React.useState(true);

        return (
          <div>
            <button onClick={() => setShouldThrow(false)}>Fix Error</button>
            <ErrorBoundary>
              <ThrowError shouldThrow={shouldThrow} />
            </ErrorBoundary>
          </div>
        );
      };

      render(<TestComponent />);

      // Error occurred, storage should be set
      await waitFor(() => {
        expect(storageService.get('app_error_count')).toBe(1);
      });

      // Fix and reset
      await user.click(screen.getByText('Fix Error'));
      await user.click(screen.getByText(/Попробовать снова/i));

      // Storage should be cleared
      await waitFor(() => {
        expect(storageService.get('app_error_count', null)).toBeNull();
        expect(storageService.get('app_last_error_at', null)).toBeNull();
      });
    });
  });

  // Phase C: Error loop protection tests
  describe('Error Loop Protection (Phase C)', () => {
    it('should enter critical mode after 3 errors in 60 seconds', () => {
      // First error
      const { unmount: unmount1 } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      unmount1();

      // Second error
      const { unmount: unmount2 } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      unmount2();

      // Third error - should trigger critical mode
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Критическая ошибка/i)).toBeInTheDocument();
      expect(screen.getByText(/Обновить страницу/i)).toBeInTheDocument();
      expect(screen.queryByText(/Попробовать снова/i)).not.toBeInTheDocument();
    });

    it('should show normal mode if errors are not within time window', () => {
      // First error
      const { unmount: unmount1 } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      unmount1();

      // Second error
      const { unmount: unmount2 } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      unmount2();

      // Simulate time passing (61 seconds)
      const oldTimestamp = Date.now() - 61000;
      storageService.set('app_last_error_at', oldTimestamp);
      storageService.set('app_error_count', 2);

      // Third error outside window
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Should still be in normal mode (count reset to 1)
      expect(screen.getByText(/Что-то пошло не так/i)).toBeInTheDocument();
      expect(screen.queryByText(/Критическая ошибка/i)).not.toBeInTheDocument();
      expect(screen.getByText(/Попробовать снова/i)).toBeInTheDocument();
    });

    it('should log isCritical status in console', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error');

      // Trigger 3 errors for critical mode
      for (let i = 0; i < 3; i++) {
        const { unmount } = render(
          <ErrorBoundary>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
        );
        unmount();
      }

      // Last error should log isCritical: true
      const lastLogCall = consoleErrorSpy.mock.calls
        .filter(call => call[0] === '[ErrorBoundary] Component error caught:')
        .pop();

      expect(lastLogCall[1]).toHaveProperty('isCritical', true);
    });
  });
});
