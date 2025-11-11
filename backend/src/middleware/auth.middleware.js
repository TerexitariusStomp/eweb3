import rateLimit from 'express-rate-limit';
import { StatusCodes, ReasonPhrases } from 'http-status-codes';
import validationService from '../services/validation.service.js';
import blockchainService from '../services/blockchain.service.js';
import logger from '../utils/logger.js';
import { API, ERROR_MESSAGES } from '../utils/constants.js';

/**
 * Authentication Middleware
 * Validates wallet address authorization using smart contract
 */

/**
 * Auth middleware for protected routes
 * Expects Authorization: Bearer 0xWalletAddress
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      logger.warn('Missing authorization header', { ip: req.ip, path: req.path });
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: ReasonPhrases.UNAUTHORIZED,
        details: { auth: 'header_missing' }
      });
    }

    const walletAddress = validationService.validateAuthHeader(authHeader);
    
    // Check authorization with smart contract
    const isAuthorized = await blockchainService.isAuthorized(walletAddress);
    
    if (!isAuthorized) {
      logger.warn('Unauthorized wallet access', { 
        wallet: walletAddress.substring(0, 6) + '...', 
        path: req.path,
        ip: req.ip 
      });
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: ReasonPhrases.FORBIDDEN,
        details: { auth: 'wallet_not_authorized' }
      });
    }

    // Add wallet to request object
    req.walletAddress = walletAddress;
    logger.debug('Wallet authenticated', { 
      wallet: walletAddress.substring(0, 6) + '...',
      path: req.path 
    });

    next();
  } catch (error) {
    logger.error('Authentication middleware error', { 
      error: error.message, 
      path: req.path 
    });
    
    if (error.message.includes('Unauthorized')) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: ReasonPhrases.UNAUTHORIZED,
        details: { auth: 'invalid_format' }
      });
    }
    
    next(error);
  }
};

/**
 * Rate limiting middleware
 * Configured based on environment variables
 */
export const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || API.RATE_LIMIT_WINDOW_MS,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || API.RATE_LIMIT_MAX_REQUESTS,
  message: {
    success: false,
    message: ReasonPhrases.TOO_MANY_REQUESTS,
    details: { rateLimit: true }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      limit: process.env.RATE_LIMIT_MAX_REQUESTS || API.RATE_LIMIT_MAX_REQUESTS
    });
    
    res.status(StatusCodes.TOO_MANY_REQUESTS).json({
      success: false,
      timestamp: new Date().toISOString(),
      statusCode: StatusCodes.TOO_MANY_REQUESTS,
      message: ReasonPhrases.TOO_MANY_REQUESTS,
      path: req.path,
      details: {
        retryAfter: Math.ceil((process.env.RATE_LIMIT_WINDOW_MS || API.RATE_LIMIT_WINDOW_MS) / 1000),
        limit: process.env.RATE_LIMIT_MAX_REQUESTS || API.RATE_LIMIT_MAX_REQUESTS
      }
    });
  }
});

/**
 * Webhook-specific rate limiting (higher limits for webhooks)
 */
export const webhookLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || API.RATE_LIMIT_WINDOW_MS,
  max: 500, // Higher limit for webhooks
  message: {
    success: false,
    message: 'Webhook rate limit exceeded',
    details: { webhook: true }
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
  handler: (req, res) => {
    logger.error('Webhook rate limit exceeded', {
      ip: req.ip,
      eventType: req.body?.event_type,
      uuid: req.body?.transaction?.uuid
    });
    
    res.status(StatusCodes.TOO_MANY_REQUESTS).json({
      success: false,
      message: 'Webhook rate limit exceeded',
      details: { webhook: true, retryAfter: 60 }
    });
  }
});

/**
 * CORS middleware with dynamic origin validation
 * Already handled in server.js, but additional validation if needed
 */
export const corsValidator = (req, res, next) => {
  const origin = req.headers.origin;
  
  if (origin && !origin.startsWith('http')) {
    logger.warn('Invalid CORS origin', { origin, ip: req.ip });
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: 'Invalid origin',
      details: { cors: true }
    });
  }

  next();
};

/**
 * API key middleware (optional additional security layer)
 */
export const apiKeyAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  
  if (!apiKey || apiKey !== process.env.API_KEY) {
    logger.warn('Invalid or missing API key', { ip: req.ip, path: req.path });
    return res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      message: 'Invalid API key',
      details: { apiKey: true }
    });
  }

  next();
};

/**
 * Health check middleware (no auth required)
 */
export const healthCheck = (req, res, next) => {
  if (req.path === '/health') {
    return next(); // Skip auth for health checks
  }
  next();
};