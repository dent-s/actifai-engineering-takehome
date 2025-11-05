const rateLimit = require('express-rate-limit');

class RateLimiter {
  // Standard rate limiter
  standard() {
    return rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 100, // 100 requests per minute for everyone
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      handler: (req, res) => {
        res.status(429).json({
          success: false,
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: res.getHeader('Retry-After')
        });
      }
    });
  }

  // Custom rate limiter for specific endpoints
  custom(max = 100, windowMs = 60000) {
    return rateLimit({
      windowMs,
      max,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        res.status(429).json({
          success: false,
          error: 'Too many requests',
          message: `Rate limit exceeded. Maximum ${max} requests per ${windowMs / 1000} seconds.`,
          retryAfter: res.getHeader('Retry-After')
        });
      }
    });
  }
}

module.exports = new RateLimiter();