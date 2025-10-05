import axios from 'axios';
import { AuthResponse, Resume, Job, MatchResult, AskResponse, PaginatedResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://valiant-perception-production.up.railway.app';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: async (data: { name: string; email: string; password: string; role?: string }): Promise<AuthResponse> => {
    const response = await api.post('/api/auth/register', data);
    return response.data;
  },

  login: async (data: { email: string; password: string }): Promise<AuthResponse> => {
    const response = await api.post('/api/auth/login', data);
    return response.data;
  },
};

// Resume API
export const resumeAPI = {
  upload: async (files: File[], onProgress?: (progress: number) => void): Promise<any> => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('resumes', file);
    });

    const response = await api.post('/api/resumes', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
    return response.data;
  },

  search: async (params: { limit?: number; offset?: number; q?: string }): Promise<PaginatedResponse<Resume>> => {
    const response = await api.get('/api/resumes', { params });
    return response.data;
  },

  getById: async (id: string): Promise<Resume> => {
    const response = await api.get(`/api/resumes/${id}`);
    return response.data;
  },

  ask: async (query: string, k?: number): Promise<AskResponse> => {
    const response = await api.post('/api/ask', { query, k });
    return response.data;
  },
};

// Job API
export const jobAPI = {
  create: async (data: { title: string; description: string; requirements: string[] }): Promise<Job> => {
    const response = await api.post('/api/jobs', data);
    return response.data;
  },

  getAll: async (params?: { limit?: number; offset?: number }): Promise<PaginatedResponse<Job>> => {
    const response = await api.get('/api/jobs', { params });
    return response.data;
  },

  getById: async (id: string): Promise<Job> => {
    const response = await api.get(`/api/jobs/${id}`);
    return response.data;
  },

  match: async (jobId: string, topN?: number): Promise<{ candidates: MatchResult[] }> => {
    const response = await api.post(`/api/jobs/${jobId}/match`, { top_n: topN });
    return response.data;
  },
};

// Health API
export const healthAPI = {
  check: async (): Promise<{ status: string }> => {
    const response = await api.get('/api/health');
    return response.data;
  },

  meta: async (): Promise<{ version: string; uptime: number; environment: string }> => {
    const response = await api.get('/api/_meta');
    return response.data;
  },
};

export default api;
