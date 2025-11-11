import { ethers } from 'ethers';
import {
  contract,
  provider,
  wallet,
  estimateGasWithBuffer,
  hasSufficientBalance,
  blockchainConfig
} from '../config/blockchain.config.js';
import {
  formatTransactionForBlockchain,
  formatTransactionFromBlockchain,
  formatBlockchainError
} from '../utils/formatter.js';
import { retryBlockchainOperation, CircuitBreaker } from '../utils/retry.js';
import { 
  blockchainLogger as logger,
  logBlockchainTransaction,
  logBlockchainConfirmation
} from '../utils/logger.js';
import { transactionCache, invalidateAllCaches } from './cache.service.js';
import { BLOCKCHAIN, ERROR_MESSAGES } from '../utils/constants.js';

/**
 * Circuit breaker for blockchain operations
 */
const circuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 60000,
  monitoringPeriod: 120000
});

/**
 * Blockchain Service
 * Handles all interactions with the smart contract
 */
class BlockchainService {
  constructor() {
    this.contract = contract;
    this.provider = provider;
    this.wallet = wallet;
  }
  
  /**
   * Record transaction to blockchain
   * Main method called by webhook controller
   * @param {Object} webhookTransaction - Raw transaction from webhook
   * @returns {Promise<Object>} - Transaction receipt and metadata
   */
  async recordTransaction(webhookTransaction) {
    return circuitBreaker.execute(async () => {
      try {
        logger.info('Starting blockchain recording', {
          id: webhookTransaction.id,
          uuid: webhookTransaction.uuid
        });
        
        // Format data for blockchain
        const formattedData = formatTransactionForBlockchain(webhookTransaction);
        
        // Check if transaction already exists
        const exists = await this.checkTransactionExists(formattedData.uuid);
        if (exists) {
          logger.warn('Transaction already recorded', { uuid: formattedData.uuid });
          throw new Error('Transaction already recorded on blockchain');
        }
        
        // Estimate gas
        const gasEstimate = await this.estimateGas(formattedData);
        
        // Check balance
        const hasBalance = await hasSufficientBalance(gasEstimate);
        if (!hasBalance) {
          throw new Error('Insufficient balance for transaction');
        }
        
        // Execute transaction with retry logic
        const receipt = await retryBlockchainOperation(
          async () => await this.executeRecordTransaction(formattedData, gasEstimate),
          'Record transaction to blockchain'
        );
        
        // Parse blockchain transaction ID from event
        const blockchainId = await this.parseTransactionIdFromReceipt(receipt);
        
        // Log success
        logBlockchainConfirmation(receipt, blockchainId);
        
        // Invalidate caches since new transaction was added
        invalidateAllCaches();
        
        // Return result
        return {
          success: true,
          transactionHash: receipt.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          blockchainId: blockchainId ? blockchainId.toString() : null,
          explorerUrl: `${blockchainConfig.explorerUrl}/tx/${receipt.hash}`,
          confirmations: receipt.confirmations
        };
        
      } catch (error) {
        logger.error('Blockchain recording failed', {
          error: error.message,
          stack: error.stack,
          transaction: webhookTransaction
        });
        throw error;
      }
    });
  }
  
  /**
   * Check if transaction already exists on blockchain
   * @param {string} uuid - Transaction UUID
   * @returns {Promise<boolean>}
   */
  async checkTransactionExists(uuid) {
    try {
      await this.contract.getTransactionByUUID(uuid);
      return true;
    } catch (error) {
      // Transaction not found is expected for new transactions
      if (error.message.includes('Transaction not found')) {
        return false;
      }
      throw error;
    }
  }
  
  /**
   * Estimate gas for record transaction
   * @param {Object} formattedData - Formatted transaction data
   * @returns {Promise<bigint>}
   */
  async estimateGas(formattedData) {
    return estimateGasWithBuffer(
      'recordTransaction',
      formattedData.id,
      formattedData.transactionType,
      formattedData.amount,
      formattedData.empresaId,
      formattedData.parceiroNegocioId,
      formattedData.celularId,
      formattedData.moedaId,
      formattedData.plataformaId,
      formattedData.transacaoTipoId,
      formattedData.status,
      formattedData.createdAt,
      formattedData.tableName,
      formattedData.operation,
      formattedData.dataControle,
      formattedData.uuid,
      formattedData.versao
    );
  }
  
  /**
   * Execute record transaction on blockchain
   * @param {Object} formattedData - Formatted transaction data
   * @param {bigint} gasLimit - Gas limit
   * @returns {Promise<Object>} - Transaction receipt
   */
  async executeRecordTransaction(formattedData, gasLimit) {
    // Send transaction
    const tx = await this.contract.recordTransaction(
      formattedData.id,
      formattedData.transactionType,
      formattedData.amount,
      formattedData.empresaId,
      formattedData.parceiroNegocioId,
      formattedData.celularId,
      formattedData.moedaId,
      formattedData.plataformaId,
      formattedData.transacaoTipoId,
      formattedData.status,
      formattedData.createdAt,
      formattedData.tableName,
      formattedData.operation,
      formattedData.dataControle,
      formattedData.uuid,
      formattedData.versao,
      {
        gasLimit: gasLimit
      }
    );
    
    logBlockchainTransaction(tx.hash, formattedData);
    
    // Wait for confirmation
    const receipt = await tx.wait(blockchainConfig.confirmationBlocks);
    
    return receipt;
  }
  
  /**
   * Parse transaction ID from receipt events
   * @param {Object} receipt - Transaction receipt
   * @returns {bigint|null} - Blockchain transaction ID
   */
  async parseTransactionIdFromReceipt(receipt) {
    try {
      // Find TransactionRecorded event
      const event = receipt.logs.find(log => {
        try {
          const parsed = this.contract.interface.parseLog({
            topics: log.topics,
            data: log.data
          });
          return parsed && parsed.name === 'TransactionRecorded';
        } catch {
          return false;
        }
      });
      
      if (event) {
        const parsedLog = this.contract.interface.parseLog({
          topics: event.topics,
          data: event.data
        });
        return parsedLog.args[0]; // transactionId is first indexed parameter
      }
      
      return null;
    } catch (error) {
      logger.warn('Failed to parse transaction ID from receipt', {
        error: error.message
      });
      return null;
    }
  }
  
  /**
   * Get transaction by UUID
   * @param {string} uuid - Transaction UUID
   * @returns {Promise<Object>} - Transaction data
   */
  async getTransactionByUUID(uuid) {
    // Try cache first
    return transactionCache.getOrFetchTransaction(uuid, async () => {
      try {
        logger.debug('Fetching transaction from blockchain', { uuid });
        
        const tx = await retryBlockchainOperation(
          async () => await this.contract.getTransactionByUUID(uuid),
          'Get transaction by UUID'
        );
        
        return formatTransactionFromBlockchain(tx);
      } catch (error) {
        if (error.message.includes('Transaction not found')) {
          throw new Error(ERROR_MESSAGES.TRANSACTION_NOT_FOUND);
        }
        throw error;
      }
    });
  }
  
  /**
   * Get transaction by blockchain ID
   * @param {number} blockchainId - Blockchain transaction ID
   * @returns {Promise<Object>} - Transaction data
   */
  async getTransactionById(blockchainId) {
    try {
      logger.debug('Fetching transaction from blockchain', { blockchainId });
      
      const tx = await retryBlockchainOperation(
        async () => await this.contract.getTransaction(blockchainId),
        'Get transaction by ID'
      );
      
      const formatted = formatTransactionFromBlockchain(tx);
      
      // Cache by UUID
      transactionCache.setTransaction(formatted.uuid, formatted);
      
      return formatted;
    } catch (error) {
      if (error.message.includes('Invalid ID')) {
        throw new Error(ERROR_MESSAGES.TRANSACTION_NOT_FOUND);
      }
      throw error;
    }
  }
  
  /**
   * Get transactions by empresa ID with pagination
   * @param {number} empresaId - Empresa ID
   * @param {Object} options - Pagination options
   * @returns {Promise<Array>} - Array of transactions
   */
  async getTransactionsByEmpresa(empresaId, options = {}) {
    const { page = 1, limit = 20 } = options;
    
    // Try cache first
    const cached = transactionCache.getTransactionsByEmpresa(empresaId, page);
    if (cached) {
      return cached;
    }
    
    try {
      logger.debug('Fetching transactions by empresa', { empresaId, limit });
      
      // Fetch from blockchain (contract returns max 100)
      const txs = await retryBlockchainOperation(
        async () => await this.contract.getTransactionsByEmpresa(
          BigInt(empresaId),
          Math.min(limit, 100)
        ),
        'Get transactions by empresa'
      );
      
      // Filter out empty transactions and format
      const formatted = txs
        .filter(tx => tx.id > 0)
        .map(tx => formatTransactionFromBlockchain(tx));
      
      // Cache result
      transactionCache.setTransactionsByEmpresa(empresaId, page, formatted);
      
      return formatted;
    } catch (error) {
      logger.error('Failed to fetch transactions by empresa', {
        empresaId,
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Get recent transactions by listening to events
   * @param {number} limit - Number of recent transactions
   * @returns {Promise<Array>} - Recent transactions
   */
  async getRecentTransactions(limit = 10) {
    try {
      logger.debug('Fetching recent transactions', { limit });
      
      // Get TransactionRecorded events from recent blocks
      const currentBlock = await this.provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - BLOCKCHAIN.EVENT_FETCH_BLOCKS);
      
      const filter = this.contract.filters.TransactionRecorded();
      const events = await this.contract.queryFilter(filter, fromBlock, 'latest');
      
      // Get unique UUIDs from events (most recent first)
      const uniqueUUIDs = [...new Set(
        events
          .reverse()
          .slice(0, limit)
          .map(event => event.args.uuid)
      )];
      
      // Fetch transaction details
      const transactions = await Promise.all(
        uniqueUUIDs.map(uuid => this.getTransactionByUUID(uuid))
      );
      
      return transactions.filter(tx => tx !== null);
    } catch (error) {
      logger.error('Failed to fetch recent transactions', {
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Get total transaction count
   * @returns {Promise<number>} - Total count
   */
  async getTransactionCount() {
    try {
      const count = await retryBlockchainOperation(
        async () => await this.contract.transactionCount(),
        'Get transaction count'
      );
      return Number(count);
    } catch (error) {
      logger.error('Failed to get transaction count', {
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Check if address is authorized
   * @param {string} address - Ethereum address
   * @returns {Promise<boolean>}
   */
  async isAuthorized(address) {
    try {
      return await retryBlockchainOperation(
        async () => await this.contract.isAuthorized(address),
        'Check authorization'
      );
    } catch (error) {
      logger.error('Failed to check authorization', {
        address,
        error: error.message
      });
      return false;
    }
  }
  
  /**
   * Grant access to a user (owner only)
   * @param {string} address - Address to grant access
   * @returns {Promise<Object>} - Transaction receipt
   */
  async grantAccess(address) {
    try {
      logger.info('Granting access', { address });
      
      const tx = await this.contract.grantAccess(address);
      const receipt = await tx.wait();
      
      logger.info('Access granted', { address, txHash: receipt.hash });
      
      return {
        success: true,
        transactionHash: receipt.hash
      };
    } catch (error) {
      logger.error('Failed to grant access', {
        address,
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Revoke access from a user (owner only)
   * @param {string} address - Address to revoke access
   * @returns {Promise<Object>} - Transaction receipt
   */
  async revokeAccess(address) {
    try {
      logger.info('Revoking access', { address });
      
      const tx = await this.contract.revokeAccess(address);
      const receipt = await tx.wait();
      
      logger.info('Access revoked', { address, txHash: receipt.hash });
      
      return {
        success: true,
        transactionHash: receipt.hash
      };
    } catch (error) {
      logger.error('Failed to revoke access', {
        address,
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Subscribe to new transactions (WebSocket)
   * @param {Function} callback - Callback function
   * @returns {Function} - Cleanup function
   */
  subscribeToNewTransactions(callback) {
    const filter = this.contract.filters.TransactionRecorded();
    
    const eventHandler = async (transactionId, empresaId, transactionType, amount, timestamp, uuid, event) => {
      try {
        logger.info('New transaction event received', {
          uuid,
          transactionId: transactionId.toString(),
          empresaId: empresaId.toString()
        });
        
        // Fetch full transaction details
        const tx = await this.getTransactionByUUID(uuid);
        callback(tx, event);
      } catch (error) {
        logger.error('Error in transaction subscription', {
          error: error.message,
          uuid
        });
      }
    };
    
    this.contract.on(filter, eventHandler);
    
    logger.info('Subscribed to new transactions');
    
    // Return cleanup function
    return () => {
      this.contract.off(filter, eventHandler);
      logger.info('Unsubscribed from new transactions');
    };
  }
  
  /**
   * Get circuit breaker state
   */
  getCircuitBreakerState() {
    return circuitBreaker.getState();
  }
}

// Create and export singleton instance
const blockchainService = new BlockchainService();

export default blockchainService;
export { BlockchainService };
