const { schemas } = require('../../src/validators/salesValidators');

describe('Sales Validators', () => {
  describe('querySales schema', () => {
    it('should validate query parameters', () => {
      const validQuery = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        limit: 50,
        offset: 0,
        sortBy: 'date',
        sortOrder: 'desc'
      };

      const { error, value } = schemas.querySales.validate(validQuery);
      
      expect(error).toBeUndefined();
      expect(value.limit).toBe(50);
      expect(value.sortBy).toBe('date');
    });

    it('should apply default values', () => {
      const { error, value } = schemas.querySales.validate({});
      
      expect(error).toBeUndefined();
      expect(value.limit).toBe(100);
      expect(value.offset).toBe(0);
      expect(value.sortBy).toBe('date');
      expect(value.sortOrder).toBe('desc');
    });

    it('should reject invalid date range', () => {
      const invalidQuery = {
        startDate: '2024-01-31',
        endDate: '2024-01-01'
      };

      const { error } = schemas.querySales.validate(invalidQuery);
      
      expect(error).toBeDefined();
    });

    it('should reject limit over maximum', () => {
      const { error } = schemas.querySales.validate({
        limit: 1001
      });
      
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('1000');
    });

    it('should reject invalid sortBy value', () => {
      const { error } = schemas.querySales.validate({
        sortBy: 'invalid'
      });
      
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('date');
    });
  });

  describe('analytics schema', () => {
    it('should validate analytics parameters', () => {
      const validParams = {
        period: 'month',
        metric: 'sum',
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      };

      const { error } = schemas.analytics.validate(validParams);
      
      expect(error).toBeUndefined();
    });

    it('should require period and metric', () => {
      const { error } = schemas.analytics.validate({});
      
      expect(error).toBeDefined();
    });

    it('should reject invalid period', () => {
      const { error } = schemas.analytics.validate({
        period: 'invalid',
        metric: 'sum'
      });
      
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('day, week, month');
    });

    it('should reject invalid metric', () => {
      const { error } = schemas.analytics.validate({
        period: 'month',
        metric: 'invalid'
      });
      
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('sum, avg, count');
    });

    it('should validate optional groupBy', () => {
      const validParams = {
        period: 'month',
        metric: 'sum',
        groupBy: 'user'
      };

      const { error } = schemas.analytics.validate(validParams);
      expect(error).toBeUndefined();

      const invalidParams = {
        period: 'month',
        metric: 'sum',
        groupBy: 'invalid'
      };

      const { error: error2 } = schemas.analytics.validate(invalidParams);
      expect(error2).toBeDefined();
    });
  });
});