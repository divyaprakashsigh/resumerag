export interface ApiError {
  error: {
    code: string;
    field?: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  next_offset?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'RECRUITER' | 'ADMIN';
  createdAt: Date;
}

export interface Resume {
  id: string;
  userId: string;
  filename: string;
  text: string;
  embedding: number[];
  pii: PIIData;
  createdAt: Date;
}

export interface PIIData {
  emails?: string[];
  phones?: string[];
  names?: string[];
}

export interface Job {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  createdAt: Date;
}

export interface MatchResult {
  id: string;
  jobId: string;
  resumeId: string;
  score: number;
  evidence: string[];
  missing: string[];
  createdAt: Date;
}

export interface AskQuery {
  query: string;
  k?: number;
}

export interface AskResponse {
  snippets: {
    resume_id: string;
    text: string;
    score: number;
  }[];
}

export interface JobMatchRequest {
  top_n?: number;
}

export interface JobMatchResponse {
  candidates: {
    resume_id: string;
    match_score: number;
    evidence_snippets: string[];
    missing_requirements: string[];
  }[];
}

export interface AuthRequest {
  name?: string;
  email: string;
  password: string;
  role?: 'USER' | 'RECRUITER' | 'ADMIN';
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface HealthResponse {
  status: string;
}

export interface MetaResponse {
  version: string;
  uptime: number;
  environment: string;
}

export interface HackathonManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  repository: string;
  stack: string[];
  features: string[];
}
