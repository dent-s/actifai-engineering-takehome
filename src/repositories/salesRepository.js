const db = require('./database');
const logger = require('../utils/logger');

class SalesRepository {
  // Get sales with filters
  async getSales(filters) {
    const {
      startDate, endDate, userId, groupId,
      minAmount, maxAmount, limit, offset,
      sortBy, sortOrder
    } = filters;

    let query = `
      WITH filtered_sales AS (
        SELECT 
          s.id,
          s.user_id,
          s.amount,
          s.date,
          u.name as user_name,
          u.role as user_role,
          array_agg(DISTINCT g.name) as groups
        FROM sales s
        JOIN users u ON s.user_id = u.id
        LEFT JOIN user_groups ug ON u.id = ug.user_id
        LEFT JOIN groups g ON ug.group_id = g.id
        WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    // Add filters
    if (startDate) {
      query += ` AND s.date >= $${paramIndex++}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND s.date <= $${paramIndex++}`;
      params.push(endDate);
    }

    if (userId) {
      query += ` AND s.user_id = $${paramIndex++}`;
      params.push(userId);
    }

    if (groupId) {
      query += ` AND g.id = $${paramIndex++}`;
      params.push(groupId);
    }

    if (minAmount !== undefined) {
      query += ` AND s.amount >= $${paramIndex++}`;
      params.push(minAmount);
    }

    if (maxAmount !== undefined) {
      query += ` AND s.amount <= $${paramIndex++}`;
      params.push(maxAmount);
    }

    // Complete the CTE with GROUP BY
    query += `
        GROUP BY s.id, s.user_id, s.amount, s.date, u.id, u.name, u.role
      ),
      counted AS (
        SELECT COUNT(*) as total FROM filtered_sales
      )
      SELECT 
        f.*,
        c.total::integer
      FROM filtered_sales f
      CROSS JOIN counted c
    `;

    // Add sorting
    const validSortColumns = {
      'date': 'date',
      'amount': 'amount',
      'user': 'user_name'
    };

    const sortColumn = validSortColumns[sortBy] || 'date';
    const order = sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortColumn} ${order}`;

    // Add pagination
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    try {
      const result = await db.query(query, params);

      const total = result.rows.length > 0 ? result.rows[0].total : 0;
      const data = result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        userName: row.user_name,
        userRole: row.user_role,
        amount: parseFloat(row.amount),
        date: row.date,
        groups: row.groups ? row.groups.filter(g => g !== null) : []
      }));

      return { data, total };
    } catch (error) {
      logger.error('Error in getSales:', error);
      throw error;
    }
  }

  // Get sale by ID
  async getSaleById(id) {
    const query = `
      SELECT 
        s.*,
        u.name as user_name,
        u.role as user_role
      FROM sales s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = $1
    `;

    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }


  // Get time series data
  async getTimeSeries(period, metric, startDate, endDate, groupBy) {
    const truncate = {
      day: "DATE_TRUNC('day', date)",
      week: "DATE_TRUNC('week', date)",
      month: "DATE_TRUNC('month', date)",
      quarter: "DATE_TRUNC('quarter', date)",
      year: "DATE_TRUNC('year', date)"
    };

    const aggregates = {
      sum: 'SUM(amount)',
      avg: 'AVG(amount)',
      count: 'COUNT(*)',
      max: 'MAX(amount)',
      min: 'MIN(amount)'
    };

    let query = `
      WITH time_series AS (
        SELECT
          ${truncate[period]} as period,
          ${aggregates[metric]} as value,
          COUNT(DISTINCT user_id) as unique_users,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY amount) as median
    `;

    if (groupBy) {
      query += `, ${groupBy}`;
    }

    query += `
        FROM sales
        WHERE date >= $1 AND date <= $2
        GROUP BY period${groupBy ? `, ${groupBy}` : ''}
      ),
      with_trend AS (
        SELECT
          *,
          LAG(value, 1) OVER (ORDER BY period) as previous_value,
          value - LAG(value, 1) OVER (ORDER BY period) as change,
          CASE 
            WHEN LAG(value, 1) OVER (ORDER BY period) = 0 THEN 0
            ELSE ((value - LAG(value, 1) OVER (ORDER BY period)) / LAG(value, 1) OVER (ORDER BY period)) * 100
          END as percent_change
        FROM time_series
      )
      SELECT * FROM with_trend
      ORDER BY period DESC
    `;

    const result = await db.query(query, [startDate, endDate]);
    return result.rows.map(row => ({
      period: row.period,
      value: parseFloat(row.value) || 0,
      uniqueUsers: parseInt(row.unique_users),
      median: parseFloat(row.median) || 0,
      previousValue: parseFloat(row.previous_value) || 0,
      change: parseFloat(row.change) || 0,
      percentChange: parseFloat(row.percent_change) || 0
    }));
  }

  // Get leaderboard with configurable reference date
  async getLeaderboard(period = 'month', limit = 10, groupId = null, referenceDate = null) {
    // If there is no reference date - we're using the last date in data base
    if (!referenceDate) {
      const lastDateQuery = 'SELECT MAX(date) as last_date FROM sales';
      const lastDateResult = await db.query(lastDateQuery);
      referenceDate = lastDateResult.rows[0]?.last_date;

      if (!referenceDate) {
        return [];
      }
    }

    let query = `
    WITH user_sales AS (
      SELECT
        u.id,
        u.name,
        u.role,
        COALESCE(SUM(s.amount), 0) as total_sales,
        COUNT(s.id) as sale_count,
        COALESCE(AVG(s.amount), 0) as avg_sale,
        COALESCE(MAX(s.amount), 0) as max_sale
      FROM users u
      LEFT JOIN sales s ON u.id = s.user_id
        AND s.date >= DATE_TRUNC($1, $2::date)
        AND s.date < DATE_TRUNC($1, $2::date) + INTERVAL '1 ${period}'
  `;

    const params = [period, referenceDate];

    if (groupId) {
      query += `
      JOIN user_groups ug ON u.id = ug.user_id
      WHERE ug.group_id = $3
    `;
      params.push(groupId);
    }

    query += `
      GROUP BY u.id, u.name, u.role
    ),
    ranked AS (
      SELECT
        *,
        RANK() OVER (ORDER BY total_sales DESC) as rank,
        PERCENT_RANK() OVER (ORDER BY total_sales DESC) * 100 as percentile
      FROM user_sales
      WHERE total_sales > 0
    )
    SELECT * FROM ranked
    ORDER BY rank
    LIMIT $${params.length + 1}
  `;

    params.push(limit);

    const result = await db.query(query, params);

    return result.rows.map(row => ({
      rank: parseInt(row.rank),
      userId: row.id,
      name: row.name,
      role: row.role,
      totalSales: parseFloat(row.total_sales),
      saleCount: parseInt(row.sale_count),
      avgSale: parseFloat(row.avg_sale),
      maxSale: parseFloat(row.max_sale),
      percentile: parseFloat(row.percentile).toFixed(2)
    }));
  }

  // Check if user exists
  async checkUserExists(userId) {
    const query = 'SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)';
    const result = await db.query(query, [userId]);
    return result.rows[0].exists;
  }

  // Check if multiple users exist
  async checkUsersExist(userIds) {
    const query = 'SELECT id FROM users WHERE id = ANY($1)';
    const result = await db.query(query, [userIds]);
    return result.rows.map(row => row.id);
  }

  // Get user statistics
  async getUserStatistics(userId) {
    const query = `
      SELECT
        u.id,
        u.name,
        u.role,
        COUNT(s.id) as total_sales,
        COALESCE(SUM(s.amount), 0) as total_revenue,
        COALESCE(AVG(s.amount), 0) as avg_sale_amount,
        COALESCE(MIN(s.amount), 0) as min_sale,
        COALESCE(MAX(s.amount), 0) as max_sale,
        COALESCE(MAX(s.date), CURRENT_DATE - INTERVAL '1 year') as last_sale_date,
        COALESCE(MIN(s.date), CURRENT_DATE) as first_sale_date,
        array_agg(DISTINCT g.name) as groups
      FROM users u
      LEFT JOIN sales s ON u.id = s.user_id
      LEFT JOIN user_groups ug ON u.id = ug.user_id
      LEFT JOIN groups g ON ug.group_id = g.id
      WHERE u.id = $1
      GROUP BY u.id, u.name, u.role
    `;

    const result = await db.query(query, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      role: row.role,
      totalSales: parseInt(row.total_sales),
      totalRevenue: parseFloat(row.total_revenue),
      avgSaleAmount: parseFloat(row.avg_sale_amount),
      minSale: parseFloat(row.min_sale),
      maxSale: parseFloat(row.max_sale),
      lastSaleDate: row.last_sale_date,
      firstSaleDate: row.first_sale_date,
      groups: row.groups ? row.groups.filter(g => g !== null) : []
    };
  }

  // Get group statistics
  async getGroupStatistics(groupId) {
    const query = `
      SELECT
        g.id,
        g.name,
        COUNT(DISTINCT u.id) as user_count,
        COUNT(s.id) as total_sales,
        COALESCE(SUM(s.amount), 0) as total_revenue,
        COALESCE(AVG(s.amount), 0) as avg_sale_amount,
        array_agg(DISTINCT u.name) as users
      FROM groups g
      LEFT JOIN user_groups ug ON g.id = ug.group_id
      LEFT JOIN users u ON ug.user_id = u.id
      LEFT JOIN sales s ON u.id = s.user_id
      WHERE g.id = $1
      GROUP BY g.id, g.name
    `;

    const result = await db.query(query, [groupId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      userCount: parseInt(row.user_count),
      totalSales: parseInt(row.total_sales),
      totalRevenue: parseFloat(row.total_revenue),
      avgSaleAmount: parseFloat(row.avg_sale_amount),
      users: row.users ? row.users.filter(u => u !== null) : []
    };
  }

  // Get sales for export
  async getSalesForExport(filters) {
    const { startDate, endDate, userId, groupId } = filters;

    let query = `
      SELECT 
        s.id,
        s.user_id,
        u.name as user_name,
        u.role,
        s.amount,
        s.date,
        string_agg(g.name, ', ') as groups
      FROM sales s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN user_groups ug ON u.id = ug.user_id
      LEFT JOIN groups g ON ug.group_id = g.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (startDate) {
      query += ` AND s.date >= $${paramIndex++}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND s.date <= $${paramIndex++}`;
      params.push(endDate);
    }

    if (userId) {
      query += ` AND s.user_id = $${paramIndex++}`;
      params.push(userId);
    }

    if (groupId) {
      query += ` AND g.id = $${paramIndex++}`;
      params.push(groupId);
    }

    query += `
      GROUP BY s.id, s.user_id, u.name, u.role, s.amount, s.date
      ORDER BY s.date DESC
    `;

    const result = await db.query(query, params);

    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      role: row.role,
      amount: parseFloat(row.amount),
      date: row.date,
      groups: row.groups || ''
    }));
  }
}

module.exports = new SalesRepository();