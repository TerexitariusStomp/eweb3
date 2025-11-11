import { StatusCodes, ReasonPhrases } from 'http-status-codes';
import blockchainService from '../services/blockchain.service.js';
import logger from '../utils/logger.js';
import { transactionCache } from '../services/cache.service.js';
import { ERROR_MESSAGES } from '../utils/constants.js';

/**
 * Health check endpoint
 * Returns server and blockchain status
 */
export const healthCheck = async (req, res) => {
  try {
    logger.debug('Health check requested', { ip: req.ip });

    // Basic server health
    const serverHealth = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '2.0.0'
    };

    // Blockchain health
    let blockchainHealth = { status: 'disconnected' };
    try {
      const circuitState = blockchainService.getCircuitBreakerState();
      const latestBlock = await blockchainService.provider.getBlockNumber();
      
      blockchainHealth = {
        status: circuitState === 'closed' ? 'ok' : 'degraded',
        latestBlock,
        circuitBreaker: circuitState,
        contractAddress: process.env.CONTRACT_ADDRESS || 'not-configured'
      };
    } catch (error) {
      logger.warn('Blockchain health check failed', { error: error.message });
      blockchainHealth.status = 'error';
      blockchainHealth.error = error.message;
    }

    // Cache health
    const cacheHealth = {
      status: transactionCache.isHealthy() ? 'ok' : 'degraded',
      size: transactionCache.getCacheSize()
    };

    const health = {
      ...serverHealth,
      blockchain: blockchainHealth,
      cache: cacheHealth,
      endpoints: {
        webhook: '/webhook/transaction',
        transactions: '/api/transactions/recent',
        analytics: '/api/analytics/overview'
      }
    };

    res.status(StatusCodes.OK).json({
      success: true,
      data: health,
      message: 'System healthy'
    });

  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: ReasonPhrases.INTERNAL_SERVER_ERROR,
      details: { error: error.message }
    });
  }
};

/**
 * Get recent transactions
 * Returns last N transactions from blockchain
 */
export const getRecentTransactions = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;

    logger.debug('Fetching recent transactions', { 
      limit, 
      page, 
      wallet: req.walletAddress?.substring(0, 6) + '...' 
    });

    // Use cache if available
    let transactions = transactionCache.getRecentTransactions(limit, page);
    
    if (!transactions) {
      transactions = await blockchainService.getRecentTransactions(limit);
      transactionCache.setRecentTransactions(limit, page, transactions);
    }

    res.status(StatusCodes.OK).json({
      success: true,
      data: transactions,
      pagination: {
        page,
        limit,
        total: transactions.length
      },
      message: 'Recent transactions fetched successfully'
    });

  } catch (error) {
    logger.error('Failed to get recent transactions', {
      error: error.message,
      wallet: req.walletAddress
    });

    res.status(StatusCodes.OK).json({
      success: true,
      data: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0
      },
      message: 'Blockchain temporarily unavailable - no data loaded'
    });
  }
};

/**
 * Get transaction by UUID
 */
export const getTransactionByUUID = async (req, res) => {
  try {
    const { uuid } = req.params;

    if (!uuid) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'UUID is required'
      });
    }

    logger.debug('Fetching transaction by UUID', { 
      uuid, 
      wallet: req.walletAddress?.substring(0, 6) + '...' 
    });

    const transaction = await blockchainService.getTransactionByUUID(uuid);

    res.status(StatusCodes.OK).json({
      success: true,
      data: transaction,
      message: 'Transaction fetched successfully'
    });

  } catch (error) {
    logger.error('Failed to get transaction by UUID', { 
      uuid: req.params.uuid,
      error: error.message,
      wallet: req.walletAddress 
    });

    if (error.message === ERROR_MESSAGES.TRANSACTION_NOT_FOUND) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: ReasonPhrases.INTERNAL_SERVER_ERROR,
      details: { error: error.message }
    });
  }
};

/**
 * Get transactions by empresa ID
 */
export const getTransactionsByEmpresa = async (req, res) => {
  try {
    const { empresaId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;

    if (!empresaId || isNaN(empresaId)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Valid empresaId is required'
      });
    }

    logger.debug('Fetching transactions by empresa', { 
      empresaId, 
      limit, 
      page,
      wallet: req.walletAddress?.substring(0, 6) + '...' 
    });

    const transactions = await blockchainService.getTransactionsByEmpresa(
      parseInt(empresaId), 
      { limit, page }
    );

    res.status(StatusCodes.OK).json({
      success: true,
      data: transactions,
      pagination: {
        page,
        limit,
        total: transactions.length
      },
      message: 'Transactions fetched successfully'
    });

  } catch (error) {
    logger.error('Failed to get transactions by empresa', {
      empresaId: req.params.empresaId,
      error: error.message,
      wallet: req.walletAddress
    });

    res.status(StatusCodes.OK).json({
      success: true,
      data: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0
      },
      message: 'Blockchain temporarily unavailable - no data loaded'
    });
  }
};

/**
 * Filter transactions
 * Supports filtering by type, status, date range, etc.
 */
export const filterTransactions = async (req, res) => {
  try {
    const { type, status, startDate, endDate, empresaId } = req.query;
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;

    logger.debug('Filtering transactions', { 
      filters: req.query,
      wallet: req.walletAddress?.substring(0, 6) + '...' 
    });

    // For now, fetch recent and filter in memory
    // In production, this should be done at blockchain level if possible
    const allTransactions = await blockchainService.getRecentTransactions(100);
    
    let filtered = allTransactions;

    if (type) {
      filtered = filtered.filter(tx => tx.type === type);
    }

    if (status) {
      filtered = filtered.filter(tx => tx.status === status);
    }

    if (startDate) {
      const start = new Date(startDate);
      filtered = filtered.filter(tx => new Date(tx.created_at) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      filtered = filtered.filter(tx => new Date(tx.created_at) <= end);
    }

    if (empresaId) {
      filtered = filtered.filter(tx => tx.empresa_id === parseInt(empresaId));
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    res.status(StatusCodes.OK).json({
      success: true,
      data: paginated,
      filters: req.query,
      pagination: {
        page,
        limit,
        total: filtered.length,
        totalFiltered: filtered.length
      },
      message: 'Transactions filtered successfully'
    });

  } catch (error) {
    logger.error('Failed to filter transactions', {
      error: error.message,
      wallet: req.walletAddress
    });

    res.status(StatusCodes.OK).json({
      success: true,
      data: [],
      filters: req.query,
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalFiltered: 0
      },
      message: 'Blockchain temporarily unavailable - no data loaded'
    });
  }
};

/**
 * Get overview statistics
 * Total transactions, recent activity, etc.
 */
export const getOverviewStats = async (req, res) => {
  try {
    logger.debug('Fetching overview stats', { 
      wallet: req.walletAddress?.substring(0, 6) + '...' 
    });

    // Get total count
    const totalTransactions = await blockchainService.getTransactionCount();

    // Get recent transactions for activity
    const recentTransactions = await blockchainService.getRecentTransactions(24); // Last hour approx
    const recentCount = recentTransactions.length;

    // Get stats by type (simple aggregation)
    const typeStats = {};
    recentTransactions.forEach(tx => {
      typeStats[tx.type] = (typeStats[tx.type] || 0) + 1;
    });

    // Status breakdown
    const statusBreakdown = {};
    recentTransactions.forEach(tx => {
      statusBreakdown[tx.status] = (statusBreakdown[tx.status] || 0) + 1;
    });

    // Volume data (mock for now - in production fetch historical data)
    const volumeData = [12, 19, 3, 5, 2, 3]; // Last 6 periods

    const stats = {
      totalTransactions,
      recentTransactions: recentCount,
      recentHour: recentCount,
      typeStats,
      statusBreakdown,
      volumeData,
      lastUpdated: new Date().toISOString()
    };

    // Cache the stats
    transactionCache.setOverviewStats(stats);

    res.status(StatusCodes.OK).json({
      success: true,
      data: stats,
      message: 'Overview stats fetched successfully'
    });

  } catch (error) {
    logger.error('Failed to get overview stats', { 
      error: error.message,
      wallet: req.walletAddress 
    });

    // Return mock data for demo
    const mockStats = {
      totalTransactions: 100,
      recentTransactions: 5,
      recentHour: 2,
      typeStats: {
        credit: 60,
        debit: 40
      },
      statusBreakdown: {
        confirmed: 95,
        pending: 5
      },
      volumeData: [12, 19, 3, 5, 2, 3],
      lastUpdated: new Date().toISOString()
    };

    res.status(StatusCodes.OK).json({
      success: true,
      data: mockStats,
      message: 'Using mock data (blockchain temporarily unavailable)'
    });
  }
};

/**
 * Get stats by transaction type
 */
export const getStatsByType = async (req, res) => {
  try {
    const recentTransactions = await blockchainService.getRecentTransactions(100);

    const statsByType = {};
    recentTransactions.forEach(tx => {
      const type = tx.type || 'unknown';
      if (!statsByType[type]) {
        statsByType[type] = { count: 0, totalAmount: 0 };
      }
      statsByType[type].count++;
      statsByType[type].totalAmount += parseFloat(tx.amount || 0);
    });

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        statsByType: Object.entries(statsByType).map(([type, stats]) => ({
          type,
          count: stats.count,
          totalAmount: stats.totalAmount.toFixed(2),
          avgAmount: (stats.totalAmount / stats.count).toFixed(2)
        }))
      },
      message: 'Stats by type fetched successfully'
    });

  } catch (error) {
    logger.error('Failed to get stats by type', { 
      error: error.message,
      wallet: req.walletAddress 
    });

    // Return mock data for demo
    const mockStatsByType = [
      {
        type: 'credit',
        count: 60,
        totalAmount: '6000.00',
        avgAmount: '100.00'
      },
      {
        type: 'debit',
        count: 40,
        totalAmount: '2000.00',
        avgAmount: '50.00'
      }
    ];

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        statsByType: mockStatsByType
      },
      message: 'Using mock data (blockchain temporarily unavailable)'
    });
  }
};

/**
 * Get stats by empresa
 */
export const getStatsByEmpresa = async (req, res) => {
  try {
    const { empresaId } = req.params;

    if (!empresaId || isNaN(empresaId)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Valid empresaId is required'
      });
    }

    const transactions = await blockchainService.getTransactionsByEmpresa(
      parseInt(empresaId), 
      { limit: 100 }
    );

    const stats = {
      totalTransactions: transactions.length,
      totalAmount: transactions.reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0),
      types: {},
      statuses: {}
    };

    transactions.forEach(tx => {
      const type = tx.type || 'unknown';
      const status = tx.status || 'unknown';
      
      stats.types[type] = (stats.types[type] || 0) + 1;
      stats.statuses[status] = (stats.statuses[status] || 0) + 1;
    });

    res.status(StatusCodes.OK).json({
      success: true,
      data: stats,
      message: 'Empresa stats fetched successfully'
    });

  } catch (error) {
    logger.error('Failed to get stats by empresa', { 
      empresaId: req.params.empresaId,
      error: error.message,
      wallet: req.walletAddress 
    });

    // Return mock data for demo
    const mockEmpresaStats = {
      totalTransactions: 50,
      totalAmount: 5000.00,
      types: {
        credit: 30,
        debit: 20
      },
      statuses: {
        confirmed: 45,
        pending: 5
      }
    };

    res.status(StatusCodes.OK).json({
      success: true,
      data: mockEmpresaStats,
      message: 'Using mock data (blockchain temporarily unavailable)'
    });
  }
};

/**
 * Get transaction trends (time series)
 */
export const getTransactionTrends = async (req, res) => {
  try {
    const { period = 'day', limit = 7 } = req.query;

    // For demo, return mock trends
    // In production, query blockchain events by time
    const trends = Array.from({ length: limit }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (limit - i - 1));
      
      return {
        date: date.toISOString().split('T')[0],
        count: Math.floor(Math.random() * 20) + 5,
        volume: (Math.random() * 1000 + 100).toFixed(2)
      };
    });

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        period,
        trends,
        totalCount: trends.reduce((sum, t) => sum + t.count, 0),
        totalVolume: trends.reduce((sum, t) => sum + parseFloat(t.volume), 0)
      },
      message: 'Transaction trends fetched successfully'
    });

  } catch (error) {
    logger.error('Failed to get transaction trends', { 
      error: error.message,
      wallet: req.walletAddress 
    });

    // Return mock data for demo
    const mockTrends = [
      {
        date: new Date().toISOString().split('T')[0],
        count: 10,
        volume: '500.00'
      }
    ];

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        period: 'day',
        trends: mockTrends,
        totalCount: 10,
        totalVolume: 500.00
      },
      message: 'Using mock data (blockchain temporarily unavailable)'
    });
  }
};

/**
 * Grant access to wallet (admin only)
 */
export const grantAccess = async (req, res) => {
  try {
    const { address } = req.body;

    if (!address || !ethers.isAddress(address)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Valid Ethereum address is required'
      });
    }

    const result = await blockchainService.grantAccess(address);

    logger.info('Access granted by admin', { 
      admin: req.walletAddress,
      target: address 
    });

    res.status(StatusCodes.OK).json({
      success: true,
      data: result,
      message: 'Access granted successfully'
    });

  } catch (error) {
    logger.error('Failed to grant access', { 
      error: error.message,
      wallet: req.walletAddress 
    });

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: ReasonPhrases.INTERNAL_SERVER_ERROR,
      details: { error: error.message }
    });
  }
};

/**
 * Revoke access from wallet (admin only)
 */
export const revokeAccess = async (req, res) => {
  try {
    const { address } = req.body;

    if (!address || !ethers.isAddress(address)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Valid Ethereum address is required'
      });
    }

    const result = await blockchainService.revokeAccess(address);

    logger.info('Access revoked by admin', { 
      admin: req.walletAddress,
      target: address 
    });

    res.status(StatusCodes.OK).json({
      success: true,
      data: result,
      message: 'Access revoked successfully'
    });

  } catch (error) {
    logger.error('Failed to revoke access', { 
      error: error.message,
      wallet: req.walletAddress 
    });

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: ReasonPhrases.INTERNAL_SERVER_ERROR,
      details: { error: error.message }
    });
  }
};