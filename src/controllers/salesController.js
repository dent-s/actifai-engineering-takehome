const salesService = require('../services/salesService');
const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');

class SalesController {
  // Get all sales with filters
  async getSales(req, res, next) {
    try {
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        userId: req.query.userId ? parseInt(req.query.userId) : undefined,
        groupId: req.query.groupId ? parseInt(req.query.groupId) : undefined,
        minAmount: req.query.minAmount ? parseFloat(req.query.minAmount) : undefined,
        maxAmount: req.query.maxAmount ? parseFloat(req.query.maxAmount) : undefined,
        limit: parseInt(req.query.limit) || 20,
        offset: parseInt(req.query.offset) || 0,
        sortBy: req.query.sortBy || 'date',
        sortOrder: req.query.sortOrder || 'desc'
      };

      const result = await salesService.getSales(filters);

      res.json({
        success: true,
        data: result.data,
        pagination: {
          total: result.total,
          limit: filters.limit,
          offset: filters.offset,
          hasMore: result.total > (filters.offset + filters.limit)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get sale by ID
  async getSaleById(req, res, next) {
    try {
      const sale = await salesService.getSaleById(parseInt(req.params.id));

      if (!sale) {
        console.log('errr');
        throw new AppError('Sale not found', 404);
      }

      res.json({
        success: true,
        data: sale
      });
    } catch (error) {
      console.log('next')
      next(error);
    }
  }

  // Get analytics
  async getAnalytics(req, res, next) {
    logger.info('getAnalytics');

    try {
      const params = {
        period: req.query.period || 'month',
        metric: req.query.metric || 'sum',
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        groupBy: req.query.groupBy
      };

      const analytics = await salesService.getAnalytics(params);

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      next(error);
    }
  }

  // Get leaderboard
  async getLeaderboard(req, res, next) {
    try {
      const params = {
        period: req.query.period || 'month',
        limit: parseInt(req.query.limit) || 10,
        groupId: req.query.groupId ? parseInt(req.query.groupId) : undefined,
        referenceDate: req.query.referenceDate
      };

      const leaderboard = await salesService.getLeaderboard(params);

      res.json({
        success: true,
        data: leaderboard
      });
    } catch (error) {
      next(error);
    }
  }

  // Get user statistics
  async getUserStats(req, res, next) {
    try {
      const userId = parseInt(req.params.userId);
      const stats = await salesService.getUserStatistics(userId);

      if (!stats) {
        throw new AppError('User not found', 404);
      }

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  // Get group statistics
  async getGroupStats(req, res, next) {
    try {
      const groupId = parseInt(req.params.groupId);
      const stats = await salesService.getGroupStatistics(groupId);

      if (!stats) {
        throw new AppError('Group not found', 404);
      }

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  // Export sales data
  async exportSales(req, res, next) {
    try {
      const format = req.query.format || 'csv';
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        userId: req.query.userId,
        groupId: req.query.groupId
      };

      const data = await salesService.exportSales(filters, format);

      res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=sales-export.${format}`);
      res.send(data);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SalesController();