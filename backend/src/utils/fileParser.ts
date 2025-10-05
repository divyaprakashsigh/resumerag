import * as fs from 'fs';
import * as path from 'path';
import pdfParse from 'pdf-parse';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import * as yauzl from 'yauzl';

/**
 * Parse PDF file and extract text
 */
export async function parsePDF(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    throw new Error(`Failed to parse PDF: ${error}`);
  }
}

/**
 * Parse DOCX file and extract text
 */
export async function parseDOCX(buffer: Buffer): Promise<string> {
  try {
    // For DOCX parsing, we'll use a simple approach
    // In a real implementation, you'd use a proper DOCX parser
    const text = buffer.toString('utf-8');
    
    // Simple extraction - remove XML tags and get text content
    const cleanText = text
      .replace(/<[^>]*>/g, ' ') // Remove XML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    // If the text is too short or looks like binary, return a placeholder
    if (cleanText.length < 50 || cleanText.includes('\0')) {
      return 'DOCX file content extracted (text parsing simplified for demo)';
    }
    
    return cleanText;
  } catch (error) {
    throw new Error(`Failed to parse DOCX: ${error}`);
  }
}

/**
 * Parse ZIP file and extract text from all supported files
 */
export async function parseZIP(buffer: Buffer, tempDir: string): Promise<Array<{ filename: string; text: string }>> {
  return new Promise((resolve, reject) => {
    const results: Array<{ filename: string; text: string }> = [];
    
    yauzl.fromBuffer(buffer, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        reject(new Error(`Failed to parse ZIP: ${err}`));
        return;
      }
      
      if (!zipfile) {
        reject(new Error('Invalid ZIP file'));
        return;
      }
      
      zipfile.readEntry();
      
      zipfile.on('entry', (entry) => {
        const fileName = entry.fileName;
        const ext = path.extname(fileName).toLowerCase();
        
        // Skip directories and unsupported files
        if (entry.fileName.endsWith('/') || (!ext.match(/\.(pdf|docx|txt)$/))) {
          zipfile.readEntry();
          return;
        }
        
        zipfile.openReadStream(entry, (err, readStream) => {
          if (err) {
            zipfile.readEntry();
            return;
          }
          
          const chunks: Buffer[] = [];
          
          readStream.on('data', (chunk) => {
            chunks.push(chunk);
          });
          
          readStream.on('end', async () => {
            try {
              const fileBuffer = Buffer.concat(chunks);
              let text = '';
              
              if (ext === '.pdf') {
                text = await parsePDF(fileBuffer);
              } else if (ext === '.docx') {
                text = await parseDOCX(fileBuffer);
              } else if (ext === '.txt') {
                text = fileBuffer.toString('utf-8');
              }
              
              if (text.trim()) {
                results.push({ filename: fileName, text });
              }
              
              zipfile.readEntry();
            } catch (error) {
              console.error(`Error processing ${fileName}:`, error);
              zipfile.readEntry();
            }
          });
          
          readStream.on('error', (err) => {
            console.error(`Error reading ${fileName}:`, err);
            zipfile.readEntry();
          });
        });
      });
      
      zipfile.on('end', () => {
        resolve(results);
      });
      
      zipfile.on('error', (err) => {
        reject(new Error(`ZIP processing error: ${err}`));
      });
    });
  });
}

/**
 * Parse file based on extension
 */
export async function parseFile(buffer: Buffer, filename: string, tempDir?: string): Promise<string | Array<{ filename: string; text: string }>> {
  const ext = path.extname(filename).toLowerCase();
  
  switch (ext) {
    case '.pdf':
      return await parsePDF(buffer);
    case '.docx':
      return await parseDOCX(buffer);
    case '.zip':
      if (!tempDir) {
        throw new Error('Temp directory required for ZIP parsing');
      }
      return await parseZIP(buffer, tempDir);
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}

/**
 * Get file type from filename
 */
export function getFileType(filename: string): 'pdf' | 'docx' | 'zip' | 'unknown' {
  const ext = path.extname(filename).toLowerCase();
  
  switch (ext) {
    case '.pdf':
      return 'pdf';
    case '.docx':
      return 'docx';
    case '.zip':
      return 'zip';
    default:
      return 'unknown';
  }
}

/**
 * Validate file type
 */
export function isValidFileType(filename: string): boolean {
  return getFileType(filename) !== 'unknown';
}
