import NodeCache from 'node-cache';
import { API } from '../utils/constants.js';
import logger from '../utils/logger.js';

/**
 * Cache Service
 * In-memory caching using NodeCache for performance
 * No persistent storage - blockchain is source of truth
 */
class CacheService {
  constructor() {
    // Main transaction cache (TTL: 5 minutes)
    this.transactionCache = new NodeCache({
      stdTTL: API.CACHE_TTL,
      checkperiod: API.CACHE_CHECK_PERIOD,
      useClones: false // Faster, but be careful with mutations
    });

    // Stats cache (shorter TTL for frequently changing data)
    this.statsCache = new NodeCache({
      stdTTL: 60, // 1 minute for stats
      checkperiod: 30
    });

    // Empresa-specific caches
    this.empresaCache = new NodeCache({
      stdTTL: API.CACHE_TTL * 2, // 10 minutes for empresa data
      checkperiod: API.CACHE_CHECK_PERIOD
    });

    // Global stats cache (longer TTL)
    this.globalCache = new NodeCache({
      stdTTL: 300, // 5 minutes
      checkperiod: 60
    });

    // Start cache monitoring
    this.startMonitoring();
    
    logger.info('Cache service initialized', {
      transactionTTL: API.CACHE_TTL,
      statsTTL: 60,
      totalKeys: this.transactionCache.keys().length
    });
  }

  /**
   * Get transaction from cache or fetch from blockchain
   * @param {string} uuid - Transaction UUID
   * @param {Function} fetchFn - Function to fetch from blockchain if not cached
   * @returns {Promise<Object>} - Cached or fetched transaction
   */
  async getOrFetchTransaction(uuid, fetchFn) {
    // Try cache first
    let cached = this.transactionCache.get(uuid);
    if (cached) {
      logger.debug('Transaction cache hit', { uuid });
      return cached;
    }

    // Cache miss - fetch from blockchain
    logger.debug('Transaction cache miss, fetching from blockchain', { uuid });
    try {
      const transaction = await fetchFn();
      this.setTransaction(uuid, transaction);
      return transaction;
    } catch (error) {
      logger.error('Failed to fetch transaction for cache', { uuid, error: error.message });
      throw error;
    }
  }

  /**
   * Set transaction in cache
   * @param {string} uuid - Transaction UUID
   * @param {Object} transaction - Transaction data
   */
  setTransaction(uuid, transaction) {
    this.transactionCache.set(uuid, transaction);
    logger.debug('Transaction cached', { uuid });
  }

  /**
   * Get transactions by empresa from cache
   * @param {number} empresaId - Empresa ID
   * @param {number} page - Page number
   * @returns {Array|null} - Cached transactions or null
   */
  getTransactionsByEmpresa(empresaId, page = 1) {
    const cacheKey = `empresa_${empresaId}_page_${page}`;
    return this.empresaCache.get(cacheKey);
  }

  /**
   * Set transactions by empresa in cache
   * @param {number} empresaId - Empresa ID
   * @param {number} page - Page number
   * @param {Array} transactions - Transaction array
   */
  setTransactionsByEmpresa(empresaId, page, transactions) {
    const cacheKey = `empresa_${empresaId}_page_${page}`;
    this.empresaCache.set(cacheKey, transactions);
    logger.debug('Empresa transactions cached', { empresaId, page, count: transactions.length });
  }

  /**
   * Get overview stats from cache
   * @returns {Object|null} - Cached stats or null
   */
  getOverviewStats() {
    return this.globalCache.get('overview_stats');
  }

  /**
   * Set overview stats in cache
   * @param {Object} stats - Stats object
   */
  setOverviewStats(stats) {
    this.globalCache.set('overview_stats', stats);
  }

  /**
   * Get stats by type from cache
   * @returns {Object|null} - Cached stats or null
   */
  getStatsByType() {
    return this.statsCache.get('stats_by_type');
  }

  /**
   * Set stats by type in cache
   * @param {Object} stats - Stats object
   */
  setStatsByType(stats) {
    this.statsCache.set('stats_by_type', stats);
  }

  /**
   * Get stats by empresa from cache
   * @param {number} empresaId - Empresa ID
   * @returns {Object|null} - Cached stats or null
   */
  getStatsByEmpresa(empresaId) {
    return this.empresaCache.get(`stats_empresa_${empresaId}`);
  }

  /**
   * Set stats by empresa in cache
   * @param {number} empresaId - Empresa ID
   * @param {Object} stats - Stats object
   */
  setStatsByEmpresa(empresaId, stats) {
    this.empresaCache.set(`stats_empresa_${empresaId}`, stats);
  }

  /**
   * Invalidate all caches
   * Called when new transaction is recorded
   */
  invalidateAllCaches() {
    const beforeCount = this.transactionCache.keys().length;
    this.transactionCache.flushAll();
    this.statsCache.flushAll();
    this.empresaCache.flushAll();
    this.globalCache.flushAll();
    
    logger.info('All caches invalidated', {
      beforeCount,
      afterCount: 0
    });
  }

  /**
   * Invalidate specific cache keys
   * @param {Array} keys - Array of cache keys to invalidate
   */
  invalidateCacheKeys(keys) {
    keys.forEach(key => {
      this.transactionCache.del(key);
      this.statsCache.del(key);
      this.empresaCache.del(key);
    });
    logger.debug('Specific cache keys invalidated', { keys: keys.length });
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache stats
   */
  getCacheStats() {
    return {
      transactionCache: {
        keys: this.transactionCache.keys().length,
        hits: this.transactionCache.stats.hits,
        misses: this.transactionCache.stats.misses
      },
      statsCache: {
        keys: this.statsCache.keys().length,
        hits: this.statsCache.stats.hits,
        misses: this.statsCache.stats.misses
      },
      empresaCache: {
        keys: this.empresaCache.keys().length
      },
      totalMemory: process.memoryUsage().heapUsed / 1024 / 1024 // MB
    };
  }

  /**
   * Start cache monitoring and cleanup
   */
  startMonitoring() {
    // Log cache stats every 5 minutes
    setInterval(() => {
      const stats = this.getCacheStats();
      if (stats.transactionCache.keys > 0) {
        logger.debug('Cache statistics', stats);
      }
    }, 300000); // 5 minutes

    // NodeCache handles automatic cleanup via checkperiod, no manual cleanup needed
  }

  /**
   * Flush all caches (for testing or manual reset)
   */
  flushAll() {
    this.invalidateAllCaches();
  }

  /**
   * Close cache service (cleanup)
   */
  close() {
    this.transactionCache.close();
    this.statsCache.close();
    this.empresaCache.close();
    this.globalCache.close();
    logger.info('Cache service closed');
  }
}

// Singleton instance
const cacheService = new CacheService();

// Export instance and class
export default cacheService;
export { CacheService };
export const {
  transactionCache,
  statsCache,
  empresaCache,
  globalCache
} = cacheService;

export const invalidateAllCaches = () => cacheService.invalidateAllCaches();