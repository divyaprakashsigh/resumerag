import { PIIData } from '../types';

/**
 * Generate mock embeddings for text using deterministic hash-based approach
 * This simulates vector embeddings without external AI API calls
 */
export function generateMockEmbedding(text: string): number[] {
  const words = text.toLowerCase().split(/\s+/);
  const embedding = new Array(384).fill(0); // 384-dimensional vector
  
  words.forEach((word, index) => {
    const hash = simpleHash(word + index);
    const normalized = (hash % 1000) / 1000; // Normalize to 0-1
    const dimension = hash % embedding.length;
    embedding[dimension] += normalized;
  });
  
  // Normalize the vector
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => val / magnitude);
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Simple hash function for deterministic embeddings
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Extract PII from text using regex patterns
 */
export function extractPII(text: string): PIIData {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const phoneRegex = /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;
  const nameRegex = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g;
  
  const emails = text.match(emailRegex) || [];
  const phones = text.match(phoneRegex) || [];
  const names = text.match(nameRegex) || [];
  
  return {
    emails: [...new Set(emails)],
    phones: [...new Set(phones)],
    names: [...new Set(names)]
  };
}

/**
 * Redact PII from text
 */
export function redactPII(text: string, pii: PIIData): string {
  let redactedText = text;
  
  // Redact emails
  pii.emails?.forEach(email => {
    redactedText = redactedText.replace(new RegExp(email, 'g'), '[EMAIL REDACTED]');
  });
  
  // Redact phones
  pii.phones?.forEach(phone => {
    redactedText = redactedText.replace(new RegExp(phone.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '[PHONE REDACTED]');
  });
  
  return redactedText;
}

/**
 * Semantic search over resumes using mock embeddings
 */
export function semanticSearch(
  query: string,
  resumes: Array<{ id: string; text: string; embedding: number[] }>,
  k: number = 5
): Array<{ resume_id: string; text: string; score: number }> {
  const queryEmbedding = generateMockEmbedding(query);
  
  const results = resumes.map(resume => {
    const similarity = cosineSimilarity(queryEmbedding, resume.embedding);
    return {
      resume_id: resume.id,
      text: resume.text.substring(0, 500), // First 500 chars as snippet
      score: similarity
    };
  });
  
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .filter(result => result.score > 0.1); // Filter out very low similarity
}
