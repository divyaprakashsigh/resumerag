export interface User {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'RECRUITER' | 'ADMIN';
  createdAt: string;
}

export interface Resume {
  id: string;
  filename: string;
  text: string;
  pii?: {
    emails?: string[];
    phones?: string[];
    names?: string[];
  };
  createdAt: string;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  createdAt: string;
}

export interface MatchResult {
  resume_id: string;
  candidate_name: string;
  candidate_email: string;
  resume_filename: string;
  match_score: number;
  evidence_snippets: string[];
  missing_requirements: string[];
}

export interface AskResponse {
  snippets: {
    resume_id: string;
    text: string;
    score: number;
  }[];
}

export interface PaginatedResponse<T> {
  items: T[];
  next_offset?: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiError {
  error: {
    code: string;
    field?: string;
    message: string;
  };
}

export interface UploadProgress {
  filename: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}
