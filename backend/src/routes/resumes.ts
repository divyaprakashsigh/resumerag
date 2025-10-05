import { Router } from 'express';
import multer from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { validateQuery, resumeSchemas } from '../middleware/validation';
import { idempotencyCheck, storeIdempotentResponse } from '../middleware/idempotency';
import { parseFile, isValidFileType } from '../utils/fileParser';
import { generateMockEmbedding, extractPII, redactPII, semanticSearch } from '../utils/embeddings';
import { ApiError, PaginatedResponse, AskQuery, AskResponse } from '../types';

const router = Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Max 10 files
  },
  fileFilter: (req, file, cb) => {
    if (isValidFileType(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, and ZIP files are allowed.'));
    }
  }
});

/**
 * POST /api/resumes
 * Upload resume(s) - supports single file or ZIP bulk upload
 */
router.post('/', 
  authenticateToken,
  // Only USER can upload resumes (recruiter/admin cannot)
  requireRole(['USER']),
  idempotencyCheck,
  upload.array('resumes', 10),
  async (req: AuthRequest, res): Promise<void> => {
    try {
      const files = req.files as Express.Multer.File[];
      const idempotencyKey = req.headers['idempotency-key'] as string;

      if (!files || files.length === 0) {
        res.status(400).json({
          error: {
            code: 'NO_FILES',
            message: 'No files uploaded'
          }
        } as ApiError);
        return;
      }

      const results = [];
      const tempDir = 'uploads';

      for (const file of files) {
        try {
          const fileBuffer = fs.readFileSync(file.path);
          const parsed = await parseFile(fileBuffer, file.originalname, tempDir);

          if (Array.isArray(parsed)) {
            // ZIP file with multiple resumes
            for (const resumeData of parsed) {
              const embedding = generateMockEmbedding(resumeData.text);
              const pii = extractPII(resumeData.text);

              const resume = await prisma.resume.create({
                data: {
                  userId: req.user!.id,
                  filename: resumeData.filename,
                  text: resumeData.text,
                  embedding: embedding,
                  pii: pii as unknown as any
                }
              });

              results.push({
                id: resume.id,
                filename: resumeData.filename,
                textLength: resumeData.text.length
              });
            }
          } else {
            // Single file
            const embedding = generateMockEmbedding(parsed);
            const pii = extractPII(parsed);

            const resume = await prisma.resume.create({
              data: {
                userId: req.user!.id,
                filename: file.originalname,
                text: parsed,
                embedding: embedding,
                pii: pii as unknown as any
              }
            });

            results.push({
              id: resume.id,
              filename: file.originalname,
              textLength: parsed.length
            });
          }

          // Clean up uploaded file
          fs.unlinkSync(file.path);
        } catch (error) {
          console.error(`Error processing ${file.originalname}:`, error);
          // Clean up file even on error
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        }
      }

      const response = {
        message: `Successfully uploaded ${results.length} resume(s)`,
        resumes: results
      };

      // Store response for idempotency
      if (idempotencyKey) {
        storeIdempotentResponse(idempotencyKey, response);
      }

      res.status(201).json(response);
      return;
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        error: {
          code: 'UPLOAD_ERROR',
          message: 'Failed to upload resumes'
        }
      } as ApiError);
      return;
    }
  }
);

/**
 * GET /api/resumes
 * Search resumes with pagination and keyword search
 * - USERS: Can only see their own resumes
 * - RECRUITERS/ADMIN: Can see all resumes
 */
router.get('/', 
  authenticateToken,
  validateQuery(resumeSchemas.search),
  async (req: AuthRequest, res): Promise<void> => {
    try {
      const { limit, offset, q } = req.query as { limit: string; offset: string; q?: string };
      const limitNum = parseInt(limit);
      const offsetNum = parseInt(offset);
      const isRecruiter = req.user!.role === 'RECRUITER' || req.user!.role === 'ADMIN';

      let whereClause: any = {};

      // Role-based access: USERS can only see their own resumes
      if (!isRecruiter) {
        whereClause.userId = req.user!.id;
      }

      // Add keyword search if provided
      if (q) {
        whereClause.text = {
          contains: q,
          mode: 'insensitive'
        };
      }

      // Get total count
      const total = await prisma.resume.count({ where: whereClause });

      // Get resumes with pagination
      const resumes = await prisma.resume.findMany({
        where: whereClause,
        skip: offsetNum,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          filename: true,
          text: true,
          pii: true,
          createdAt: true
        }
      });

      // Process resumes based on user role
      const processedResumes = resumes.map(resume => {
        let processedText = resume.text;

        // Redact PII for non-recruiters
        if (!isRecruiter) {
          processedText = redactPII(resume.text, resume.pii as any);
        }

        return {
          id: resume.id,
          filename: resume.filename,
          text: processedText,
          pii: isRecruiter ? resume.pii : undefined,
          createdAt: resume.createdAt
        };
      });

      const response: PaginatedResponse<any> = {
        items: processedResumes,
        next_offset: offsetNum + limitNum < total ? offsetNum + limitNum : undefined
      };

      res.json(response);
      return;
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({
        error: {
          code: 'SEARCH_ERROR',
          message: 'Failed to search resumes'
        }
      } as ApiError);
      return;
    }
  }
);

/**
 * GET /api/resumes/:id
 * Get specific resume details
 * - USERS: Can only access their own resumes
 * - RECRUITERS/ADMIN: Can access any resume
 */
router.get('/:id', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { id } = req.params;
    const isRecruiter = req.user!.role === 'RECRUITER' || req.user!.role === 'ADMIN';

    const resume = await prisma.resume.findUnique({
      where: { id },
      select: {
        id: true,
        filename: true,
        text: true,
        pii: true,
        createdAt: true,
        userId: true
      }
    });

    if (!resume) {
      res.status(404).json({
        error: {
          code: 'RESUME_NOT_FOUND',
          message: 'Resume not found'
        }
      } as ApiError);
      return;
    }

    // Check if user can access this resume
    if (!isRecruiter && resume.userId !== req.user!.id) {
      res.status(403).json({
        error: {
          code: 'ACCESS_DENIED',
          message: 'You can only access your own resumes'
        }
      } as ApiError);
      return;
    }

    let processedText = resume.text;

    // Redact PII for non-recruiters
    if (!isRecruiter) {
      processedText = redactPII(resume.text, resume.pii as any);
    }

    const response = {
      id: resume.id,
      filename: resume.filename,
      text: processedText,
      pii: isRecruiter ? resume.pii : undefined,
      createdAt: resume.createdAt
    };

    res.json(response);
    return;
  } catch (error) {
    console.error('Get resume error:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch resume'
      }
    } as ApiError);
    return;
  }
});

/**
 * POST /api/ask
 * Semantic search over resumes
 */
router.post('/ask', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { query, k = 5 }: AskQuery = req.body;

    if (!query) {
      res.status(400).json({
        error: {
          code: 'QUERY_REQUIRED',
          message: 'Query is required'
        }
      } as ApiError);
      return;
    }

    // Get all resumes for semantic search
    const resumes = await prisma.resume.findMany({
      select: {
        id: true,
        text: true,
        embedding: true
      }
    });

    // Perform semantic search
    const results = semanticSearch(
      query,
      resumes.map(r => ({
        id: r.id,
        text: r.text,
        embedding: r.embedding as number[]
      })),
      k
    );

    const response: AskResponse = {
      snippets: results
    };

    res.json(response);
    return;
  } catch (error) {
    console.error('Ask error:', error);
    res.status(500).json({
      error: {
        code: 'SEARCH_ERROR',
        message: 'Failed to perform semantic search'
      }
    } as ApiError);
    return;
  }
});

export default router;
