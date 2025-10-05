import request from 'supertest';
import app from '../src/index';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Jobs API', () => {
  let authToken: string;
  let recruiterToken: string;
  let userId: string;
  let recruiterId: string;

  beforeEach(async () => {
    // Clean up test data
    await prisma.matchResult.deleteMany();
    await prisma.resume.deleteMany();
    await prisma.job.deleteMany();
    await prisma.user.deleteMany();

    // Create test user
    const userResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'USER'
      });

    authToken = userResponse.body.token;
    userId = userResponse.body.user.id;

    // Create recruiter user
    const recruiterResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test Recruiter',
        email: 'recruiter@example.com',
        password: 'password123',
        role: 'RECRUITER'
      });

    recruiterToken = recruiterResponse.body.token;
    recruiterId = recruiterResponse.body.user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/jobs', () => {
    it('should create job as recruiter', async () => {
      const jobData = {
        title: 'Senior Developer',
        description: 'Looking for an experienced developer',
        requirements: ['React', 'Node.js', '5+ years experience']
      };

      const response = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send(jobData)
        .expect(201);

      expect(response.body.title).toBe(jobData.title);
      expect(response.body.description).toBe(jobData.description);
      expect(response.body.requirements).toEqual(jobData.requirements);
    });

    it('should fail to create job as regular user', async () => {
      const jobData = {
        title: 'Senior Developer',
        description: 'Looking for an experienced developer',
        requirements: ['React', 'Node.js']
      };

      await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .send(jobData)
        .expect(403);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({})
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/jobs', () => {
    beforeEach(async () => {
      // Create test jobs
      await prisma.job.create({
        data: {
          title: 'Frontend Developer',
          description: 'React developer position',
          requirements: ['React', 'JavaScript']
        }
      });

      await prisma.job.create({
        data: {
          title: 'Backend Developer',
          description: 'Node.js developer position',
          requirements: ['Node.js', 'PostgreSQL']
        }
      });
    });

    it('should list all jobs', async () => {
      const response = await request(app)
        .get('/api/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.items).toHaveLength(2);
      expect(response.body.items[0]).toHaveProperty('title');
      expect(response.body.items[0]).toHaveProperty('description');
      expect(response.body.items[0]).toHaveProperty('requirements');
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/jobs?limit=1&offset=0')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.items).toHaveLength(1);
    });
  });

  describe('GET /api/jobs/:id', () => {
    let jobId: string;

    beforeEach(async () => {
      const job = await prisma.job.create({
        data: {
          title: 'Test Job',
          description: 'Test description',
          requirements: ['Test requirement']
        }
      });
      jobId = job.id;
    });

    it('should return job by id', async () => {
      const response = await request(app)
        .get(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(jobId);
      expect(response.body.title).toBe('Test Job');
    });

    it('should return 404 for non-existent job', async () => {
      await request(app)
        .get('/api/jobs/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('POST /api/jobs/:id/match', () => {
    let jobId: string;

    beforeEach(async () => {
      // Create job
      const job = await prisma.job.create({
        data: {
          title: 'React Developer',
          description: 'Looking for React developer',
          requirements: ['React', 'JavaScript', 'TypeScript']
        }
      });
      jobId = job.id;

      // Create test resumes
      await prisma.resume.create({
        data: {
          userId,
          filename: 'react-dev.pdf',
          text: 'Experienced React developer with JavaScript and TypeScript skills',
          embedding: [0.1, 0.2, 0.3],
          pii: { emails: [], phones: [], names: [] }
        }
      });

      await prisma.resume.create({
        data: {
          userId,
          filename: 'python-dev.pdf',
          text: 'Python developer with Django and Flask experience',
          embedding: [0.4, 0.5, 0.6],
          pii: { emails: [], phones: [], names: [] }
        }
      });
    });

    it('should match candidates as recruiter', async () => {
      const response = await request(app)
        .post(`/api/jobs/${jobId}/match`)
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({ top_n: 5 })
        .expect(200);

      expect(response.body.candidates).toBeDefined();
      expect(Array.isArray(response.body.candidates)).toBe(true);
      
      if (response.body.candidates.length > 0) {
        const candidate = response.body.candidates[0];
        expect(candidate).toHaveProperty('resume_id');
        expect(candidate).toHaveProperty('match_score');
        expect(candidate).toHaveProperty('evidence_snippets');
        expect(candidate).toHaveProperty('missing_requirements');
      }
    });

    it('should fail to match candidates as regular user', async () => {
      await request(app)
        .post(`/api/jobs/${jobId}/match`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ top_n: 5 })
        .expect(403);
    });

    it('should return 404 for non-existent job', async () => {
      await request(app)
        .post('/api/jobs/non-existent-id/match')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({ top_n: 5 })
        .expect(404);
    });
  });
});
