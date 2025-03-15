import request from 'supertest';
import { app } from '../index';

describe('API Security Tests', () => {
  beforeEach(() => {
    // Clear any rate limit data between tests
    jest.resetModules();
  });

  test('should have security headers', async () => {
    const response = await request(app).get('/api/test');
    
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['strict-transport-security']).toBeDefined();
    expect(response.headers['x-xss-protection']).toBeDefined();
  });

  test('should validate input', async () => {
    const response = await request(app)
      .post('/api/test')
      .send({ message: '<script>alert("xss")</script>' });
    
    expect(response.status).toBe(400);
  });

  test('should enforce rate limiting', async () => {
    // Make multiple requests to trigger rate limit
    for (let i = 0; i < 101; i++) {
      await request(app).get('/api/test');
    }
    const response = await request(app).get('/api/test');
    expect(response.status).toBe(429);
  });
});