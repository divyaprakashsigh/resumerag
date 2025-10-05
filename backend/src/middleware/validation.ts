import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ApiError } from '../types';

/**
 * Validation middleware factory
 */
export function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      return next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            field: firstError.path.join('.'),
            message: firstError.message
          }
        } as ApiError);
        return;
      }
      
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data'
        }
      } as ApiError);
      return;
    }
  };
}

/**
 * Query validation middleware factory
 */
export function validateQuery(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.query);
      return next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            field: firstError.path.join('.'),
            message: firstError.message
          }
        } as ApiError);
        return;
      }
      
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters'
        }
      } as ApiError);
      return;
    }
  };
}

// Common validation schemas
export const authSchemas = {
  register: z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.enum(['USER', 'RECRUITER', 'ADMIN']).optional().default('USER')
  }),
  
  login: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required')
  })
};

export const resumeSchemas = {
  search: z.object({
    limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional().default('10'),
    offset: z.string().transform(Number).pipe(z.number().min(0)).optional().default('0'),
    q: z.string().optional()
  })
};

export const jobSchemas = {
  create: z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().min(1, 'Description is required'),
    requirements: z.array(z.string()).min(1, 'At least one requirement is needed')
  }),
  
  match: z.object({
    top_n: z.number().min(1).max(50).optional().default(10)
  })
};

export const askSchemas = {
  query: z.object({
    query: z.string().min(1, 'Query is required'),
    k: z.number().min(1).max(20).optional().default(5)
  })
};
