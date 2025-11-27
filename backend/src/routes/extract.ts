/**
 * routes/extract.ts
 * 
 * Purpose: Task extraction endpoint - accepts meeting notes, returns structured tasks.
 * 
 * User story:
 * - User pastes meeting notes into frontend
 * - Frontend POSTs to /api/extract with { notes: "..." }
 * - Backend extracts tasks using AI or mock
 * - Returns { tasks: [...], metadata: {...} }
 * 
 * Design decisions:
 * - Toggle between mock and real AI via USE_MOCK env var
 * - Validate input (notes must be present and reasonable length)
 * - Add rate limiting in production (TODO)
 * - Cache results for duplicate requests (TODO)
 * 
 * Security:
 * - No auth required for demo (add later for production)
 * - Input sanitization to prevent injection
 * - Max length check to prevent abuse
 */

import { Router, Request, Response } from 'express';
import type { ExtractRequest, ExtractResponse } from '../types/index.js';
import { extractTasksWithGemini } from '../lib/llmClient.js';
import { extractTasksMock } from '../lib/mockExtractor.js';

const router = Router();

// ============================================================================
// Configuration
// ============================================================================

const MAX_NOTES_LENGTH = 50000; // 50KB max

// ============================================================================
// Validation
// ============================================================================

function validateExtractRequest(body: any): body is ExtractRequest {
  if (!body.notes || typeof body.notes !== 'string') {
    return false;
  }

  if (body.notes.length === 0 || body.notes.length > MAX_NOTES_LENGTH) {
    return false;
  }

  return true;
}

// ============================================================================
// POST /api/extract
// ============================================================================

/**
 * Extract tasks from meeting notes
 * 
 * Request body:
 * {
 *   notes: string (required, max 50KB)
 * }
 * 
 * Response:
 * {
 *   tasks: ExtractedTask[]
 *   metadata: {
 *     processedAt: string (ISO timestamp)
 *     model: string (AI model used)
 *     tokenCount?: number (for AI usage tracking)
 *   }
 * }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // Validate request
    if (!validateExtractRequest(req.body)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Notes field is required and must be a string (max 50KB)',
      });
    }

    const { notes, useMock } = req.body;

    // Log for debugging (remove in production or use proper logger)
    console.log(`[Extract] Processing ${notes.length} characters...`);

    // Use Gemini AI extraction
    console.log('[Extract] Processing with Gemini AI...');
    const response = await extractTasksWithGemini(notes);
    console.log(`[Extract] Gemini extracted ${response.tasks.length} tasks`);

    // Return successful response
    res.json(response);
  } catch (error) {
    console.error('[Extract] Error:', error);
    
    res.status(500).json({
      error: 'Extraction failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
