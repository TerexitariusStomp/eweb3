import analyticsService from '../../services/analytics.service.js';
import blockchainService from '../../services/blockchain.service.js';
import cacheService from '../../services/cache.service.js';
import validationService from '../../services/validation.service.js';
import { StatusCodes, ReasonPhrases } from 'http-status-codes';
import logger from '../../utils/logger.js';
import { ERROR_MESSAGES } from '../../utils/constants.js';

/**
 * Transaction Controller
 * Handles API requests for transactions and analytics
 */

/**
 * Health check endpoint
 */
export const healthCheck = async (req, res) => {
  try {
    logger.debug('Health check requested', { ip: req.ip });

    // Basic app health
    const appHealth = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'edn-blockchain-recorder',
      version: '2.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime()
    };

    // Blockchain health (non-blocking)
    let blockchainHealth = { status: 'checking' };
    try {
      const contractInfo = await blockchainService.contract.getTransactionCount();
      blockchainHealth = {
        status: 'connected',
        chainId: process.env.CHAIN_ID || 84532,
        contractAddress: process.env.CONTRACT_ADDRESS,
        transactionCount: contractInfo.toString()
      };
    } catch (error) {
      logger.warn('Blockchain health check failed', { error: error.message });
      blockchainHealth = { status: 'disconnected', error: error.message };
    }

    // Cache health
    const cacheHealth = {
      status: 'ok',
      stats: cacheService.getCacheStats()
    };

    res.status(StatusCodes.OK).json({
      ...appHealth,
      blockchain: blockchainHealth,
      cache: cacheHealth
    });

  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Health check failed',
      details: { error: error.message }
    });
  }
};

/**
 * Get recent transactions
 */
export const getRecentTransactions = async (req, res) => {
  try {
    const walletAddress = req.walletAddress;
    logger.info('Fetching recent transactions', { walletAddress: walletAddress.substring(0, 6) + '...' });

    const limit = parseInt(req.query.limit) || 10;
    const transactions = await analyticsService.getRecentTransactions(limit);

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        transactions,
        count: transactions.length,
        limit
      },
      meta: {
        wallet: walletAddress,
        endpoint: 'recent_transactions'
      }
    });

  } catch (error) {
    logger.error('Failed to get recent transactions', { 
      wallet: req.walletAddress?.substring(0, 6) + '...',
      error: error.message 
    });
    throw error;
  }
};

/**
 * Get transaction by UUID
 */
export const getTransactionByUUID = async (req, res) => {
  try {
    const { uuid } = req.params;
    const walletAddress = req.walletAddress;

    logger.info('Fetching transaction by UUID', { 
      uuid, 
      wallet: walletAddress.substring(0, 6) + '...' 
    });

    if (!validationService.isValidUUID(uuid)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid UUID format',
        details: { uuid: 'invalid_format' }
      });
    }

    const transaction = await blockchainService.getTransactionByUUID(uuid);

    if (!transaction) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: ERROR_MESSAGES.TRANSACTION_NOT_FOUND,
        details: { uuid }
      });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      data: transaction,
      meta: {
        wallet: walletAddress,
        endpoint: 'transaction_by_uuid'
      }
    });

  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: ERROR_MESSAGES.TRANSACTION_NOT_FOUND,
        details: { uuid: req.params.uuid }
      });
    }

    logger.error('Failed to get transaction by UUID', { 
      uuid: req.params.uuid,
      wallet: req.walletAddress?.substring(0, 6) + '...',
      error: error.message 
    });
    throw error;
  }
};

/**
 * Get transactions by empresa ID
 */
export const getTransactionsByEmpresa = async (req, res) => {
  try {
    const { empresaId } = req.params;
    const walletAddress = req.walletAddress;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    logger.info('Fetching transactions by empresa', { 
      empresaId, 
      page, 
      limit,
      wallet: walletAddress.substring(0, 6) + '...' 
    });

    const validatedQuery = validationService.validateApiQuery({ 
      ...req.query, 
      page, 
      limit,
      empresaId: parseInt(empresaId)
    });

    const transactions = await blockchainService.getTransactionsByEmpresa(
      validatedQuery.empresaId, 
      { page: validatedQuery.page, limit: validatedQuery.limit }
    );

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: validatedQuery.page,
          limit: validatedQuery.limit,
          total: transactions.length, // Note: For full pagination, would need total count from contract
          hasMore: transactions.length === validatedQuery.limit
        }
      },
      meta: {
        wallet: walletAddress,
        endpoint: 'transactions_by_empresa',
        empresaId: validatedQuery.empresaId
      }
    });

  } catch (error) {
    logger.error('Failed to get transactions by empresa', { 
      empresaId: req.params.empresaId,
      wallet: req.walletAddress?.substring(0, 6) + '...',
      error: error.message 
    });
    throw error;
  }
};

/**
 * Filter transactions with advanced criteria
 */
export const filterTransactions = async (req, res) => {
  try {
    const walletAddress = req.walletAddress;
    
    logger.info('Filtering transactions', { 
      wallet: walletAddress.substring(0, 6) + '...',
      filters: req.query 
    });

    const validatedFilters = validationService.validateApiQuery(req.query);
    
    const result = await analyticsService.filterTransactions(validatedFilters);

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        transactions: result.transactions,
        pagination: result.pagination
      },
      filters: result.filters,
      meta: {
        wallet: walletAddress,
        endpoint: 'filter_transactions',
        totalFiltered: result.transactions.length
      }
    });

  } catch (error) {
    logger.error('Failed to filter transactions', { 
      wallet: req.walletAddress?.substring(0, 6) + '...',
      error: error.message 
    });
    throw error;
  }
};

/**
 * Get overview statistics
 */
export const getOverviewStats = async (req, res) => {
  try {
    const walletAddress = req.walletAddress;
    
    logger.info('Fetching overview statistics', { 
      wallet: walletAddress.substring(0, 6) + '...' 
    });

    const stats = await analyticsService.getOverviewStats();

    res.status(StatusCodes.OK).json({
      success: true,
      data: stats,
      meta: {
        wallet: walletAddress,
        endpoint: 'analytics_overview',
        cached: !!req.cacheHit // If we add cache headers later
      }
    });

  } catch (error) {
    logger.error('Failed to get overview stats', { 
      wallet: req.walletAddress?.substring(0, 6) + '...',
      error: error.message 
    });
    throw error;
  }
};

/**
 * Get statistics by transaction type
 */
export const getStatsByType = async (req, res) => {
  try {
    const walletAddress = req.walletAddress;
    
    logger.info('Fetching stats by type', { 
      wallet: walletAddress.substring(0, 6) + '...' 
    });

    const stats = await analyticsService.getStatsByType();

    res.status(StatusCodes.OK).json({
      success: true,
      data: stats,
      meta: {
        wallet: walletAddress,
        endpoint: 'analytics_by_type'
      }
    });

  } catch (error) {
    logger.error('Failed to get stats by type', { 
      wallet: req.walletAddress?.substring(0, 6) + '...',
      error: error.message 
    });
    throw error;
  }
};

/**
 * Get statistics by empresa
 */
export const getStatsByEmpresa = async (req, res) => {
  try {
    const { empresaId } = req.params;
    const walletAddress = req.walletAddress;
    
    logger.info('Fetching stats by empresa', { 
      empresaId, 
      wallet: walletAddress.substring(0, 6) + '...' 
    });

    const stats = await analyticsService.getStatsByEmpresa(parseInt(empresaId));

    res.status(StatusCodes.OK).json({
      success: true,
      data: stats,
      meta: {
        wallet: walletAddress,
        endpoint: 'analytics_by_empresa',
        empresaId: parseInt(empresaId)
      }
    });

  } catch (error) {
    logger.error('Failed to get stats by empresa', { 
      empresaId: req.params.empresaId,
      wallet: req.walletAddress?.substring(0, 6) + '...',
      error: error.message 
    });
    throw error;
  }
};

/**
 * Get transaction trends
 */
export const getTransactionTrends = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const walletAddress = req.walletAddress;
    
    logger.info('Fetching transaction trends', { 
      period, 
      wallet: walletAddress.substring(0, 6) + '...' 
    });

    const trends = await analyticsService.getTransactionTrends(period);

    res.status(StatusCodes.OK).json({
      success: true,
      data: trends,
      meta: {
        wallet: walletAddress,
        endpoint: 'analytics_trends',
        period
      }
    });

  } catch (error) {
    logger.error('Failed to get transaction trends', { 
      period: req.query.period,
      wallet: req.walletAddress?.substring(0, 6) + '...',
      error: error.message 
    });
    throw error;
  }
};

/**
 * Grant access to wallet (admin only)
 * Note: This would require additional admin auth in production
 */
export const grantAccess = async (req, res) => {
  try {
    const { address } = req.body;
    const walletAddress = req.walletAddress;
    
    if (!address || !address.startsWith('0x')) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Valid Ethereum address required',
        details: { address: 'invalid' }
      });
    }

    logger.info('Granting access request', { 
      adminWallet: walletAddress.substring(0, 6) + '...',
      targetWallet: address.substring(0, 6) + '...' 
    });

    const result = await blockchainService.grantAccess(address);

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Access granted successfully',
      data: result,
      meta: {
        adminWallet: walletAddress,
        targetWallet: address,
        endpoint: 'admin_grant_access'
      }
    });

  } catch (error) {
    logger.error('Failed to grant access', { 
      adminWallet: req.walletAddress?.substring(0, 6) + '...',
      error: error.message 
    });
    throw error;
  }
};

/**
 * Revoke access from wallet (admin only)
 */
export const revokeAccess = async (req, res) => {
  try {
    const { address } = req.body;
    const walletAddress = req.walletAddress;
    
    if (!address || !address.startsWith('0x')) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Valid Ethereum address required',
        details: { address: 'invalid' }
      });
    }

    logger.info('Revoking access request', { 
      adminWallet: walletAddress.substring(0, 6) + '...',
      targetWallet: address.substring(0, 6) + '...' 
    });

    const result = await blockchainService.revokeAccess(address);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Access revoked successfully',
      data: result,
      meta: {
        adminWallet: walletAddress,
        targetWallet: address,
        endpoint: 'admin_revoke_access'
      }
    });

  } catch (error) {
    logger.error('Failed to revoke access', { 
      adminWallet: req.walletAddress?.substring(0, 6) + '...',
      error: error.message 
    });
    throw error;
  }
};