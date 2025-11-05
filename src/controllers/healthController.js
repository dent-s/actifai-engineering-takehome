const database = require('../repositories/database');

class HealthController {
  async health(req, res) {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  }

  async ready(req, res) {
    try {
      const dbHealthy = await database.checkDatabaseHealth();

      if (!dbHealthy) {
        return res.status(503).json({
          status: 'not ready',
          checks: {
            database: false
          }
        });
      }

      res.status(200).json({
        status: 'ready',
        checks: {
          database: true,
          cache: true
        }
      });
    } catch (error) {
      res.status(503).json({
        status: 'error',
        message: error.message
      });
    }
  }
}

module.exports = new HealthController();