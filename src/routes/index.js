const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
const healthController = require('../controllers/healthController');
const { validate } = require('../validators/salesValidators');
const rateLimiter = require('../middleware/rateLimiter');
const { asyncHandler } = require('../middleware/errorHandler');
const metrics = require('../utils/metrics');

// Apply metrics tracking to all routes
router.use(metrics.trackHttpMetrics);

// Metrics endpoint
router.get('/metrics', metrics.endpoint);

// Health routes (no rate limiting)
router.get('/health', healthController.health);
router.get('/ready', healthController.ready);

// Apply rate limiting to API routes
router.use(rateLimiter.standard());

// Sales routes
router.get(
  '/sales',
  validate('querySales'),
  asyncHandler(salesController.getSales)
);

router.get(
  '/sales/:id',
  validate('getSaleById'),
  asyncHandler(salesController.getSaleById)
);

// Analytics routes
router.get(
  '/analytics',
  validate('analytics'),
  asyncHandler(salesController.getAnalytics)
);

router.get(
  '/analytics/leaderboard',
  validate('leaderboard'),
  asyncHandler(salesController.getLeaderboard)
);

router.get(
  '/analytics/users/:userId/stats',
  asyncHandler(salesController.getUserStats)
);

router.get(
  '/analytics/groups/:groupId/stats',
  asyncHandler(salesController.getGroupStats)
);

// Export route
router.get(
  '/export/sales',
  rateLimiter.custom(10, 300000), // 10 requests per 5 minutes
  validate('exportSales'),
  asyncHandler(salesController.exportSales)
);

module.exports = router;