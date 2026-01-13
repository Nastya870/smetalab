/**
 * @fileoverview Unified Error Handling System
 * @module server/utils/errors
 * 
 * Purpose: Centralized error classes for consistent API responses.
 * 
 * Design Principles:
 * - Single source of truth for error types
 * - Extends native Error for stack traces
 * - HTTP status codes embedded in error classes
 * - Safe for production (no sensitive data leaks)
 * 
 * Usage:
 *   throw new BadRequestError('Invalid email format');
 *   throw new NotFoundError('User not found');
 *   throw new UnauthorizedError('Invalid credentials');
 */

/**
 * Base API Error class
 * 
 * All custom errors extend this class to ensure consistent structure.
 * 
 * @extends Error
 * @property {number} statusCode - HTTP status code
 * @property {boolean} isOperational - True for expected errors (client mistakes)
 */
export class ApiError extends Error {
  /**
   * @param {string} message - Human-readable error description
   * @param {number} statusCode - HTTP status code (default: 500)
   * @param {boolean} isOperational - True if recoverable error (default: true)
   */
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ==================== Client Errors (4xx) ====================

/**
 * 400 Bad Request
 * Use when client sends invalid data (validation failures, malformed JSON)
 */
export class BadRequestError extends ApiError {
  constructor(message = 'Invalid request data') {
    super(message, 400);
  }
}

/**
 * 401 Unauthorized
 * Use when authentication is required but missing/invalid
 */
export class UnauthorizedError extends ApiError {
  constructor(message = 'Authentication required') {
    super(message, 401);
  }
}

/**
 * 403 Forbidden
 * Use when user is authenticated but lacks permissions
 */
export class ForbiddenError extends ApiError {
  constructor(message = 'Access denied') {
    super(message, 403);
  }
}

/**
 * 404 Not Found
 * Use when requested resource doesn't exist
 */
export class NotFoundError extends ApiError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

/**
 * 409 Conflict
 * Use when request conflicts with current state (duplicate email, concurrent edit)
 */
export class ConflictError extends ApiError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
  }
}

// ==================== Server Errors (5xx) ====================

/**
 * 500 Internal Server Error
 * Use for unexpected programming errors (database failures, third-party API errors)
 * 
 * Note: isOperational=false means this should be logged and investigated
 */
export class InternalServerError extends ApiError {
  constructor(message = 'Internal server error', isOperational = false) {
    super(message, 500, isOperational);
  }
}

/**
 * 503 Service Unavailable
 * Use when external dependency is down (database, email service, payment gateway)
 */
export class ServiceUnavailableError extends ApiError {
  constructor(message = 'Service temporarily unavailable') {
    super(message, 503);
  }
}

// ==================== Factory Functions (Optional) ====================

/**
 * Creates error from known error codes
 * Useful for database error mapping
 * 
 * @param {string} code - Error code (e.g., 'EMAIL_EXISTS', 'USER_NOT_FOUND')
 * @param {string} [customMessage] - Override default message
 * @returns {ApiError}
 * 
 * @example
 *   createError('EMAIL_EXISTS') // ConflictError
 *   createError('USER_NOT_FOUND', 'Account deleted') // NotFoundError
 */
export function createError(code, customMessage) {
  const errorMap = {
    // Auth errors
    'EMAIL_EXISTS': () => new ConflictError(customMessage || 'Email already registered'),
    'USER_NOT_FOUND': () => new NotFoundError(customMessage || 'User not found'),
    'INVALID_PASSWORD': () => new UnauthorizedError(customMessage || 'Invalid credentials'),
    'INVALID_TOKEN': () => new UnauthorizedError(customMessage || 'Invalid or expired token'),
    'INVALID_REFRESH_TOKEN': () => new UnauthorizedError(customMessage || 'Invalid refresh token'),
    
    // Permission errors
    'INSUFFICIENT_PERMISSIONS': () => new ForbiddenError(customMessage || 'Insufficient permissions'),
    'TENANT_MISMATCH': () => new ForbiddenError(customMessage || 'Access denied to this resource'),
    
    // Validation errors
    'VALIDATION_ERROR': () => new BadRequestError(customMessage || 'Invalid input data'),
    'MISSING_REQUIRED_FIELD': () => new BadRequestError(customMessage || 'Required field missing'),
    
    // Resource errors
    'NOT_FOUND': () => new NotFoundError(customMessage || 'Resource not found'),
    'DUPLICATE_RESOURCE': () => new ConflictError(customMessage || 'Resource already exists'),
    
    // Server errors
    'DATABASE_ERROR': () => new InternalServerError(customMessage || 'Database operation failed', false),
    'EXTERNAL_SERVICE_ERROR': () => new ServiceUnavailableError(customMessage || 'External service unavailable'),
  };

  const errorFactory = errorMap[code];
  if (!errorFactory) {
    // Unknown error code -> generic 500
    return new InternalServerError(customMessage || `Unexpected error: ${code}`, false);
  }

  return errorFactory();
}

/**
 * Wraps async route handlers to catch errors
 * Prevents try/catch boilerplate in every controller
 * 
 * @param {Function} fn - Async route handler
 * @returns {Function} Express middleware
 * 
 * @example
 *   router.get('/users/:id', catchAsync(async (req, res, next) => {
 *     const user = await findUser(req.params.id);
 *     if (!user) throw new NotFoundError('User not found');
 *     res.json({ success: true, user });
 *   }));
 */
export function catchAsync(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
