import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { validate, validateQuery, jobSchemas } from '../middleware/validation';
import { cosineSimilarity, generateMockEmbedding } from '../utils/embeddings';
import { ApiError, JobMatchRequest, JobMatchResponse } from '../types';

const router = Router();
const prisma = new PrismaClient();

/**
 * POST /api/jobs
 * Create a new job description
 */
router.post('/', 
  authenticateToken,
  requireRole(['RECRUITER', 'ADMIN']),
  validate(jobSchemas.create),
  async (req: AuthRequest, res) => {
    try {
      const { title, description, requirements } = req.body;

      const job = await prisma.job.create({
        data: {
          title,
          description,
          requirements,
          // Track who created the job (recruiter/admin)
          userId: req.user!.id
        }
      });

      res.status(201).json(job);
    } catch (error) {
      console.error('Create job error:', error);
      res.status(500).json({
        error: {
          code: 'CREATE_ERROR',
          message: 'Failed to create job'
        }
      } as ApiError);
    }
  }
);

/**
 * DELETE /api/jobs/:id
 * Admin-only: remove any job posting
 */
router.delete('/:id', 
  authenticateToken,
  requireRole(['RECRUITER', 'ADMIN']),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      const existing = await prisma.job.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({
          error: { code: 'JOB_NOT_FOUND', message: 'Job not found' }
        } as ApiError);
      }

      // Recruiter can delete only their own job; admin can delete any
      if (req.user!.role === 'RECRUITER' && existing.userId && existing.userId !== req.user!.id) {
        return res.status(403).json({
          error: { code: 'ACCESS_DENIED', message: 'You can delete only your jobs' }
        } as ApiError);
      }

      // Delete related match results first due to foreign keys
      await prisma.matchResult.deleteMany({ where: { jobId: id } });
      await prisma.job.delete({ where: { id } });

      return res.status(204).send();
    } catch (error) {
      console.error('Delete job error:', error);
      res.status(500).json({
        error: { code: 'DELETE_ERROR', message: 'Failed to delete job' }
      } as ApiError);
    }
  }
);

/**
 * GET /api/jobs/:id
 * Get job description by ID
 */
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const job = await prisma.job.findUnique({
      where: { id }
    });

    if (!job) {
      return res.status(404).json({
        error: {
          code: 'JOB_NOT_FOUND',
          message: 'Job not found'
        }
      } as ApiError);
    }

    res.json(job);
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch job'
      }
    } as ApiError);
  }
});

/**
 * GET /api/jobs
 * List all jobs (all authenticated users can view)
 */
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { limit = '10', offset = '0' } = req.query as { limit?: string; offset?: string };
    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        skip: offsetNum,
        take: limitNum,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.job.count()
    ]);

    res.json({
      items: jobs,
      next_offset: offsetNum + limitNum < total ? offsetNum + limitNum : undefined
    });
  } catch (error) {
    console.error('List jobs error:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch jobs'
      }
    } as ApiError);
  }
});

/**
 * POST /api/jobs/:id/match
 * Match resumes against job requirements
 */
router.post('/:id/match', 
  authenticateToken,
  requireRole(['RECRUITER', 'ADMIN']),
  validate(jobSchemas.match),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { top_n = 10 }: JobMatchRequest = req.body;

      // Get job details
      const job = await prisma.job.findUnique({
        where: { id }
      });

      if (!job) {
        return res.status(404).json({
          error: {
            code: 'JOB_NOT_FOUND',
            message: 'Job not found'
          }
        } as ApiError);
      }

      // Get all resumes with user information
      const resumes = await prisma.resume.findMany({
        select: {
          id: true,
          filename: true,
          text: true,
          embedding: true,
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });

      // Generate job embedding from title + description + requirements
      const requirementsArray: string[] = Array.isArray(job.requirements)
        ? (job.requirements as unknown[]).map(String)
        : [];
      const jobText = `${job.title} ${job.description} ${requirementsArray.join(' ')}`;
      const jobEmbedding = generateMockEmbedding(jobText);

      // Calculate match scores
      const matches = resumes.map(resume => {
        const resumeEmbedding = resume.embedding as number[];
        const similarity = cosineSimilarity(jobEmbedding, resumeEmbedding);

        // Extract evidence snippets (improved keyword matching)
        const evidenceSnippets: string[] = [];
        const missingRequirements: string[] = [];
        
        const resumeText = resume.text.toLowerCase();
        const jobRequirements: string[] = (Array.isArray(job.requirements)
          ? (job.requirements as unknown[]).map(v => String(v).toLowerCase())
          : []);

        // Find evidence for each requirement with flexible matching
        jobRequirements.forEach(requirement => {
          let found = false;
          
          // Split requirement into individual words/skills
          const requirementWords = requirement.split(/[,:;]/).map(word => word.trim().toLowerCase());
          
          // Check if any of the requirement words are found in resume
          for (const word of requirementWords) {
            if (word.length > 2 && resumeText.includes(word)) {
              found = true;
              // Find context around the matched word
              const index = resumeText.indexOf(word);
              const start = Math.max(0, index - 100);
              const end = Math.min(resumeText.length, index + word.length + 100);
              evidenceSnippets.push(resume.text.substring(start, end));
              break;
            }
          }
          
          if (!found) {
            missingRequirements.push(requirement);
          }
        });

        // Calculate keyword-based score
        const totalRequirements = jobRequirements.length;
        const matchedRequirements = totalRequirements - missingRequirements.length;
        const keywordScore = (matchedRequirements / totalRequirements) * 100;
        
        // Combine semantic similarity (30%) with keyword matching (70%)
        const combinedScore = (similarity * 100 * 0.3) + (keywordScore * 0.7);
        
        return {
          resume_id: resume.id,
          candidate_name: resume.user.name,
          candidate_email: resume.user.email,
          resume_filename: resume.filename,
          match_score: Math.max(0, Math.min(100, combinedScore)), // Cap at 100%
          evidence_snippets: evidenceSnippets.slice(0, 3), // Limit to 3 snippets
          missing_requirements: missingRequirements.slice(0, 5) // Limit to 5 missing
        };
      });

      // Sort by match score and take top_n
      const topMatches = matches
        .sort((a, b) => b.match_score - a.match_score)
        .slice(0, top_n);

      // Store match results in database
      await Promise.all(
        topMatches.map(match =>
          prisma.matchResult.upsert({
            where: {
              jobId_resumeId: {
                jobId: id,
                resumeId: match.resume_id
              }
            },
            update: {
              score: match.match_score,
              evidence: match.evidence_snippets,
              missing: match.missing_requirements
            },
            create: {
              jobId: id,
              resumeId: match.resume_id,
              score: match.match_score,
              evidence: match.evidence_snippets,
              missing: match.missing_requirements
            }
          })
        )
      );

      const response: JobMatchResponse = {
        candidates: topMatches
      };

      res.json(response);
    } catch (error) {
      console.error('Job match error:', error);
      res.status(500).json({
        error: {
          code: 'MATCH_ERROR',
          message: 'Failed to match resumes'
        }
      } as ApiError);
    }
  }
);

export default router;
