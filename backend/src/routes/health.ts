import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { HealthResponse, MetaResponse, HackathonManifest } from '../types';

const router = Router();
const prisma = new PrismaClient();

const startTime = Date.now();

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/', async (req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    const response: HealthResponse = {
      status: 'ok'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      message: 'Database connection failed'
    });
  }
});

/**
 * GET /api/_meta
 * Metadata endpoint
 */
router.get('/', async (req, res) => {
  const uptime = Date.now() - startTime;
  
  const response: MetaResponse = {
    version: '1.0.0',
    uptime: Math.floor(uptime / 1000), // Convert to seconds
    environment: process.env.NODE_ENV || 'development'
  };
  
  res.json(response);
});

/**
 * GET /.well-known/hackathon.json
 * Hackathon manifest
 */
router.get('/', (req, res) => {
  const manifest: HackathonManifest = {
    name: 'ResumeRAG',
    version: '1.0.0',
    description: 'AI-powered resume search and job matching system',
    author: 'ResumeRAG Team',
    repository: 'https://github.com/resumerag/resumerag',
    stack: [
      'Node.js',
      'Express',
      'TypeScript',
      'React',
      'Vite',
      'TailwindCSS',
      'PostgreSQL',
      'Prisma',
      'JWT',
      'Docker'
    ],
    features: [
      'Resume upload (PDF/DOCX/ZIP)',
      'Semantic search',
      'PII redaction',
      'Job matching',
      'Role-based access',
      'Idempotent uploads',
      'Rate limiting',
      'Mock embeddings'
    ]
  };
  
  res.json(manifest);
});

export default router;
