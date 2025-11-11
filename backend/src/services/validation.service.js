import Joi from 'joi';
import { VALIDATION_SCHEMAS, ERROR_MESSAGES } from '../utils/constants.js';
import logger from '../utils/logger.js';

/**
 * Validation Service
 * Handles data validation using Joi schemas
 * Centralized validation for webhook payloads and API requests
 */
class ValidationService {
  constructor() {
    // Webhook transaction schema
    this.webhookTransactionSchema = Joi.object({
      event_type: Joi.string().required().valid('transaction.created', 'transaction.updated', 'transaction.deleted'),
      timestamp: Joi.string().isoDate().required(),
      transaction: Joi.object({
        id: Joi.number().integer().positive().required(),
        type: Joi.string().valid('credit', 'debit', 'transfer', 'refund', 'adjustment').required(),
        amount: Joi.number().precision(2).min(-999999.99).max(999999.99).required(),
        empresa_id: Joi.number().integer().positive().required(),
        parceiro_negocio_id: Joi.number().integer().positive().required(),
        celular_id: Joi.number().integer().positive().required(),
        moeda_id: Joi.number().integer().positive().required(),
        plataforma_id: Joi.number().integer().positive().required(),
        transacao_tipo_id: Joi.number().integer().positive().required(),
        status: Joi.string().valid('pending', 'confirmed', 'failed', 'cancelled').required(),
        created_at: Joi.string().isoDate().required(),
        table: Joi.string().min(3).max(50).required(),
        operation: Joi.string().valid('INSERT', 'UPDATE', 'DELETE').required(),
        data_controle: Joi.string().isoDate().required(),
        uuid: Joi.string().uuid({ version: ['uuidv4'] }).required(),
        versao: Joi.string().min(1).max(10).required()
      }).required()
    });

    // API query params schema (for filtering)
    this.apiQuerySchema = Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
      type: Joi.string().valid('credit', 'debit', 'transfer', 'refund', 'adjustment'),
      status: Joi.string().valid('pending', 'confirmed', 'failed', 'cancelled'),
      empresaId: Joi.number().integer().positive(),
      startDate: Joi.string().isoDate(),
      endDate: Joi.string().isoDate(),
      minAmount: Joi.number().precision(2).positive(),
      maxAmount: Joi.number().precision(2).positive(),
      sortBy: Joi.string().valid('createdAt', 'amount', 'blockchainTimestamp').default('createdAt'),
      sortOrder: Joi.string().valid('asc', 'desc').default('desc')
    });

    // Authorization header schema
    this.authHeaderSchema = Joi.string().pattern(/^Bearer 0x[a-fA-F0-9]{40}$/);

    logger.info('Validation service initialized with Joi schemas');
  }

  /**
   * Validate webhook transaction payload
   * @param {Object} payload - Webhook payload
   * @returns {Object} - Validated data
   * @throws {Error} - Validation error
   */
  validateWebhookTransaction(payload) {
    logger.debug('Validating webhook transaction', { eventType: payload.event_type });
    
    const { error, value } = this.webhookTransactionSchema.validate(payload, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        message: detail.message,
        path: detail.path,
        type: detail.type
      }));
      
      logger.warn('Webhook validation failed', { 
        eventType: payload.event_type, 
        errors: errorDetails.length 
      });
      
      throw new Error(`${ERROR_MESSAGES.VALIDATION_ERROR}: ${JSON.stringify(errorDetails)}`);
    }

    // Additional business logic validation
    this.validateBusinessRules(value.transaction);

    return value;
  }

  /**
   * Validate API query parameters for transaction filtering
   * @param {Object} query - Query parameters
   * @returns {Object} - Validated query params
   * @throws {Error} - Validation error
   */
  validateApiQuery(query) {
    const { error, value } = this.apiQuerySchema.validate(query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => detail.message);
      logger.warn('API query validation failed', { errors: errorDetails.length });
      throw new Error(`${ERROR_MESSAGES.VALIDATION_ERROR}: ${errorDetails.join(', ')}`);
    }

    // Validate date range
    if (value.startDate && value.endDate) {
      if (new Date(value.startDate) > new Date(value.endDate)) {
        throw new Error('startDate cannot be after endDate');
      }
    }

    return value;
  }

  /**
   * Validate authorization header
   * @param {string} authHeader - Authorization header value
   * @returns {string} - Extracted wallet address
   * @throws {Error} - Invalid auth header
   */
  validateAuthHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
    }

    const { error, value } = this.authHeaderSchema.validate(authHeader);
    if (error) {
      logger.warn('Invalid authorization header format');
      throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
    }

    const walletAddress = value.replace('Bearer ', '');
    logger.debug('Authorization validated', { walletAddress: walletAddress.substring(0, 6) + '...' });
    return walletAddress;
  }

  /**
   * Validate business rules for transaction
   * @param {Object} transaction - Transaction data
   * @throws {Error} - Business rule violation
   */
  validateBusinessRules(transaction) {
    // UUID must be valid
    if (!this.isValidUUID(transaction.uuid)) {
      throw new Error('Invalid transaction UUID format');
    }

    // Status must match operation
    if (transaction.operation === 'DELETE' && transaction.status !== 'cancelled') {
      throw new Error('DELETE operations must have cancelled status');
    }

    // Future dates not allowed
    const createdAt = new Date(transaction.created_at);
    if (createdAt > new Date()) {
      throw new Error('Transaction created_at cannot be in the future');
    }

    // Amount validation based on type
    if (transaction.type === 'debit' && transaction.amount >= 0) {
      throw new Error('Debit transactions must have negative amounts');
    }
    if (transaction.type === 'credit' && transaction.amount <= 0) {
      throw new Error('Credit transactions must have positive amounts');
    }

    logger.debug('Business rules validation passed', { uuid: transaction.uuid });
  }

  /**
   * Validate UUID format
   * @param {string} uuid - UUID string
   * @returns {boolean} - Valid UUID
   */
  isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Sanitize input data (remove unknown fields, trim strings)
   * @param {Object} data - Input data
   * @param {Object} schema - Joi schema for sanitization
   * @returns {Object} - Sanitized data
   */
  sanitizeInput(data, schema) {
    const { value } = schema.validate(data, {
      stripUnknown: true,
      abortEarly: false
    });

    // Trim string values
    const sanitized = JSON.parse(JSON.stringify(value, (key, val) => {
      if (typeof val === 'string') {
        return val.trim();
      }
      return val;
    }));

    return sanitized;
  }

  /**
   * Create custom validation schema
   * @param {Object} schemaDefinition - Schema definition
   * @returns {Joi.ObjectSchema} - Joi schema
   */
  createSchema(schemaDefinition) {
    return Joi.object(schemaDefinition);
  }

  /**
   * Validate array of items
   * @param {Array} items - Array to validate
   * @param {Joi.ObjectSchema} itemSchema - Schema for each item
   * @returns {Array} - Validated array
   * @throws {Error} - Validation error
   */
  validateArray(items, itemSchema) {
    const results = [];
    const errors = [];

    for (let i = 0; i < items.length; i++) {
      try {
        const { error, value } = itemSchema.validate(items[i], { abortEarly: false });
        if (error) {
          errors.push({ index: i, errors: error.details });
        } else {
          results.push(value);
        }
      } catch (error) {
        errors.push({ index: i, error: error.message });
      }
    }

    if (errors.length > 0) {
      logger.warn('Array validation partial failure', { valid: results.length, invalid: errors.length });
      throw new Error(`Validation failed for ${errors.length} items: ${JSON.stringify(errors)}`);
    }

    return results;
  }
}

// Singleton instance
const validationService = new ValidationService();

export default validationService;
export { ValidationService };