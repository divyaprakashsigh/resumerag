import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { ApiError } from '../types';

const prisma = new PrismaClient();

// In-memory cache for idempotency keys (in production, use Redis)
const idempotencyCache = new Map<string, { response: any; timestamp: number }>();

// Cache TTL: 24 hours
const CACHE_TTL = 24 * 60 * 60 * 1000;

/**
 * Idempotency middleware for resume uploads
 */
export function idempotencyCheck(req: Request, res: Response, next: NextFunction): void {
  const idempotencyKey = req.headers['idempotency-key'] as string;
  
  if (!idempotencyKey) {
    return next();
  }

  // Check cache first
  const cached = idempotencyCache.get(idempotencyKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    res.json(cached.response);
    return;
  }

  // Check database for existing resume with this key
  prisma.resume.findFirst({
    where: {
      // We'll store the idempotency key in the filename or create a separate field
      filename: {
        contains: idempotencyKey
      }
    }
  }).then(existingResume => {
    if (existingResume) {
      const response = {
        id: existingResume.id,
        filename: existingResume.filename,
        message: 'Resume already uploaded (idempotent)'
      };
      
      // Cache the response
      idempotencyCache.set(idempotencyKey, {
        response,
        timestamp: Date.now()
      });
      
      res.json(response);
      return;
    }
    
    return next();
  }).catch(error => {
    console.error('Idempotency check error:', error);
    return next(); // Continue on error
  });
}

/**
 * Store successful response for idempotency
 */
export function storeIdempotentResponse(idempotencyKey: string, response: any) {
  if (idempotencyKey) {
    idempotencyCache.set(idempotencyKey, {
      response,
      timestamp: Date.now()
    });
  }
}

/**
 * Clean expired cache entries
 */
export function cleanIdempotencyCache() {
  const now = Date.now();
  for (const [key, value] of idempotencyCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      idempotencyCache.delete(key);
    }
  }
}

// Clean cache every hour
setInterval(cleanIdempotencyCache, 60 * 60 * 1000);
