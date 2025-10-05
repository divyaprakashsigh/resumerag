# ResumeRAG - AI-Powered Resume Search & Job Matching

A full-stack application for intelligent resume search and job matching using mock embeddings and semantic search capabilities.

## 🚀 Features

- **Smart Resume Upload**: Support for PDF, DOCX, and ZIP files with automatic text extraction
- **Semantic Search**: Natural language queries powered by mock embeddings and cosine similarity
- **Job Matching**: Automatic candidate ranking against job requirements
- **PII Protection**: Automatic redaction of personal information based on user roles
- **Role-Based Access**: Different permissions for users, recruiters, and administrators
- **Idempotent Uploads**: Prevent duplicate resume uploads
- **Rate Limiting**: 60 requests per minute per user
- **Modern UI**: Responsive design with dark/light theme support

## 🛠️ Tech Stack

### Backend
- **Node.js** with **Express** and **TypeScript**
- **PostgreSQL** database with **Prisma** ORM
- **JWT** authentication with role-based access control
- **Multer** for file uploads
- **Mock embeddings** using deterministic hash-based vectors
- **Jest** for testing

### Frontend
- **React** with **Vite** and **TypeScript**
- **TailwindCSS** for styling
- **React Router** for navigation
- **Axios** for API communication
- **React Dropzone** for file uploads
- **React Hot Toast** for notifications

### DevOps
- **Docker** and **Docker Compose** for containerization
- **Nginx** for frontend serving
- **PostgreSQL** container with health checks

## 📋 Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- Git

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hackthon
   ```

2. **Start all services**
   ```bash
   docker-compose up -d
   ```

3. **Wait for services to be ready** (check logs)
   ```bash
   docker-compose logs -f
   ```

4. **Seed the database** (optional)
   ```bash
   docker-compose exec backend npm run prisma:seed
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000
   - Database: localhost:5432

### Option 2: Local Development

1. **Clone and setup**
   ```bash
   git clone <repository-url>
   cd hackthon
   ```

2. **Setup backend**
   ```bash
   cd backend
   npm install
   cp env.example .env
   # Edit .env with your database URL
   npm run prisma:migrate
   npm run prisma:seed
   npm run dev
   ```

3. **Setup frontend** (in another terminal)
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Setup database** (PostgreSQL)
   ```bash
   # Install PostgreSQL locally or use Docker
   docker run --name resumerag-db -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:15-alpine
   ```

## 🔐 Test Credentials

The seed script creates test users:

- **Recruiter**: `recruiter@test.com` / `Pass@123`
- **User**: `user@test.com` / `Pass@123`

## 📚 API Documentation

### Authentication

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "USER" // USER, RECRUITER, ADMIN
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

### Resumes

#### Upload Resume
```http
POST /api/resumes
Authorization: Bearer <token>
Content-Type: multipart/form-data
Idempotency-Key: unique-key-123

FormData: resumes[] (files)
```

#### Search Resumes
```http
GET /api/resumes?q=react&limit=10&offset=0
Authorization: Bearer <token>
```

#### Get Resume by ID
```http
GET /api/resumes/:id
Authorization: Bearer <token>
```

#### Semantic Search
```http
POST /api/ask
Authorization: Bearer <token>
Content-Type: application/json

{
  "query": "React developer with 5 years experience",
  "k": 5
}
```

### Jobs

#### Create Job (Recruiter only)
```http
POST /api/jobs
Authorization: Bearer <recruiter-token>
Content-Type: application/json

{
  "title": "Senior React Developer",
  "description": "Looking for experienced React developer...",
  "requirements": ["React", "TypeScript", "5+ years experience"]
}
```

#### List Jobs
```http
GET /api/jobs?limit=10&offset=0
Authorization: Bearer <token>
```

#### Match Candidates (Recruiter only)
```http
POST /api/jobs/:id/match
Authorization: Bearer <recruiter-token>
Content-Type: application/json

{
  "top_n": 10
}
```

### Health & Meta

#### Health Check
```http
GET /api/health
```

#### Metadata
```http
GET /api/_meta
```

#### Hackathon Manifest
```http
GET /.well-known/hackathon.json
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
npm run test:watch
```

### Test Coverage
```bash
npm test -- --coverage
```

## 📁 Project Structure

```
hackthon/
├── backend/
│   ├── src/
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Auth, validation, etc.
│   │   ├── utils/           # Embeddings, file parsing
│   │   ├── types/           # TypeScript types
│   │   ├── seed.ts          # Database seeding
│   │   └── index.ts         # Main server file
│   ├── prisma/
│   │   └── schema.prisma    # Database schema
│   ├── __tests__/           # Jest tests
│   ├── uploads/             # File upload directory
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── contexts/        # React contexts
│   │   ├── utils/           # Utilities
│   │   └── types/           # TypeScript types
│   ├── public/              # Static assets
│   └── Dockerfile
├── docker-compose.yml       # Docker services
└── README.md
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/resumerag?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
NODE_ENV="development"
PORT=4000
```

#### Frontend (.env)
```env
VITE_API_URL="http://localhost:4000"
```

## 🚀 Deployment

### Production Docker Compose
```yaml
# Update docker-compose.yml with production settings
environment:
  NODE_ENV: "production"
  JWT_SECRET: "your-production-secret"
```

### Environment Setup
1. Set strong JWT secret
2. Configure production database
3. Set up SSL certificates
4. Configure domain names
5. Set up monitoring and logging

## 🔒 Security Features

- **JWT Authentication**: Secure token-based auth
- **Role-Based Access**: USER, RECRUITER, ADMIN roles
- **PII Redaction**: Automatic redaction for non-recruiters
- **Rate Limiting**: 60 requests/minute per user
- **Input Validation**: Zod schema validation
- **CORS Protection**: Configured for specific origins
- **Helmet**: Security headers

## 📊 Performance Features

- **Mock Embeddings**: Fast deterministic vector generation
- **Cosine Similarity**: Efficient similarity calculations
- **Pagination**: Limit/offset based pagination
- **Idempotency**: Prevent duplicate operations
- **File Processing**: Efficient PDF/DOCX/ZIP parsing
- **Database Indexing**: Optimized queries with Prisma

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check if PostgreSQL is running
   - Verify DATABASE_URL in .env
   - Run migrations: `npm run prisma:migrate`

2. **File Upload Issues**
   - Check file size limits (10MB)
   - Verify file types (PDF, DOCX, ZIP)
   - Ensure uploads directory exists

3. **Authentication Errors**
   - Check JWT_SECRET is set
   - Verify token expiration (24h)
   - Clear localStorage and re-login

4. **Docker Issues**
   - Check container logs: `docker-compose logs`
   - Restart services: `docker-compose restart`
   - Rebuild containers: `docker-compose up --build`

### Logs
```bash
# Backend logs
docker-compose logs -f backend

# Frontend logs
docker-compose logs -f frontend

# Database logs
docker-compose logs -f postgres
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🏗️ Architecture

ResumeRAG uses a modern microservices architecture with the following components:

- **Frontend**: React SPA with Vite for fast development and building
- **Backend**: Node.js API with Express and TypeScript for type safety
- **Database**: PostgreSQL with Prisma ORM for type-safe database operations
- **File Processing**: Local file storage with mock embedding generation
- **Authentication**: JWT-based auth with role-based access control
- **Search**: Mock semantic search using cosine similarity
- **Deployment**: Docker containers with health checks and auto-restart

The system is designed to be scalable, maintainable, and secure while providing a great user experience for both recruiters and job seekers.
