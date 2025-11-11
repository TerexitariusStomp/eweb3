/**
 * Data Formatting Utilities
 * Handles transaction formatting between webhook format and blockchain format
 */

import { ethers } from 'ethers';
import { TRANSACTION_TYPES, TRANSACTION_STATUSES } from './constants.js';

/**
 * Format transaction data for blockchain storage
 * Converts webhook payload to contract-compatible format
 * @param {Object} webhookTransaction - Raw webhook transaction data
 * @returns {Object} - Formatted data for contract call
 */
export function formatTransactionForBlockchain(webhookTransaction) {
  const transaction = webhookTransaction.transaction || webhookTransaction;
  
  return {
    id: BigInt(transaction.id || 0),
    transactionType: transaction.type || TRANSACTION_TYPES.CREDIT,
    amount: ethers.parseEther(Math.abs(transaction.amount || 0).toString()), // Always positive for uint256
    empresaId: BigInt(transaction.empresa_id || 0),
    parceiroNegocioId: BigInt(transaction.parceiro_negocio_id || 0),
    celularId: BigInt(transaction.celular_id || 0),
    celularDebitoId: BigInt(transaction.celular_debito_id || 0),
    moedaId: BigInt(transaction.moeda_id || 0),
    plataformaId: BigInt(transaction.plataforma_id || 0),
    transacaoTipoId: BigInt(transaction.transacao_tipo_id || 0),
    status: transaction.status || TRANSACTION_STATUSES.CONFIRMED,
    createdAt: BigInt(Math.floor(new Date(transaction.created_at || Date.now()).getTime() / 1000)),
    tableName: transaction.table || 'transactions',
    operation: transaction.operation || 'INSERT',
    dataControle: transaction.data_controle || new Date().toISOString().split('T')[0],
    uuid: transaction.uuid || '',
    versao: transaction.versao || '1.0'
  };
}

/**
 * Format transaction data from blockchain to API response
 * Converts contract return values to readable format
 * @param {Object|Array} blockchainData - Data from contract (tuple or array of tuples)
 * @returns {Object|Array} - Formatted transaction data
 */
export function formatTransactionFromBlockchain(blockchainData) {
  if (Array.isArray(blockchainData)) {
    return blockchainData
      .filter(item => item.id > 0n) // Filter valid transactions
      .map(item => formatSingleTransactionFromBlockchain(item));
  }
  
  return formatSingleTransactionFromBlockchain(blockchainData);
}

function formatSingleTransactionFromBlockchain(item) {
  if (!item || item.id === 0n) return null;
  
  return {
    id: item.id.toString(),
    blockchainId: item.blockchainId?.toString() || item.id.toString(),
    transactionType: item.transactionType,
    amount: parseFloat(ethers.formatEther(item.amount)), // Convert from wei-like to decimal
    amountRaw: item.amount.toString(),
    empresaId: item.empresaId.toString(),
    parceiroNegocioId: item.parceiroNegocioId.toString(),
    celularId: item.celularId.toString(),
    moedaId: item.moedaId.toString(),
    plataformaId: item.plataformaId.toString(),
    transacaoTipoId: item.transacaoTipoId.toString(),
    status: item.status,
    createdAt: new Date(Number(item.createdAt) * 1000).toISOString(),
    blockchainTimestamp: new Date(Number(item.createdAt) * 1000).toISOString(),
    tableName: item.tableName,
    operation: item.operation,
    dataControle: item.dataControle,
    uuid: item.uuid,
    versao: item.versao,
    // Computed fields
    explorerUrl: `${process.env.EXPLORER_URL || 'https://sepolia.basescan.org'}/tx/${item.txHash || ''}`
  };
}

/**
 * Format amount for display (with currency symbol if available)
 * @param {string|number} amount - Amount to format
 * @param {string} [currency='USD'] - Currency symbol
 * @returns {string} - Formatted amount
 */
export function formatAmount(amount, currency = 'USD') {
  const num = parseFloat(amount);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency === 'USD' ? 'USD' : 'BRL', // Default to BRL for EDN context
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}

/**
 * Format blockchain error message for user-friendly display
 * @param {Error} error - Blockchain error
 * @returns {string} - Formatted error message
 */
export function formatBlockchainError(error) {
  let message = error.message || 'Unknown blockchain error';
  
  // Common error patterns
  if (message.includes('insufficient funds')) {
    message = 'Insufficient funds for gas. Please check wallet balance.';
  } else if (message.includes('nonce too low')) {
    message = 'Transaction nonce issue. Please wait or reset nonce.';
  } else if (message.includes('replacement transaction underpriced')) {
    message = 'Gas price too low. Please increase gas price.';
  } else if (message.includes('transaction underpriced')) {
    message = 'Transaction gas price too low.';
  } else if (message.includes('execution reverted')) {
    message = 'Transaction failed: Smart contract execution error.';
  } else if (message.includes('network error')) {
    message = 'Network connectivity issue. Please try again.';
  }
  
  return message;
}

/**
 * Format date for display
 * @param {string|Date} date - Date to format
 * @param {string} [format='short'] - Format type
 * @returns {string} - Formatted date
 */
export function formatDate(date, format = 'short') {
  const d = new Date(date);
  switch (format) {
    case 'short':
      return d.toLocaleDateString();
    case 'long':
      return d.toLocaleString();
    case 'iso':
      return d.toISOString();
    case 'timestamp':
      return Math.floor(d.getTime() / 1000).toString();
    default:
      return d.toISOString();
  }
}

/**
 * Validate and sanitize UUID
 * @param {string} uuid - UUID to validate
 * @returns {string|null} - Validated UUID or null
 */
export function validateUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid) ? uuid : null;
}

/**
 * Convert status to display name
 * @param {string} status - Transaction status
 * @returns {string} - Display name
 */
export function getStatusDisplay(status) {
  const displayNames = {
    [TRANSACTION_STATUSES.PENDING]: 'Pending',
    [TRANSACTION_STATUSES.CONFIRMED]: 'Confirmed',
    [TRANSACTION_STATUSES.FAILED]: 'Failed',
    [TRANSACTION_STATUSES.CANCELLED]: 'Cancelled'
  };
  return displayNames[status] || status;
}

/**
 * Generate explorer URL for transaction
 * @param {string} txHash - Transaction hash
 * @returns {string} - Explorer URL
 */
export function getExplorerUrl(txHash) {
  return `${process.env.EXPLORER_URL || 'https://sepolia.basescan.org'}/tx/${txHash}`;
}