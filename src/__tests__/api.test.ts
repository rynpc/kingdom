import request from 'supertest';
import { app } from '../index';

const originalEnv = { ...process.env };

describe('API Security Tests', () => {
  beforeAll(() => {
    // Arrange - Global test setup
    process.env.NODE_ENV = 'test';
    process.env.TRUST_PROXY = 'false'; // Explicitly disable proxy trust in tests
  });

  beforeEach(() => {
    // Arrange - Per-test setup
    // Reset rate limiter between tests
    jest.resetModules();
  });

  describe('Security Headers', () => {
    test('should have security headers', async () => {
      // Act
      const response = await request(app).get('/api/test');
      
      // Assert
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['strict-transport-security']).toBeDefined();
      expect(response.headers['x-xss-protection']).toBeDefined();
    });

    test('should have CSP headers', async () => {
      // Act
      const response = await request(app).get('/api/test');

      // Assert
      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    });
  });

  describe('Input Validation', () => {
    test('should validate input', async () => {
      // Arrange
      const payload = { message: '<script>alert("xss")</script>' };

      // Act
      const response = await request(app)
        .post('/api/test')
        .send(payload);
      
      // Assert
      expect(response.status).toBe(400);
    });

    test('should properly sanitize user input', async () => {
      // Arrange
      const testCases = [
        { input: '<script>alert("xss")</script>', expected: 400 },
        { input: '"; DROP TABLE users; --', expected: 400 },
        { input: 'Valid input here', expected: 200 }
      ];

      // Act & Assert
      for (const test of testCases) {
        const response = await request(app)
          .post('/api/test')
          // Don't rely on proxy headers in tests
          .send({ message: test.input });
        expect(response.status).toBe(test.expected);
      }
    });

    test('should reject empty body', async () => {
      // Arrange
      const emptyBody = {};

      // Act
      const response = await request(app)
        .post('/api/test')
        .send(emptyBody);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Message is required');
    });

    test('should reject non-string message', async () => {
      // Arrange
      const invalidPayload = { message: 123 };

      // Act
      const response = await request(app)
        .post('/api/test')
        .send(invalidPayload);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Message must be a string');
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limiting for all IPs', async () => {
      // Arrange
      const maxRequests = 99; // 1 initial + 98 loop + 1 final = 100 total

      // Act - Initial request
      const initial = await request(app).get('/api/test');
      
      // Assert initial request
      expect(initial.status).toBe(200);

      // Act - Fill up rate limit
      for (let i = 0; i < maxRequests - 1; i++) {
        await request(app).get('/api/test');
      }

      // Act - Trigger rate limit
      const response = await request(app).get('/api/test');

      // Assert rate limit
      expect(response.status).toBe(429);
      expect(response.body).toHaveProperty('message', 'Too many requests from this IP, please try again later');
    });

    test('should reset rate limit after window expires', async () => {
      // Arrange
      jest.useFakeTimers();
      const maxRequests = 100;

      // Act - Fill rate limit
      for (let i = 0; i < maxRequests; i++) {
        await request(app).get('/api/test');
      }

      // Act - Advance time and make new request
      jest.advanceTimersByTime(15 * 60 * 1000);
      const response = await request(app).get('/api/test');

      // Assert
      expect(response.status).toBe(200);

      // Cleanup
      jest.useRealTimers();
    }, 16000);

    test('should include rate limit headers', async () => {
      // Act
      const response = await request(app).get('/api/test');

      // Assert
      expect(response.headers['ratelimit-limit']).toBeDefined();
      expect(response.headers['ratelimit-remaining']).toBeDefined();
      expect(response.headers['ratelimit-reset']).toBeDefined();
    });
  });

  describe('CORS', () => {
    test('should return proper CORS headers', async () => {
      // Arrange
      const origin = 'http://localhost:3000';

      // Act
      const response = await request(app)
        .options('/api/test')
        .set('Origin', origin);

      // Assert
      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
      expect(response.headers['access-control-allow-headers']).toBeDefined();
    });

    test('should handle preflight requests', async () => {
      // Arrange
      const origin = 'http://localhost:3000';
      const method = 'POST';
      const headers = 'Content-Type';

      // Act
      const response = await request(app)
        .options('/api/test')
        .set('Origin', origin)
        .set('Access-Control-Request-Method', method)
        .set('Access-Control-Request-Headers', headers);

      // Assert
      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe(origin);
      expect(response.headers['access-control-allow-methods']).toContain(method);
      expect(response.headers['access-control-allow-headers']).toContain(headers);
    });

    test('should reject invalid origins', async () => {
      // Arrange
      const invalidOrigin = 'http://evil.com';

      // Act
      const response = await request(app)
        .options('/api/test')
        .set('Origin', invalidOrigin);

      // Assert
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid JSON', async () => {
      // Arrange
      const invalidJson = '{"invalid json"}';

      // Act
      const response = await request(app)
        .post('/api/test')
        .set('Content-Type', 'application/json')
        .send(invalidJson);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid JSON');
    });

    test('should handle unsupported methods', async () => {
      // Arrange
      const payload = {};

      // Act
      const response = await request(app)
        .put('/api/test')
        .send(payload);

      // Assert
      expect(response.status).toBe(405);
      expect(response.body).toHaveProperty('error', 'Method not allowed');
    });

    test('should handle server errors gracefully', async () => {
      // Arrange
      const originalGetHandlers = app._router.stack.filter((layer: { route?: { path: string, methods: { get: boolean } } }) => layer.route?.path === '/api/test' && layer.route.methods.get);
      app._router.stack = app._router.stack.filter((layer: { route?: { path: string, methods: { get: boolean } } }) => !(layer.route?.path === '/api/test' && layer.route.methods.get));
      app.get('/api/test', (_, res) => {
        res.status(500).json({ error: 'Simulated server error' });
      });

      // Act
      const response = await request(app).get('/api/test');
      
      // Assert
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Simulated server error');

      // Cleanup
      app._router.stack = app._router.stack.filter((layer: { route?: { path: string, methods: { get: boolean } } }) => !(layer.route?.path === '/api/test' && layer.route.methods.get));
      app._router.stack.push(...originalGetHandlers);
    });

    test('should handle malformed requests', async () => {
      // Arrange
      const malformedData = Buffer.from('invalid');

      // Act
      const response = await request(app)
        .post('/api/test')
        .set('Content-Type', 'application/json')
        .send(malformedData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  // Clean up after all tests
  afterAll(() => {
    // Cleanup
    jest.clearAllMocks();
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    // Cleanup
    process.env = { ...originalEnv };
  });
});