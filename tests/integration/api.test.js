const request = require('supertest');
const app = require('../../src/server');
const database = require('../../src/repositories/database');

describe('API Integration Tests', () => {
    beforeAll(async () => {
        // Wait for database connection
        await database.initializeDatabase();
    });

    afterAll(async () => {
        // Close database connection
        await database.closeDatabase();
    });

    describe('Health Endpoints', () => {
        it('GET /api/health should return 200', async () => {
            const response = await request(app)
                .get('/api/health')
                .expect(200);

            expect(response.body.status).toBe('healthy');
        });

        it('GET /api/ready should check database', async () => {
            const response = await request(app)
                .get('/api/ready')
                .expect(200);

            expect(response.body.status).toBe('ready');
        });
    });

    describe('Sales Endpoints', () => {
        it('GET /api/sales should return sales list', async () => {
            const response = await request(app)
                .get('/api/sales')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeDefined();
            expect(response.body.pagination).toBeDefined();
        });

        it('GET /api/sales with filters should work', async () => {
            const response = await request(app)
                .get('/api/sales')
                .query({
                    limit: 10,
                    offset: 0,
                    sortBy: 'amount',
                    sortOrder: 'desc'
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.pagination.limit).toBe(10);
        });

        it('GET /api/sales/:id should return 404 for non-existent sale', async () => {
            const response = await request(app)
                .get('/api/sales/999999')
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('not found');
        });
    });

    describe('Analytics Endpoints', () => {
        it('GET /api/analytics should require period and metric', async () => {
            const response = await request(app)
                .get('/api/analytics')
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it('GET /api/analytics should return analytics data', async () => {
            const response = await request(app)
                .get('/api/analytics')
                .query({
                    period: 'month',
                    metric: 'sum',
                    startDate: '2021-01-01', // Use 2021 dates
                    endDate: '2021-12-31'
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeDefined();
        });

        it('GET /api/analytics/leaderboard should return leaderboard', async () => {
            const response = await request(app)
                .get('/api/analytics/leaderboard')
                .query({
                    referenceDate: '2021-12-31' // Use 2021 date
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
        });

        it('GET /api/analytics/users/:userId/stats should return user stats', async () => {
            const response = await request(app)
                .get('/api/analytics/users/1/stats')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.id).toBe(1);
        });
    });

    describe('Rate Limiting', () => {
        it('should rate limit after too many requests', async () => {
            // Make many requests quickly
            const promises = Array(101).fill(null).map(() =>
                request(app).get('/api/sales')
            );

            const responses = await Promise.all(promises);
            const rateLimited = responses.some(r => r.status === 429);

            expect(rateLimited).toBe(true);
        });
    });
});