/**
 * Retry Logic and Circuit Breaker Utilities
 * Implements exponential backoff retry and circuit breaker pattern for blockchain operations
 */

import { API } from './constants.js';
import logger from './logger.js';

/**
 * Circuit Breaker Implementation
 * Prevents cascading failures when a service is not responding
 */
export class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute
    this.monitoringPeriod = options.monitoringPeriod || 120000; // 2 minutes
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.resetTimeoutId = null;
    this.monitoringInterval = null;
  }

  /**
   * Execute operation with circuit breaker protection
   * @param {Function} operation - Async operation to execute
   * @returns {Promise} - Result of operation
   */
  async execute(operation) {
    switch (this.state) {
      case 'OPEN':
        if (Date.now() - this.lastFailureTime > this.resetTimeout) {
          this.state = 'HALF_OPEN';
          this.failureCount = 0;
          logger.info('Circuit breaker transitioning to HALF_OPEN');
        } else {
          throw new Error('Circuit breaker is OPEN - service unavailable');
        }
        break;
      case 'HALF_OPEN':
        // Proceed with operation
        break;
      case 'CLOSED':
      default:
        // Proceed with operation
        break;
    }

    try {
      const result = await operation();
      
      // Success - reset failure count and close circuit if half-open
      this.failureCount = 0;
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        logger.info('Circuit breaker transitioning to CLOSED');
      }
      
      this.scheduleReset();
      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      
      if (this.failureCount >= this.failureThreshold) {
        this.state = 'OPEN';
        logger.error('Circuit breaker opened due to failures', {
          failureCount: this.failureCount,
          threshold: this.failureThreshold
        });
        this.scheduleReset();
      }
      
      throw error;
    }
  }

  /**
   * Get current state
   * @returns {string} - Current circuit breaker state
   */
  getState() {
    return this.state;
  }

  /**
   * Schedule automatic reset timeout
   */
  scheduleReset() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
    this.resetTimeoutId = setTimeout(() => {
      if (this.state === 'OPEN') {
        this.state = 'HALF_OPEN';
        this.failureCount = 0;
        logger.info('Circuit breaker transitioning to HALF_OPEN (timeout)');
      }
    }, this.resetTimeout);
  }

  /**
   * Start monitoring (optional)
   */
  startMonitoring() {
    if (this.monitoringInterval) return;
    
    this.monitoringInterval = setInterval(() => {
      if (this.state === 'OPEN' && Date.now() - this.lastFailureTime > this.monitoringPeriod) {
        this.state = 'HALF_OPEN';
        logger.info('Circuit breaker transitioning to HALF_OPEN (monitoring)');
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Force reset circuit breaker
   */
  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = null;
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }
    logger.info('Circuit breaker manually reset to CLOSED');
  }
}

/**
 * Retry operation with exponential backoff
 * @param {Function} operation - Async operation to retry
 * @param {string} operationName - Name of operation for logging
 * @param {Object} [options] - Retry options
 * @param {number} [options.maxAttempts=3] - Maximum retry attempts
 * @param {number} [options.delay=1000] - Initial delay in ms
 * @param {number} [options.backoffMultiplier=2] - Backoff multiplier
 * @param {boolean} [options.logErrors=true] - Log errors on retry
 * @returns {Promise} - Result of successful operation
 */
export async function retryOperation(operation, operationName, options = {}) {
  const {
    maxAttempts = API.MAX_RETRY_ATTEMPTS,
    delay = API.RETRY_DELAY_MS,
    backoffMultiplier = API.RETRY_BACKOFF_MULTIPLIER,
    logErrors = true
  } = options;

  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      logger.debug(`${operationName} - Attempt ${attempt}/${maxAttempts}`);
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (logErrors) {
        logger.warn(`${operationName} failed (attempt ${attempt}/${maxAttempts})`, {
          error: error.message,
          attempt
        });
      }
      
      if (attempt === maxAttempts) {
        logger.error(`${operationName} failed after ${maxAttempts} attempts`, {
          error: error.message,
          finalAttempt: true
        });
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const currentDelay = delay * Math.pow(backoffMultiplier, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, currentDelay));
    }
  }
  
  throw lastError; // This shouldn't be reached, but just in case
}

/**
 * Specialized retry for blockchain operations
 * Includes additional blockchain-specific error handling
 * @param {Function} operation - Async blockchain operation
 * @param {string} operationName - Operation name
 * @param {Object} [options] - Retry options (same as retryOperation)
 * @returns {Promise} - Result of successful operation
 */
export const retryBlockchainOperation = async (operation, operationName, options = {}) => {
  return retryOperation(
    async () => {
      const result = await operation();
      
      // Additional validation for blockchain results
      if (result && typeof result.hash === 'string' && result.hash.startsWith('0x')) {
        // Valid transaction hash
        return result;
      }
      
      throw new Error('Invalid blockchain response');
    },
    operationName,
    {
      ...options,
      maxAttempts: options.maxAttempts || 5, // More attempts for blockchain
      delay: options.delay || 2000, // Longer initial delay
      backoffMultiplier: options.backoffMultiplier || 1.5 // Gentler backoff
    }
  );
};

/**
 * Simple delay utility
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>}
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Exponential backoff with jitter
 * @param {number} baseDelay - Base delay in ms
 * @param {number} attempt - Current attempt number
 * @returns {number} - Delay with jitter
 */
export function calculateBackoffDelay(baseDelay, attempt) {
  const exponential = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * baseDelay; // Full jitter
  return Math.min(exponential + jitter, 30000); // Cap at 30 seconds
}