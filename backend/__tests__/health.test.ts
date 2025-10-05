import request from 'supertest';
import app from '../src/index';

describe('Health API', () => {
  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
    });
  });

  describe('GET /api/_meta', () => {
    it('should return metadata', async () => {
      const response = await request(app)
        .get('/api/_meta')
        .expect(200);

      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('environment');
      expect(typeof response.body.uptime).toBe('number');
    });
  });

  describe('GET /.well-known/hackathon.json', () => {
    it('should return hackathon manifest', async () => {
      const response = await request(app)
        .get('/.well-known/hackathon.json')
        .expect(200);

      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('stack');
      expect(response.body).toHaveProperty('features');
      expect(Array.isArray(response.body.stack)).toBe(true);
      expect(Array.isArray(response.body.features)).toBe(true);
    });
  });
});
