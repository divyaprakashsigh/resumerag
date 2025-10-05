import request from 'supertest';
import app from '../src/index';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

describe('Resumes API', () => {
  let authToken: string;
  let userId: string;

  beforeEach(async () => {
    // Clean up test data
    await prisma.matchResult.deleteMany();
    await prisma.resume.deleteMany();
    await prisma.job.deleteMany();
    await prisma.user.deleteMany();

    // Create test user and get auth token
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'USER'
      });

    authToken = registerResponse.body.token;
    userId = registerResponse.body.user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /api/resumes', () => {
    it('should return empty list when no resumes exist', async () => {
      const response = await request(app)
        .get('/api/resumes')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.items).toHaveLength(0);
      expect(response.body.next_offset).toBeUndefined();
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/resumes')
        .expect(401);
    });

    it('should support pagination', async () => {
      // Create test resumes
      for (let i = 0; i < 15; i++) {
        await prisma.resume.create({
          data: {
            userId,
            filename: `test${i}.pdf`,
            text: `Test resume ${i}`,
            embedding: [0.1, 0.2, 0.3],
            pii: { emails: [], phones: [], names: [] }
          }
        });
      }

      const response = await request(app)
        .get('/api/resumes?limit=10&offset=0')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.items).toHaveLength(10);
      expect(response.body.next_offset).toBe(10);
    });
  });

  describe('GET /api/resumes/:id', () => {
    let resumeId: string;

    beforeEach(async () => {
      const resume = await prisma.resume.create({
        data: {
          userId,
          filename: 'test.pdf',
          text: 'Test resume content',
          embedding: [0.1, 0.2, 0.3],
          pii: { emails: ['test@example.com'], phones: ['123-456-7890'], names: ['Test User'] }
        }
      });
      resumeId = resume.id;
    });

    it('should return resume by id', async () => {
      const response = await request(app)
        .get(`/api/resumes/${resumeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(resumeId);
      expect(response.body.filename).toBe('test.pdf');
      expect(response.body.text).toBe('Test resume content');
    });

    it('should return 404 for non-existent resume', async () => {
      await request(app)
        .get('/api/resumes/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('POST /api/ask', () => {
    beforeEach(async () => {
      // Create test resumes
      await prisma.resume.create({
        data: {
          userId,
          filename: 'developer.pdf',
          text: 'Software developer with React and Node.js experience',
          embedding: [0.1, 0.2, 0.3],
          pii: { emails: [], phones: [], names: [] }
        }
      });

      await prisma.resume.create({
        data: {
          userId,
          filename: 'designer.pdf',
          text: 'UI/UX designer with Figma and Adobe Creative Suite skills',
          embedding: [0.4, 0.5, 0.6],
          pii: { emails: [], phones: [], names: [] }
        }
      });
    });

    it('should perform semantic search', async () => {
      const response = await request(app)
        .post('/api/ask')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'React developer',
          k: 2
        })
        .expect(200);

      expect(response.body.snippets).toBeDefined();
      expect(Array.isArray(response.body.snippets)).toBe(true);
    });

    it('should require query parameter', async () => {
      const response = await request(app)
        .post('/api/ask')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.error.code).toBe('QUERY_REQUIRED');
    });
  });
});
