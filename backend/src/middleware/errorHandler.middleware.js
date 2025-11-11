import { ReasonPhrases, StatusCodes } from 'http-status-codes';
import logger from '../utils/logger.js';
import { formatBlockchainError } from '../utils/formatter.js';
import { ERROR_MESSAGES } from '../utils/constants.js';

/**
 * Error Handler Middleware
 * Centralized error handling for Express app
 * Formats errors consistently and logs appropriately
 */
export const errorHandler = (err, req, res, next) => {
  logger.error('Unhandled error in application', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Handle different error types
  let statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
  let message = ReasonPhrases.INTERNAL_SERVER_ERROR;
  let details = {};

  if (err.name === 'ValidationError') {
    statusCode = StatusCodes.UNPROCESSABLE_ENTITY;
    message = ReasonPhrases.UNPROCESSABLE_ENTITY;
    details = { validation: true, errors: err.details || err.message };
  } else if (err.name === 'CastError' || err.name === 'TypeError') {
    statusCode = StatusCodes.BAD_REQUEST;
    message = ReasonPhrases.BAD_REQUEST;
    details = { type: 'invalid_input' };
  } else if (err.name === 'JsonWebTokenError' || err.message === ERROR_MESSAGES.UNAUTHORIZED) {
    statusCode = StatusCodes.UNAUTHORIZED;
    message = ReasonPhrases.UNAUTHORIZED;
    details = { auth: true };
  } else if (err.name === 'TokenExpiredError') {
    statusCode = StatusCodes.UNAUTHORIZED;
    message = 'Token expired';
    details = { auth: true, expired: true };
  } else if (err.message.includes('rate limit')) {
    statusCode = StatusCodes.TOO_MANY_REQUESTS;
    message = ReasonPhrases.TOO_MANY_REQUESTS;
    details = { rateLimit: true };
  } else if (err.message.includes('not found')) {
    statusCode = StatusCodes.NOT_FOUND;
    message = ReasonPhrases.NOT_FOUND;
    details = { resource: 'not_found' };
  } else if (err.message.includes('Blockchain') || err.message.includes('ethers')) {
    // Blockchain specific errors
    statusCode = StatusCodes.SERVICE_UNAVAILABLE;
    message = 'Blockchain service temporarily unavailable';
    details = { 
      blockchain: true, 
      originalError: formatBlockchainError(err),
      retryable: true 
    };
  } else if (err.isBoom) {
    // Hapi Boom errors if used
    statusCode = err.output.statusCode;
    message = err.output.payload.message;
    details = err.output.payload;
  }

  // Set status and send response
  res.status(statusCode).json({
    success: false,
    timestamp: new Date().toISOString(),
    statusCode,
    message,
    path: req.path,
    method: req.method,
    ...(details && Object.keys(details).length > 0 && { details }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

/**
 * Not Found Handler Middleware
 * Handles 404 for unmatched routes
 */
export const notFoundHandler = (req, res, next) => {
  logger.warn('Route not found', {
    method: req.method,
    url: req.url,
    ip: req.ip
  });

  const error = new Error(`Route ${req.method} ${req.url} not found`);
  error.statusCode = StatusCodes.NOT_FOUND;
  error.message = ReasonPhrases.NOT_FOUND;

  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    timestamp: new Date().toISOString(),
    statusCode: StatusCodes.NOT_FOUND,
    message: ReasonPhrases.NOT_FOUND,
    path: req.path,
    method: req.method,
    details: { route: 'not_found' }
  });
};

/**
 * Async Error Wrapper
 * Wraps async route handlers to catch errors
 * @param {Function} fn - Async function
 * @returns {Function} - Wrapped function
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Validation Error Formatter
 * Formats Joi validation errors for API response
 * @param {Object} error - Joi error object
 * @returns {Object} - Formatted error details
 */
export const formatValidationError = (error) => {
  if (!error || !error.details) return { message: 'Validation failed' };

  return {
    message: 'Validation failed',
    details: error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      type: detail.type,
      value: detail.context?.value || null
    }))
  };
};

/**
 * Rate Limit Error Handler
 * Specific handler for rate limiting errors
 * @param {Object} error - Rate limit error
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware
 */
export const rateLimitHandler = (error, req, res, next) => {
  if (error instanceof require('express-rate-limit').RateLimitError) {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      limit: error.limit
    });

    return res.status(StatusCodes.TOO_MANY_REQUESTS).json({
      success: false,
      timestamp: new Date().toISOString(),
      statusCode: StatusCodes.TOO_MANY_REQUESTS,
      message: ReasonPhrases.TOO_MANY_REQUESTS,
      path: req.path,
      details: {
        retryAfter: error.msBeforeNext / 1000, // seconds
        limit: error.limit
      }
    });
  }

  next(error);
};