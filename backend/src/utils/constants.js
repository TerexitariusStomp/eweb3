/**
 * Application Constants
 */

// Blockchain Configuration
export const BLOCKCHAIN = {
  CHAIN_ID: 84532, // Base Sepolia
  CONFIRMATION_BLOCKS: 1,
  EVENT_FETCH_BLOCKS: 10000,
  GAS_BUFFER_PERCENT: 20
};

// Transaction Types (from EDN webhook)
export const TRANSACTION_TYPES = {
  CREDIT: 'credit',
  DEBIT: 'debit',
  TRANSFER: 'transfer',
  REFUND: 'refund',
  ADJUSTMENT: 'adjustment'
};

// Analytics Periods
export const ANALYTICS_PERIODS = {
  TODAY: 'today',
  WEEK: 'week',
  MONTH: 'month',
  YEAR: 'year'
};

// Status Values
export const TRANSACTION_STATUSES = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

// WebSocket Events
export const WS_EVENTS = {
  CONNECTION: 'connection',
  DISCONNECTION: 'disconnection',
  HEARTBEAT: 'heartbeat',
  NEW_TRANSACTION: 'new_transaction',
  ERROR: 'error'
};

// Error Messages
export const ERROR_MESSAGES = {
  TRANSACTION_NOT_FOUND: 'Transaction not found',
  INSUFFICIENT_BALANCE: 'Insufficient balance for gas',
  CONTRACT_NOT_DEPLOYED: 'Contract not deployed',
  INVALID_PRIVATE_KEY: 'Invalid private key format',
  INVALID_CONTRACT_ADDRESS: 'Invalid contract address',
  UNAUTHORIZED: 'Unauthorized access',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
  VALIDATION_ERROR: 'Validation failed',
  BLOCKCHAIN_ERROR: 'Blockchain operation failed',
  WEBHOOK_INVALID: 'Invalid webhook payload'
};

// API Configuration
export const API = {
  RATE_LIMIT_WINDOW_MS: 900000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,
  CACHE_TTL: 300, // 5 minutes
  CACHE_CHECK_PERIOD: 60, // 1 minute
  HEALTH_CHECK_INTERVAL: 30000, // 30 seconds
  WS_HEARTBEAT_INTERVAL: 30000, // 30 seconds
  BLOCK_POLLING_INTERVAL: 12000, // 12 seconds
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
  RETRY_BACKOFF_MULTIPLIER: 2
};

// File Paths
export const PATHS = {
  LOGS: './logs',
  CONTRACTS: './contracts'
};

// Validation Schemas (basic placeholders)
export const VALIDATION_SCHEMAS = {
  WEBHOOK_TRANSACTION: {
    event_type: 'required|string',
    timestamp: 'required|string|isoDate',
    transaction: {
      id: 'required|integer',
      type: 'required|string|min:3|max:20',
      amount: 'required|number|min:0',
      empresa_id: 'required|integer|min:1',
      parceiro_negocio_id: 'required|integer|min:1',
      celular_id: 'required|integer|min:1',
      moeda_id: 'required|integer|min:1',
      plataforma_id: 'required|integer|min:1',
      transacao_tipo_id: 'required|integer|min:1',
      status: 'required|string|min:3|max:20',
      created_at: 'required|string|isoDate',
      table: 'required|string|min:3|max:50',
      operation: 'required|string|min:3|max:10',
      data_controle: 'required|string|date',
      uuid: 'required|string|uuid',
      versao: 'required|string|min:1|max:10'
    }
  }
};

// HTTP Status Codes (using http-status-codes library)
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
};