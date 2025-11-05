const { Pool } = require('pg');
const config = require('../config/db.config');
const logger = require('../utils/logger');

class Database {
  constructor() {
    this.pool = null;
  }

  async initializeDatabase() {
    // Single pool configuration (since no Redis/read replicas)
    this.pool = new Pool({
      connectionString: config.connectionString || process.env.DATABASE_URL,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      statement_timeout: 30000, // 30 seconds statement timeout
    });

    // Error handling
    this.pool.on('error', (err) => {
      logger.error('Unexpected error on idle client', err);
    });

    // Test connection
    try {
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      logger.info('Database connection established');
    } catch (error) {
      logger.error('Failed to connect to database:', error);
      throw error;
    }

    // Create indexes and optimizations
    await this.createIndexes();
  }

  async createIndexes() {
    const indexes = [
      // B-tree indexes for exact lookups and sorting
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_user_date ON sales(user_id, date DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_date ON sales(date DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_amount ON sales(amount)',

      // BRIN index for time-series data (more efficient for large tables)
      'CREATE INDEX IF NOT EXISTS idx_sales_date_brin ON sales USING BRIN(date)',

      // Indexes for join tables
      'CREATE INDEX IF NOT EXISTS idx_user_groups_user ON user_groups(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_groups_group ON user_groups(group_id)',

      // Composite index for common queries
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_composite ON sales(user_id, date, amount)'
    ];

    for (const index of indexes) {
      try {
        await this.pool.query(index);
        logger.info(`Index created/verified: ${index.split(' ')[5]}`);
      } catch (error) {
        logger.error(`Failed to create index: ${error.message}`);
      }
    }
  }

  async query(text, params) {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;

      // Log slow queries
      if (duration > 1000) {
        logger.warn(`Slow query (${duration}ms): ${text.substring(0, 100)}`);
      }

      return result;
    } catch (error) {
      logger.error('Database query error:', error);
      throw error;
    }
  }

  async getClient() {
    return await this.pool.connect();
  }

  async checkDatabaseHealth() {
    try {
      const result = await this.pool.query('SELECT 1');
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }

  async closeDatabase() {
    if (this.pool) {
      await this.pool.end();
      logger.info('Database connection pool closed');
    }
  }

  // Get pool statistics
  getPoolStats() {
    if (!this.pool) return null;
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    };
  }
}

module.exports = new Database();