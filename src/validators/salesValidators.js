const Joi = require('joi');

const customValidators = {
  futureDate: (value, helpers) => {
    if (new Date(value) > new Date()) {
      return helpers.error('date.future', { value });
    }
    return value;
  },
  
  dateRange: (value, helpers) => {
    if (value.startDate && value.endDate) {
      if (new Date(value.startDate) > new Date(value.endDate)) {
        return helpers.error('date.invalidRange');
      }
    }
    return value;
  }
};

// Validation schemas
const schemas = {

  getSaleById: Joi.object({
    id: Joi.number().integer().positive().required()
  }),

  querySales: Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    userId: Joi.number().integer().positive().optional(),
    groupId: Joi.number().integer().positive().optional(),
    minAmount: Joi.number().positive().optional(),
    maxAmount: Joi.number().positive().optional(),
    limit: Joi.number().integer().min(1).max(1000).default(100),
    offset: Joi.number().integer().min(0).default(0),
    sortBy: Joi.string().valid('date', 'amount', 'user').default('date'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  }).custom(customValidators.dateRange),

  analytics: Joi.object({
    period: Joi.string()
      .valid('day', 'week', 'month', 'quarter', 'year')
      .required()
      .messages({
        'any.required': 'Period is required',
        'any.only': 'Period must be one of: day, week, month, quarter, year'
      }),
    metric: Joi.string()
      .valid('sum', 'avg', 'count', 'max', 'min')
      .required()
      .messages({
        'any.required': 'Metric is required',
        'any.only': 'Metric must be one of: sum, avg, count, max, min'
      }),
    groupBy: Joi.string().valid('user', 'group', 'date').optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional()
  }).custom(customValidators.dateRange),

  leaderboard: Joi.object({
    period: Joi.string()
      .valid('day', 'week', 'month', 'quarter', 'year')
      .default('month'),
    limit: Joi.number().integer().min(1).max(100).default(10),
    groupId: Joi.number().integer().positive().optional()
  }),

  exportSales: Joi.object({
    format: Joi.string().valid('csv', 'json').default('csv'),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    userId: Joi.number().integer().positive().optional(),
    groupId: Joi.number().integer().positive().optional()
  }).custom(customValidators.dateRange)
};

// Validation middleware factory
const validate = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    
    if (!schema) {
      return next(new Error(`Validation schema '${schemaName}' not found`));
    }

    // Determine what to validate based on request method
    let dataToValidate = {};
    
    if (schemaName === 'getSaleById') {
      // For routes with params
      dataToValidate = { ...req.params, ...req.body };
    } else if (req.method === 'GET') {
      dataToValidate = req.query;
    } else {
      dataToValidate = req.body;
    }

    // Validate
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false, // Return all errors
      stripUnknown: true, // Remove unknown fields
      convert: true // Convert strings to numbers where needed
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }));
      
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors
      });
    }

    // Store validated data
    req.validated = value;
    
    // Merge validated params back
    if (schemaName === 'getSaleById') {
      req.params = { ...req.params, ...value };
    } else if (req.method === 'GET') {
      req.query = value;
    } else {
      req.body = value;
    }
    
    next();
  };
};

module.exports = {
  schemas,
  validate,
  customValidators
};