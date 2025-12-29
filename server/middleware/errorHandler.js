/**
 * @fileoverview Unified Error Handler Middleware
 * @module server/middleware/errorHandler
 * 
 * Purpose: Central error handling for Express application.
 * 
 * Features:
 * - Sanitizes error messages (prevents SQL injection, XSS leaks)
 * - Preserves existing API response format
 * - Logs errors for debugging (development only)
 * - Distinguishes operational vs programming errors
 * 
 * Position in middleware chain:
 *   Routes → 404 Handler → This Error Handler → Response
 */

import { ApiError } from '../utils/errors.js';
import { sanitizeErrorMessage } from '../utils/sanitize.js';

/**
 * Global error handling middleware
 * 
 * @param {Error} err - Error object (can be ApiError or native Error)
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response  
 * @param {import('express').NextFunction} next - Express next (unused, required by signature)
 * 
 * @returns {void} Sends JSON response
 */
export default function errorHandler(err, req, res, next) {
  // Log error in development (helps debugging)
  if (process.env.NODE_ENV !== 'production') {
    console.error('❌ Error Handler:', {
      name: err.name,
      message: err.message,
      statusCode: err.statusCode || 500,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  }

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Sanitize message (critical for security)
  // Prevents leaking SQL queries, stack traces, or sensitive data
  const safeMessage = sanitizeErrorMessage(
    err.message || 'Internal server error'
  );

  // Log non-operational errors for investigation
  // Operational errors = expected client mistakes (validation, not found, etc.)
  // Non-operational errors = bugs or infrastructure failures
  if (err instanceof ApiError && !err.isOperational) {
    console.error('🔥 NON-OPERATIONAL ERROR (investigate):', {
      message: err.message,
      stack: err.stack,
      path: req.path,
    });
  }

  // Send response (preserves existing API format)
  res.status(statusCode).json({
    success: false,
    message: safeMessage,
  });
}
