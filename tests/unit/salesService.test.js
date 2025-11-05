const salesService = require('../../src/services/salesService');
const salesRepository = require('../../src/repositories/salesRepository');
const cacheService = require('../../src/services/cacheService');
const logger = require('../../src/utils/logger');

// Mock all dependencies
jest.mock('../../src/repositories/salesRepository');
jest.mock('../../src/services/cacheService');
jest.mock('../../src/utils/logger');

describe('SalesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock logger to prevent console output during tests
    logger.info = jest.fn();
    logger.debug = jest.fn();
    logger.error = jest.fn();
    logger.warn = jest.fn();
  });

  describe('getSales', () => {
    it('should return cached data if available', async () => {
      const cachedData = { 
        data: [{ id: 1, amount: 100 }], 
        total: 1 
      };
      
      cacheService.generateKey = jest.fn().mockReturnValue('sales:test');
      cacheService.get = jest.fn().mockResolvedValue(cachedData);

      const result = await salesService.getSales({});

      expect(result).toEqual(cachedData);
      expect(cacheService.get).toHaveBeenCalledWith('sales:test');
      expect(salesRepository.getSales).not.toHaveBeenCalled();
    });

    it('should fetch from database if cache miss', async () => {
      const dbData = { 
        data: [{ id: 1, amount: 100 }], 
        total: 1 
      };
      
      cacheService.generateKey = jest.fn().mockReturnValue('sales:test');
      cacheService.get = jest.fn().mockResolvedValue(null);
      cacheService.set = jest.fn().mockResolvedValue(true);
      salesRepository.getSales = jest.fn().mockResolvedValue(dbData);

      const result = await salesService.getSales({});

      expect(result).toEqual(dbData);
      expect(salesRepository.getSales).toHaveBeenCalled();
      expect(cacheService.set).toHaveBeenCalledWith('sales:test', dbData, 300);
    });

    it('should handle database errors gracefully', async () => {
      cacheService.generateKey = jest.fn().mockReturnValue('sales:test');
      cacheService.get = jest.fn().mockResolvedValue(null);
      salesRepository.getSales = jest.fn().mockRejectedValue(new Error('DB error'));

      await expect(salesService.getSales({})).rejects.toThrow('DB error');
    });
  });


  describe('getAnalytics', () => {
    const mockAnalyticsData = [
      { period: '2024-01-01', value: 1000, unique_users: 5 },
      { period: '2024-01-02', value: 1500, unique_users: 7 }
    ];

    it('should return cached analytics if available', async () => {
      const cachedData = { 
        data: mockAnalyticsData, 
        summary: { total: 2500 } 
      };
      
      cacheService.generateKey = jest.fn().mockReturnValue('analytics:test');
      cacheService.get = jest.fn().mockResolvedValue(cachedData);

      const result = await salesService.getAnalytics({ 
        period: 'day', 
        metric: 'sum' 
      });

      expect(result).toEqual(cachedData);
      expect(salesRepository.getTimeSeries).not.toHaveBeenCalled();
    });

    it('should set default date range if not provided', async () => {
      cacheService.generateKey = jest.fn().mockReturnValue('analytics:test');
      cacheService.get = jest.fn().mockResolvedValue(null);
      cacheService.set = jest.fn().mockResolvedValue(true);
      salesRepository.getTimeSeries = jest.fn().mockResolvedValue(mockAnalyticsData);

      const params = { period: 'day', metric: 'sum' };
      await salesService.getAnalytics(params);

      expect(salesRepository.getTimeSeries).toHaveBeenCalled();
      const callArgs = salesRepository.getTimeSeries.mock.calls[0];
      expect(callArgs[2]).toBeDefined(); // startDate
      expect(callArgs[3]).toBeDefined(); // endDate
    });

    it('should calculate summary statistics correctly', async () => {
      cacheService.generateKey = jest.fn().mockReturnValue('analytics:test');
      cacheService.get = jest.fn().mockResolvedValue(null);
      cacheService.set = jest.fn().mockResolvedValue(true);
      salesRepository.getTimeSeries = jest.fn().mockResolvedValue(mockAnalyticsData);

      const result = await salesService.getAnalytics({
        period: 'day',
        metric: 'sum',
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      });

      expect(result.summary).toBeDefined();
      expect(result.summary.total).toBe(2500);
      expect(result.summary.average).toBe(1250);
      expect(result.summary.min).toBe(1000);
      expect(result.summary.max).toBe(1500);
      expect(result.summary.count).toBe(2);
    });
  });

  describe('calculateTrend', () => {
    it('should return stable for insufficient data', () => {
      const data = [{ value: 100 }];
      const trend = salesService.calculateTrend(data);
      expect(trend).toBe('stable');
    });

    it('should identify increasing trend', () => {
      const data = [
        { value: 100 },
        { value: 100 },
        { value: 200 },
        { value: 250 }
      ];
      const trend = salesService.calculateTrend(data);
      expect(trend).toBe('increasing');
    });

    it('should identify decreasing trend', () => {
      const data = [
        { value: 250 },
        { value: 200 },
        { value: 100 },
        { value: 50 }
      ];
      const trend = salesService.calculateTrend(data);
      expect(trend).toBe('decreasing');
    });

    it('should identify stable trend', () => {
      const data = [
        { value: 100 },
        { value: 102 },
        { value: 98 },
        { value: 101 }
      ];
      const trend = salesService.calculateTrend(data);
      expect(trend).toBe('stable');
    });
  });

  describe('exportSales', () => {
    const mockSalesData = [
      { id: 1, amount: 100, date: '2024-01-01', userName: 'John' },
      { id: 2, amount: 200, date: '2024-01-02', userName: 'Jane' }
    ];

    it('should export as CSV format', async () => {
      salesRepository.getSalesForExport = jest.fn().mockResolvedValue(mockSalesData);

      const result = await salesService.exportSales({}, 'csv');

      expect(result).toContain('id,amount,date,userName');
      expect(result).toContain('1,100,2024-01-01,John');
      expect(result).toContain('2,200,2024-01-02,Jane');
    });

    it('should export as JSON format', async () => {
      salesRepository.getSalesForExport = jest.fn().mockResolvedValue(mockSalesData);

      const result = await salesService.exportSales({}, 'json');
      const parsed = JSON.parse(result);

      expect(parsed).toEqual(mockSalesData);
    });

    it('should handle empty data', async () => {
      salesRepository.getSalesForExport = jest.fn().mockResolvedValue([]);

      const csvResult = await salesService.exportSales({}, 'csv');
      expect(csvResult).toBe('');

      const jsonResult = await salesService.exportSales({}, 'json');
      expect(jsonResult).toBe('[]');
    });
  });
});