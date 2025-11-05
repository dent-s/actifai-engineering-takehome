const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');

const config = require('./config/app.config');
const database = require('./repositories/database');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const { seedDatabase } = require('./database/seed')

const app = express();

// Security middleware
app.use(helmet());
app.use(cors(config.cors));

// Compression middleware
app.use(compression());

// Logging
app.use(morgan('combined', { stream: logger.stream }));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API routes
app.use('/api', routes);

// Error handling
app.use(notFound)
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  await database.closeDatabase();
  process.exit(0);
});

// Start server
const server = app.listen(config.port, async () => {
  logger.info(`Server running on port ${config.port}`);
  database.initializeDatabase();
  await seedDatabase()
});

module.exports = server;