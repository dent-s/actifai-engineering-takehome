# Actifai Engineering Takehome

## Introduction

You are an Actifai backend engineer managing a database of our users - who are call center agents - and the sales that
the users place using our application.

The database has 4 tables:

- `users`: who are the users (name, role)
- `groups`: groups of users
- `user_groups`: which users belong to which groups
- `sales`: who made a sale, for how much, and when was it made

The front-end team has decided to build an analytics and reporting dashboard to display information about performance
to our users. They are interested in tracking which users and groups are performing well (in terms of their sales). The
primary metric they have specified as a requirement is average revenue and total revenue by user and group, for a given
month.

Your job is to build the API that will deliver data to this dashboard. In addition to the stated requirements above, we
would like to see you think about what additional data/metrics would be useful to add.

At a minimum, write one endpoint that returns time series data for user sales i.e. a list of rows, where each row
corresponds to a time window and information about sales. When you design the endpoint, think  about what query
parameters and options you want to support, to allow flexibility for the front-end team.

## Codebase

This repository contains a bare-bones Node/Express server, which is defined in `server.js`. This file is where you will
define your endpoints.

## Getting started

1. Install Docker (if you don't already have it)
2. Run `npm i` to install dependencies
3. Run `docker-compose up` to compile and run the images.
4. You now have a database and server running on your machine. You can test it by navigating to `http://localhost:3000/health` in
your browser. You should see a "Hello World" message.


## Help

If you have any questions, feel free to reach out to your interview scheduler for clarification!

## Solution

Added such groups of endpoints for the front-end team to use:

Sales endpoints:

    GET /api/sales - Retrieve all sales with advanced filtering, pagination, and sorting
    GET /api/sales/:id - Retrieve specific sale by ID

Analytics endpoints:

    GET /api/analytics/ - Time series analytics with customizable periods and metrics
    GET /api/analytics/leaderboard - Sales leaderboard with rankings and percentiles
    GET /api/analytics/users/:id/stats - Comprehensive user statistics
    GET /api/analytics/groups/:id/stats - Group performance metrics

Export endpoint:

    GET /api/export - Export sales data in CSV or JSON format

### Sales endpoints

#### 1. Get All Sales (with filters)

#### Basic request - get all sales
```bash
curl http://localhost:3000/api/sales
```

#### With pagination
```bash
curl "http://localhost:3000/api/sales?limit=20&offset=0"
```

#### Filter by date range
```bash
curl "http://localhost:3000/api/sales?startDate=2024-01-01&endDate=2024-01-31"
```

#### Filter by user
```bash
curl "http://localhost:3000/api/sales?userId=123"
```

#### Filter by amount range
```bash
curl "http://localhost:3000/api/sales?minAmount=100&maxAmount=1000"
```

#### Combined filters with sorting
```bash
curl "http://localhost:3000/api/sales?startDate=2024-01-01&endDate=2024-01-31&userId=123&minAmount=50&maxAmount=500&sortBy=amount&sortOrder=desc&limit=10"
```

#### Response example:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "userId": 123,
      "userName": "John Doe",
      "userRole": "sales",
      "amount": 499.99,
      "date": "2024-01-15",
      "groups": ["Sales Team", "Region North"]
    },
    {
      "id": 2,
      "userId": 123,
      "userName": "John Doe",
      "userRole": "sales",
      "amount": 299.99,
      "date": "2024-01-20",
      "groups": ["Sales Team", "Region North"]
    }
  ],
  "pagination": {
    "total": 45,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

#### 2. Get Sale by ID

```bash
curl http://localhost:3000/api/sales/1
```

#### Response:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "userId": 123,
    "userName": "John Doe",
    "userRole": "sales",
    "amount": 499.99,
    "date": "2024-01-15",
    "groups": ["Sales Team", "Region North"]
  }
}
```

### Analytics endpoints

#### 1. Time Series Analytics

#### Daily sales for current month
```bash
curl "http://localhost:3000/api/analytics?period=day&metric=sum"
```

#### Weekly average sales
```bash
curl "http://localhost:3000/api/analytics?period=week&metric=avg"
```

#### Monthly sales count
```bash
curl "http://localhost:3000/api/analytics?period=month&metric=count"
```

#### Quarterly maximum sale
```bash
curl "http://localhost:3000/api/analytics?period=quarter&metric=max"
```

#### Yearly sales with date range
```bash
curl "http://localhost:3000/api/analytics?period=year&metric=sum&startDate=2023-01-01&endDate=2024-12-31"
```

#### Group by user
```bash
curl "http://localhost:3000/api/analytics?period=month&metric=sum&groupBy=user"
```

#### Full example with all parameters
```bash
curl "http://localhost:3000/api/analytics?period=month&metric=sum&startDate=2024-01-01&endDate=2024-12-31&groupBy=user"
```

#### Response example:
```json
{
  "success": true,
  "data": {
    "period": "month",
    "metric": "sum",
    "dateRange": {
      "start": "2024-01-01",
      "end": "2024-12-31"
    },
    "data": [
      {
        "period": "2024-12-01",
        "value": 15750.50,
        "uniqueUsers": 25,
        "median": 450.00,
        "previousValue": 14200.00,
        "change": 1550.50,
        "percentChange": 10.92
      },
      {
        "period": "2024-11-01",
        "value": 14200.00,
        "uniqueUsers": 22,
        "median": 425.00,
        "previousValue": 13500.00,
        "change": 700.00,
        "percentChange": 5.19
      },
      {
        "period": "2024-10-01",
        "value": 13500.00,
        "uniqueUsers": 20,
        "median": 400.00,
        "previousValue": 12000.00,
        "change": 1500.00,
        "percentChange": 12.50
      }
    ],
    "summary": {
      "total": 43450.50,
      "average": 14483.50,
      "min": 13500.00,
      "max": 15750.50,
      "count": 3,
      "trend": "increasing"
    }
  }
}
```

#### 2. Sales Leaderboard

#### Top 10 sellers this month
```bash
curl "http://localhost:3000/api/analytics/leaderboard"
```

#### Top 20 sellers this year
```bash
curl "http://localhost:3000/api/analytics/leaderboard?period=year&limit=20"
```

#### Leaderboard for specific group
```bash
curl "http://localhost:3000/api/analytics/leaderboard?period=month&groupId=5"
```

#### Weekly leaderboard
```bash
curl "http://localhost:3000/api/analytics/leaderboard?period=week&limit=5"
```

#### Response example:
```json
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "userId": 123,
      "name": "John Doe",
      "role": "senior_sales",
      "totalSales": 125000.00,
      "saleCount": 45,
      "avgSale": 2777.78,
      "maxSale": 15000.00,
      "percentile": "100.00"
    },
    {
      "rank": 2,
      "userId": 456,
      "name": "Jane Smith",
      "role": "sales",
      "totalSales": 98500.00,
      "saleCount": 38,
      "avgSale": 2592.11,
      "maxSale": 12000.00,
      "percentile": "90.00"
    },
    {
      "rank": 3,
      "userId": 789,
      "name": "Bob Johnson",
      "role": "sales",
      "totalSales": 87250.00,
      "saleCount": 35,
      "avgSale": 2492.86,
      "maxSale": 9500.00,
      "percentile": "80.00"
    }
  ]
}
```

#### 3. User Statistics

#### Get specific user's stats
```bash
curl "http://localhost:3000/api/analytics/users/123/stats"
```

#### Response:
```json
{
  "success": true,
  "data": {
    "id": 123,
    "name": "John Doe",
    "role": "senior_sales",
    "totalSales": 145,
    "totalRevenue": 125000.00,
    "avgSaleAmount": 862.07,
    "minSale": 50.00,
    "maxSale": 15000.00,
    "lastSaleDate": "2024-12-15",
    "firstSaleDate": "2024-01-02",
    "groups": ["Sales Team", "Region North", "Premium Sellers"]
  }
}
```

#### 4. Group Statistics

#### Get specific group's stats
```bash
curl "http://localhost:3000/api/analytics/groups/5/stats"
```

#### Response:
```json
{
  "success": true,
  "data": {
    "id": 5,
    "name": "Sales Team",
    "userCount": 12,
    "totalSales": 487,
    "totalRevenue": 425750.00,
    "avgSaleAmount": 874.23,
    "users": ["John Doe", "Jane Smith", "Bob Johnson", "Alice Brown"]
  }
}
```

#### Export endpoints

### Export to CSV
```bash
curl "http://localhost:3000/api/export/sales?format=csv&startDate=2024-01-01&endDate=2024-12-31" \
  -o sales_2024.csv
```

### Export to JSON
```bash
curl "http://localhost:3000/api/export/sales?format=json&userId=123" \
  -o user_123_sales.json
```

### Export with filters
```bash
curl "http://localhost:3000/api/export/sales?format=csv&startDate=2024-01-01&endDate=2024-12-31&groupId=5" \
  -o group_5_sales.csv
```

## Solutions implementation details

### Core features:

- Node.js Express based backend with layered architecture (Controllers → Services → Repositories)
- PostgreSQL optimizations including connection pooling, BTREE/BRIN indexes, and query optimization
- In-memory caching system using NodeCache with TTL management
- Rate limiting implementation different limits for different endpoint types
- Comprehensive error handling with custom error classes and centralized error middleware
- logging with Winston (structured logs, multiple transports)
- added eslint, env parameters

### Data validation and security:

- Joi validation schemas for all endpoints with custom validators
- Input sanitization to prevent XSS attacks
- SQL injection prevention via parameterized queries
- Rate limiting per endpoint (100 req/min standard, 10 req/15min for sensitive operations)
- Helmet.js for security headers
- CORS configuration with proper origin control

### Performance Optimizations

- Database indexes optimized for common queries
- Connection pooling with configurable pool size
- In-memory caching with 5-minute TTL for frequently accessed data
- Query optimization using CTEs and window functions
- Compression middleware for response size reduction

### Testing suite:

- Unit tests for services and validators
- Integration tests for API endpoints
- Mocked dependencies for isolated testing
- Rate limit testing to verify throttling works
