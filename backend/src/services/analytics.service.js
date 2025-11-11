import blockchainService from './blockchain.service.js';
import { statsCache } from './cache.service.js';
import logger from '../utils/logger.js';
import { ANALYTICS_PERIODS, TRANSACTION_TYPES } from '../utils/constants.js';
import { formatAmount } from '../utils/formatter.js';
import { 
  startOfDay, 
  startOfWeek, 
  startOfMonth, 
  startOfYear,
  endOfDay,
  isAfter,
  isBefore
} from 'date-fns';

/**
 * Analytics Service
 * Provides dashboard metrics and transaction analytics
 */
class AnalyticsService {
  
  /**
   * Get overview statistics
   * @returns {Promise<Object>} - Overview stats
   */
  async getOverviewStats() {
    // Try cache first
    const cached = statsCache.getOverviewStats();
    if (cached) {
      return cached;
    }
    
    try {
      logger.debug('Computing overview stats');
      
      // Get total count from contract
      const totalTransactions = await blockchainService.getTransactionCount();
      
      // Get recent transactions for analysis
      const recentLimit = 100;
      const recentTxs = await blockchainService.getRecentTransactions(recentLimit);
      
      // Calculate stats
      const stats = {
        totalTransactions,
        totalEmpresas: this.countUniqueEmpresas(recentTxs),
        totalVolume: this.calculateTotalVolume(recentTxs),
        todayTransactions: this.countTransactionsByPeriod(recentTxs, ANALYTICS_PERIODS.TODAY),
        weekTransactions: this.countTransactionsByPeriod(recentTxs, ANALYTICS_PERIODS.WEEK),
        monthTransactions: this.countTransactionsByPeriod(recentTxs, ANALYTICS_PERIODS.MONTH),
        averageTransactionAmount: this.calculateAverageAmount(recentTxs),
        byType: this.groupByType(recentTxs),
        byStatus: this.groupByStatus(recentTxs),
        timestamp: new Date().toISOString()
      };
      
      // Cache result
      statsCache.setOverviewStats(stats);
      
      return stats;
    } catch (error) {
      logger.error('Failed to compute overview stats', {
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Get statistics by transaction type
   * @returns {Promise<Object>} - Stats grouped by type
   */
  async getStatsByType() {
    // Try cache first
    const cached = statsCache.getStatsByType();
    if (cached) {
      return cached;
    }
    
    try {
      logger.debug('Computing stats by type');
      
      const recentTxs = await blockchainService.getRecentTransactions(100);
      
      const statsByType = Object.values(TRANSACTION_TYPES).map(type => {
        const txsOfType = recentTxs.filter(tx => tx.transactionType === type);
        
        return {
          type,
          count: txsOfType.length,
          totalAmount: this.calculateTotalVolume(txsOfType),
          averageAmount: this.calculateAverageAmount(txsOfType),
          percentage: recentTxs.length > 0 
            ? ((txsOfType.length / recentTxs.length) * 100).toFixed(2)
            : 0
        };
      });
      
      const result = {
        byType: statsByType,
        timestamp: new Date().toISOString()
      };
      
      // Cache result
      statsCache.setStatsByType(result);
      
      return result;
    } catch (error) {
      logger.error('Failed to compute stats by type', {
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Get statistics for a specific empresa
   * @param {number} empresaId - Empresa ID
   * @returns {Promise<Object>} - Empresa stats
   */
  async getStatsByEmpresa(empresaId) {
    // Try cache first
    const cached = statsCache.getStatsByEmpresa(empresaId);
    if (cached) {
      return cached;
    }
    
    try {
      logger.debug('Computing stats by empresa', { empresaId });
      
      // Get transactions for this empresa
      const txs = await blockchainService.getTransactionsByEmpresa(empresaId, {
        limit: 100
      });
      
      const stats = {
        empresaId,
        totalTransactions: txs.length,
        totalVolume: this.calculateTotalVolume(txs),
        averageAmount: this.calculateAverageAmount(txs),
        byType: this.groupByType(txs),
        byStatus: this.groupByStatus(txs),
        recentTransactions: txs.slice(0, 10),
        timestamp: new Date().toISOString()
      };
      
      // Cache result
      statsCache.setStatsByEmpresa(empresaId, stats);
      
      return stats;
    } catch (error) {
      logger.error('Failed to compute stats by empresa', {
        empresaId,
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Filter transactions by criteria
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Object>} - Filtered transactions with pagination
   */
  async filterTransactions(filters) {
    try {
      logger.debug('Filtering transactions', { filters });
      
      // Start with recent transactions
      let transactions = await blockchainService.getRecentTransactions(100);
      
      // Apply filters
      if (filters.type) {
        transactions = transactions.filter(tx => 
          tx.transactionType === filters.type
        );
      }
      
      if (filters.empresaId) {
        transactions = transactions.filter(tx => 
          tx.empresaId === filters.empresaId.toString()
        );
      }
      
      if (filters.status) {
        transactions = transactions.filter(tx => 
          tx.status === filters.status
        );
      }
      
      if (filters.startDate) {
        const startDate = new Date(filters.startDate * 1000);
        transactions = transactions.filter(tx => 
          isAfter(new Date(tx.createdAt), startDate)
        );
      }
      
      if (filters.endDate) {
        const endDate = new Date(filters.endDate * 1000);
        transactions = transactions.filter(tx => 
          isBefore(new Date(tx.createdAt), endDate)
        );
      }
      
      if (filters.minAmount) {
        transactions = transactions.filter(tx => 
          BigInt(tx.amountRaw) >= filters.minAmount
        );
      }
      
      if (filters.maxAmount) {
        transactions = transactions.filter(tx => 
          BigInt(tx.amountRaw) <= filters.maxAmount
        );
      }
      
      // Sort
      transactions = this.sortTransactions(
        transactions, 
        filters.sortBy, 
        filters.sortOrder
      );
      
      // Paginate
      const total = transactions.length;
      const start = filters.offset || 0;
      const end = start + (filters.limit || 20);
      const paginatedTxs = transactions.slice(start, end);
      
      return {
        transactions: paginatedTxs,
        pagination: {
          total,
          page: filters.page || 1,
          limit: filters.limit || 20,
          totalPages: Math.ceil(total / (filters.limit || 20))
        },
        filters: filters
      };
    } catch (error) {
      logger.error('Failed to filter transactions', {
        filters,
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Get transaction trends over time
   * @param {string} period - Time period (day, week, month)
   * @returns {Promise<Object>} - Trend data
   */
  async getTransactionTrends(period = ANALYTICS_PERIODS.MONTH) {
    try {
      logger.debug('Computing transaction trends', { period });
      
      const transactions = await blockchainService.getRecentTransactions(100);
      
      // Group by time buckets based on period
      const trends = this.groupByTimePeriod(transactions, period);
      
      return {
        period,
        trends,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to compute trends', {
        period,
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Helper: Count unique empresas
   */
  countUniqueEmpresas(transactions) {
    const uniqueEmpresas = new Set(
      transactions.map(tx => tx.empresaId)
    );
    return uniqueEmpresas.size;
  }
  
  /**
   * Helper: Calculate total volume
   */
  calculateTotalVolume(transactions) {
    const total = transactions.reduce((sum, tx) => {
      return sum + parseFloat(tx.amount);
    }, 0);
    return total.toFixed(2);
  }
  
  /**
   * Helper: Calculate average amount
   */
  calculateAverageAmount(transactions) {
    if (transactions.length === 0) return '0.00';
    
    const total = parseFloat(this.calculateTotalVolume(transactions));
    const average = total / transactions.length;
    return average.toFixed(2);
  }
  
  /**
   * Helper: Count transactions by period
   */
  countTransactionsByPeriod(transactions, period) {
    const now = new Date();
    let startDate;
    
    switch (period) {
      case ANALYTICS_PERIODS.TODAY:
        startDate = startOfDay(now);
        break;
      case ANALYTICS_PERIODS.WEEK:
        startDate = startOfWeek(now);
        break;
      case ANALYTICS_PERIODS.MONTH:
        startDate = startOfMonth(now);
        break;
      case ANALYTICS_PERIODS.YEAR:
        startDate = startOfYear(now);
        break;
      default:
        return transactions.length;
    }
    
    return transactions.filter(tx => {
      const txDate = new Date(tx.createdAt);
      return isAfter(txDate, startDate);
    }).length;
  }
  
  /**
   * Helper: Group transactions by type
   */
  groupByType(transactions) {
    const grouped = {};
    
    Object.values(TRANSACTION_TYPES).forEach(type => {
      const txsOfType = transactions.filter(tx => tx.transactionType === type);
      grouped[type] = {
        count: txsOfType.length,
        totalAmount: this.calculateTotalVolume(txsOfType)
      };
    });
    
    return grouped;
  }
  
  /**
   * Helper: Group transactions by status
   */
  groupByStatus(transactions) {
    const grouped = {};
    
    transactions.forEach(tx => {
      if (!grouped[tx.status]) {
        grouped[tx.status] = {
          count: 0,
          totalAmount: 0
        };
      }
      grouped[tx.status].count++;
      grouped[tx.status].totalAmount += parseFloat(tx.amount);
    });
    
    // Format amounts
    Object.keys(grouped).forEach(status => {
      grouped[status].totalAmount = grouped[status].totalAmount.toFixed(2);
    });
    
    return grouped;
  }
  
  /**
   * Helper: Group by time period
   */
  groupByTimePeriod(transactions, period) {
    const grouped = {};
    
    transactions.forEach(tx => {
      const date = new Date(tx.createdAt);
      let key;
      
      switch (period) {
        case ANALYTICS_PERIODS.TODAY:
          key = date.toISOString().split('T')[0]; // YYYY-MM-DD
          break;
        case ANALYTICS_PERIODS.WEEK:
        case ANALYTICS_PERIODS.MONTH:
          key = date.toISOString().split('T')[0]; // YYYY-MM-DD
          break;
        case ANALYTICS_PERIODS.YEAR:
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }
      
      if (!grouped[key]) {
        grouped[key] = {
          date: key,
          count: 0,
          totalAmount: 0
        };
      }
      
      grouped[key].count++;
      grouped[key].totalAmount += parseFloat(tx.amount);
    });
    
    // Convert to array and format amounts
    return Object.values(grouped).map(item => ({
      ...item,
      totalAmount: item.totalAmount.toFixed(2)
    })).sort((a, b) => a.date.localeCompare(b.date));
  }
  
  /**
   * Helper: Sort transactions
   */
  sortTransactions(transactions, sortBy = 'blockchainTimestamp', sortOrder = 'desc') {
    return transactions.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      // Handle numeric fields
      if (sortBy === 'amount') {
        aValue = parseFloat(a.amount);
        bValue = parseFloat(b.amount);
      }
      
      // Handle date fields
      if (sortBy === 'createdAt' || sortBy === 'blockchainTimestamp') {
        aValue = new Date(a[sortBy]).getTime();
        bValue = new Date(b[sortBy]).getTime();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }
}

// Create and export singleton instance
const analyticsService = new AnalyticsService();

export default analyticsService;
export { AnalyticsService };
