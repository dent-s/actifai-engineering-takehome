const NodeCache = require('node-cache');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    // In-memory cache with TTL
    this.cache = new NodeCache({
      stdTTL: 300, // 5 minutes default TTL
      checkperiod: 60, // Check for expired keys every 60 seconds
      useClones: false, // For better performance
      maxKeys: 10000 // Limit cache size
    });

    // Cache statistics
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };

    // Monitor cache events
    this.cache.on('expired', (key) => {
      logger.debug(`Cache key expired: ${key}`);
    });

    this.cache.on('set', () => {
      this.stats.sets++;
    });
  }

  // Generate cache key
  generateKey(prefix, params) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join(':');
    return `${prefix}:${sortedParams}`;
  }

  // Get from cache
  async get(key) {
    try {
      const value = this.cache.get(key);
      if (value !== undefined) {
        this.stats.hits++;
        logger.debug(`Cache hit: ${key}`);
        return value;
      } else {
        this.stats.misses++;
        logger.debug(`Cache miss: ${key}`);
        return null;
      }
    } catch (error) {
      logger.error(`Cache get error: ${error.message}`);
      return null;
    }
  }

  // Set in cache with optional TTL
  async set(key, value, ttl = null) {
    try {
      const success = ttl
        ? this.cache.set(key, value, ttl)
        : this.cache.set(key, value);

      if (success) {
        logger.debug(`Cache set: ${key}`);
      }
      return success;
    } catch (error) {
      logger.error(`Cache set error: ${error.message}`);
      return false;
    }
  }

  // Delete from cache
  async del(key) {
    try {
      const count = this.cache.del(key);
      this.stats.deletes += count;
      logger.debug(`Cache delete: ${key}`);
      return count;
    } catch (error) {
      logger.error(`Cache delete error: ${error.message}`);
      return 0;
    }
  }

  // Clear cache by pattern
  async invalidate(pattern) {
    try {
      const keys = this.cache.keys();
      const keysToDelete = keys.filter(key => key.startsWith(pattern));

      if (keysToDelete.length > 0) {
        this.cache.del(keysToDelete);
        logger.info(`Invalidated ${keysToDelete.length} cache keys with pattern: ${pattern}`);
      }

      return keysToDelete.length;
    } catch (error) {
      logger.error(`Cache invalidate error: ${error.message}`);
      return 0;
    }
  }

  // Clear all cache
  flush() {
    this.cache.flushAll();
    logger.info('Cache flushed');
  }
}

module.exports = new CacheService();