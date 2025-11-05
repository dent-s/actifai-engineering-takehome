require('dotenv').config();

module.exports = {
  connectionString: process.env.DATABASE_URL ||
        `postgresql://${process.env.POSTGRES_USER || 'user'}:${process.env.POSTGRES_PASSWORD || 'pass'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.POSTGRES_DB || 'actifai'}`,

  pool: {
    max: parseInt(process.env.DB_POOL_MAX || '20'),
    idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
  },

  statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000'),

  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};