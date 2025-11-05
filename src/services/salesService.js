const salesRepository = require('../repositories/salesRepository');
const cacheService = require('./cacheService');
const logger = require('../utils/logger');

class SalesService {
  // Get sales with caching
  async getSales(filters) {
    const cacheKey = cacheService.generateKey('sales', filters);

    // Try cache first
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      logger.debug('Sales retrieved from cache');
      return cached;
    }

    // Fetch from database
    const result = await salesRepository.getSales(filters);

    // Cache the result
    await cacheService.set(cacheKey, result, 300); // 5 minutes TTL

    return result;
  }

  // Get sale by ID
  async getSaleById(id) {
    const cacheKey = `sale:${id}`;

    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const sale = await salesRepository.getSaleById(id);

    if (sale) {
      await cacheService.set(cacheKey, sale, 600); // 10 minutes TTL
    }

    return sale;
  }

  // Get analytics
  async getAnalytics(params) {
    const cacheKey = cacheService.generateKey('analytics', params);

    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Set date range defaults
    if (!params.endDate) {
      params.endDate = new Date().toISOString().split('T')[0];
    }

    if (!params.startDate) {
      const date = new Date();
      date.setMonth(date.getMonth() - 1);
      params.startDate = date.toISOString().split('T')[0];
    }

    const timeSeries = await salesRepository.getTimeSeries(
      params.period,
      params.metric,
      params.startDate,
      params.endDate,
      params.groupBy
    );

    // Calculate summary statistics
    const summary = this.calculateSummary(timeSeries);

    const result = {
      period: params.period,
      metric: params.metric,
      dateRange: {
        start: params.startDate,
        end: params.endDate
      },
      data: timeSeries,
      summary
    };

    await cacheService.set(cacheKey, result, 600); // 10 minutes TTL

    return result;
  }

  // Calculate summary statistics
  calculateSummary(data) {
    if (!data || data.length === 0) {
      return {
        total: 0,
        average: 0,
        min: 0,
        max: 0,
        count: 0
      };
    }

    const values = data.map(d => d.value);

    return {
      total: values.reduce((sum, val) => sum + val, 0),
      average: values.reduce((sum, val) => sum + val, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
      trend: this.calculateTrend(data)
    };
  }

  // Calculate trend
  calculateTrend(data) {
    if (data.length < 2) return 'stable';

    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));

    const firstAvg = firstHalf.reduce((sum, d) => sum + d.value, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.value, 0) / secondHalf.length;

    const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;

    if (changePercent > 10) return 'increasing';
    if (changePercent < -10) return 'decreasing';
    return 'stable';
  }

  // Get leaderboard
  async getLeaderboard(params) {
    const cacheKey = cacheService.generateKey('leaderboard', params);

    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const leaderboard = await salesRepository.getLeaderboard(
      params.period,
      params.limit,
      params.groupId,
      params.referenceDate // Pass reference date
    );

    await cacheService.set(cacheKey, leaderboard, 300);

    return leaderboard;
  }

  // Get user statistics
  async getUserStatistics(userId) {
    const cacheKey = `user:${userId}:stats`;

    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const stats = await salesRepository.getUserStatistics(userId);

    if (stats) {
      await cacheService.set(cacheKey, stats, 600); // 10 minutes TTL
    }

    return stats;
  }

  // Get group statistics
  async getGroupStatistics(groupId) {
    const cacheKey = `group:${groupId}:stats`;

    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const stats = await salesRepository.getGroupStatistics(groupId);

    if (stats) {
      await cacheService.set(cacheKey, stats, 600); // 10 minutes TTL
    }

    return stats;
  }

  // Export sales data
  async exportSales(filters, format) {
    const sales = await salesRepository.getSalesForExport(filters);

    if (format === 'csv') {
      return this.convertToCSV(sales);
    }

    return JSON.stringify(sales, null, 2);
  }

  // Convert to CSV
  convertToCSV(data) {
    if (!data || data.length === 0) {
      return '';
    }

    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',')
            ? `"${value}"`
            : value;
        }).join(',')
      )
    ].join('\n');

    return csv;
  }
}

module.exports = new SalesService();