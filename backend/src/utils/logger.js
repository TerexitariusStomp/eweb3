import winston from 'winston';
import path from 'path';
import { createLogger } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { PATHS } from './constants.js';

import { existsSync, mkdirSync } from 'fs';

// Ensure logs directory exists
const logDir = path.resolve(PATHS.LOGS);
if (!existsSync(logDir)) {
  mkdirSync(logDir, { recursive: true });
}

// Custom formatters
const timestamp = () => new Date().toISOString();
const requestLogger = winston.format((info) => {
  if (info.req) {
    info.message = `${info.req.method} ${info.req.url} - ${info.statusCode || ''}`;
  }
  return info;
});

// Create logger instance
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: timestamp }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'edn-blockchain-recorder' },
  transports: [
    // Console transport for development
    ...(process.env.NODE_ENV === 'development' ? [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ] : []),
    // File transports for production
    new DailyRotateFile({
      filename: path.join(logDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      level: 'info'
    }),
    new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      level: 'error'
    })
  ]
});

// Specialized loggers
export const blockchainLogger = logger.child({ category: 'blockchain' });
export const apiLogger = logger.child({ category: 'api' });
export const webhookLogger = logger.child({ category: 'webhook' });
export const analyticsLogger = logger.child({ category: 'analytics' });

// Utility functions
export const logBlockchainTransaction = (txHash, transaction) => {
  blockchainLogger.info('Blockchain transaction sent', {
    txHash,
    uuid: transaction.uuid,
    amount: transaction.amount,
    empresaId: transaction.empresaId
  });
};

export const logBlockchainConfirmation = (receipt, blockchainId) => {
  blockchainLogger.info('Blockchain transaction confirmed', {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    blockchainId: blockchainId?.toString(),
    confirmations: receipt.confirmations
  });
};

export const logWebhookReceived = (webhookData) => {
  webhookLogger.info('Webhook received', {
    eventType: webhookData.event_type,
    uuid: webhookData.transaction?.uuid,
    type: webhookData.transaction?.type,
    amount: webhookData.transaction?.amount
  });
};

export const logValidationError = (errors, data) => {
  webhookLogger.warn('Validation errors', {
    errors,
    dataKeys: Object.keys(data || {})
  });
};

export const logRateLimit = (ip, limit) => {
  apiLogger.warn('Rate limit exceeded', { ip, limit });
};

export const logUnauthorizedAccess = (ip, endpoint) => {
  apiLogger.warn('Unauthorized access attempt', { ip, endpoint });
};

// Default export
export default logger;