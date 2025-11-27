/**
 * routes/cliq.ts
 * 
 * Purpose: Zoho Cliq webhook endpoint for slash command integration.
 * 
 * User story:
 * - User types /meetingmind in Zoho Cliq chat
 * - Pastes meeting notes in the following message
 * - MeetingMind extracts tasks and posts them back to chat
 * - User can click to create tasks in Zoho Projects
 * 
 * Design decisions:
 * - Webhook receives POST with text payload
 * - Extract tasks immediately (no preview step)
 * - Return formatted card with task list
 * - Provide button to create tasks in Projects
 * 
 * TODO for production:
 * - Verify webhook signature (security)
 * - Add command parsing (/meetingmind extract, /meetingmind help, etc.)
 * - Support threaded responses
 * - Add interactive buttons for task editing
 * 
 * Cliq webhook docs: https://www.zoho.com/cliq/help/platform/webhooks.html
 */

import { Router, Request, Response } from 'express';
import type { CliqWebhookRequest, CliqWebhookResponse } from '../types/index.js';
import { extractTasksMock } from '../lib/newExtractor.js';

const router = Router();

// ============================================================================
// Configuration
// ============================================================================

const USE_MOCK = process.env.USE_MOCK === 'true';

// ============================================================================
// POST /api/cliq/webhook
// Handle Cliq slash command
// ============================================================================

/**
 * Process Cliq webhook and return formatted response
 * 
 * Request body (from Cliq):
 * {
 *   text: string (message text after slash command)
 *   user: { id, name, email }
 *   channel: { id, name }
 * }
 * 
 * Response (formatted card):
 * {
 *   text: string (plain text fallback)
 *   card: {
 *     theme: string
 *     title: string
 *     data: any (task list)
 *   }
 * }
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const webhookData: CliqWebhookRequest = req.body;

    console.log('[Cliq] Received webhook:', {
      user: webhookData.user?.name,
      channel: webhookData.channel?.name,
      textLength: webhookData.text?.length,
    });

    // Validate request
    if (!webhookData.text || webhookData.text.trim().length === 0) {
      return res.json({
        text: '⚠️ No meeting notes provided. Please paste your notes after the command.',
      } as CliqWebhookResponse);
    }

    // Extract tasks from the message
    const extractResult = USE_MOCK
      ? extractTasksMock(webhookData.text)
      : extractTasksMock(webhookData.text); // TODO: Use real AI when available

    // Format response as Cliq card
    const response: CliqWebhookResponse = {
      text: `✅ Extracted ${extractResult.tasks.length} tasks from your notes`,
      card: {
        theme: 'modern-inline',
        title: `📋 Extracted ${extractResult.tasks.length} Tasks`,
        data: {
          tasks: extractResult.tasks.map((task, index) => ({
            number: index + 1,
            title: task.title,
            description: task.description,
            priority: task.priority || 'medium',
            assignee: task.assignee || 'Unassigned',
          })),
        },
      },
    };

    console.log(`[Cliq] Responding with ${extractResult.tasks.length} tasks`);

    res.json(response);
  } catch (error) {
    console.error('[Cliq] Webhook error:', error);

    res.json({
      text: '❌ Failed to extract tasks. Please try again or check your notes format.',
    } as CliqWebhookResponse);
  }
});

// ============================================================================
// GET /api/cliq/webhook
// Health check / webhook verification
// ============================================================================

/**
 * Simple endpoint to verify webhook is accessible
 * Cliq may ping this during setup
 */
router.get('/webhook', (req: Request, res: Response) => {
  res.json({
    service: 'MeetingMind Cliq Integration',
    status: 'ready',
    version: '1.0.0',
  });
});

export default router;
