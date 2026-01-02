/**
 * Error Boundary Component
 * Catches React component errors and displays fallback UI
 * 
 * Phase C: Adds storage persistence and error loop protection
 * - Tracks error count and timestamps via storageService
 * - Detects error loops (3+ errors in 60 seconds)
 * - Enters critical mode when loop detected (forces page reload)
 * 
 * @example
 * <ErrorBoundary fallback={<ErrorFallback />} onError={logError}>
 *   <YourComponent />
 * </ErrorBoundary>
 */

import React from 'react';
import ErrorFallback from './ErrorFallback';
import storageService from '../../lib/services/storageService';

// Storage keys for error tracking
const ERROR_COUNT_KEY = 'app_error_count';
const LAST_ERROR_AT_KEY = 'app_last_error_at';

// Error loop thresholds
const MAX_ERROR_COUNT = 3;
const ERROR_TIME_WINDOW = 60000; // 60 seconds

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Track error occurrence in storage (before logging)
    this.trackError();

    // Log error details
    console.error('[ErrorBoundary] Component error caught:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      isCritical: this.isErrorLoop()
    });

    // Store error info in state
    this.setState({ errorInfo });

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  trackError = () => {
    const now = Date.now();
    const lastErrorAt = storageService.get(LAST_ERROR_AT_KEY, 0);
    const errorCount = storageService.get(ERROR_COUNT_KEY, 0);

    // Reset count if outside time window
    if (now - lastErrorAt > ERROR_TIME_WINDOW) {
      storageService.set(ERROR_COUNT_KEY, 1);
      storageService.set(LAST_ERROR_AT_KEY, now);
    } else {
      // Increment count within window
      storageService.set(ERROR_COUNT_KEY, errorCount + 1);
      storageService.set(LAST_ERROR_AT_KEY, now);
    }
  };

  isErrorLoop = () => {
    const errorCount = storageService.get(ERROR_COUNT_KEY, 0);
    const lastErrorAt = storageService.get(LAST_ERROR_AT_KEY, 0);
    const now = Date.now();

    // Check if we're in critical error loop (3+ errors in 60s)
    return errorCount >= MAX_ERROR_COUNT && (now - lastErrorAt) <= ERROR_TIME_WINDOW;
  };

  resetError = () => {
    // Clear storage on successful reset
    storageService.remove(ERROR_COUNT_KEY);
    storageService.remove(LAST_ERROR_AT_KEY);

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      // Render custom fallback or default
      if (this.props.fallback) {
        // If fallback is a function, call it with error and reset
        if (typeof this.props.fallback === 'function') {
          return this.props.fallback(this.state.error, this.resetError);
        }
        // If fallback is a ReactNode, render it
        return this.props.fallback;
      }

      // Default fallback
      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetError={this.resetError}
          isCritical={this.isErrorLoop()}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
