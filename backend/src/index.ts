import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import * as fs from 'fs';
import * as path from 'path';

// Import routes
import authRoutes from './routes/auth';
import resumeRoutes from './routes/resumes';
import jobRoutes from './routes/jobs';
import healthRoutes from './routes/health';

const app = express();
const PORT = process.env.PORT || 4000;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions: cors.CorsOptions = {
  origin: true, // reflect request origin
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute per IP
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploads
app.use('/uploads', express.static(uploadsDir));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/jobs', jobRoutes);

// Health and metadata routes
app.get('/api/health', async (req, res) => {
  try {
    res.json({ status: 'ok' });
  } catch (error) {
    res.status(503).json({ status: 'error' });
  }
});

app.get('/api/_meta', (req, res) => {
  const uptime = process.uptime();
  res.json({
    version: '1.0.0',
    uptime: Math.floor(uptime),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Hackathon manifest
app.get('/.well-known/hackathon.json', (req, res) => {
  res.json({
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
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction): void => {
  console.error('Unhandled error:', err);
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({
      error: {
        code: 'FILE_TOO_LARGE',
        message: 'File size exceeds 10MB limit'
      }
    });
    return;
  }
  
  if (err.code === 'LIMIT_FILE_COUNT') {
    res.status(413).json({
      error: {
        code: 'TOO_MANY_FILES',
        message: 'Too many files uploaded'
      }
    });
    return;
  }
  
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error'
    }
  });
  return;
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📋 API docs: http://localhost:${PORT}/.well-known/hackathon.json`);
});

export default app;
