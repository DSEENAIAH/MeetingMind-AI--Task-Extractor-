/**
 * routes/createTasks.ts
 * 
 * Purpose: Create tasks in Zoho Projects and local Supabase DB.
 * 
 * User story:
 * - User reviews extracted tasks in frontend preview
 * - Clicks "Create in Zoho Projects"
 * - Frontend POSTs to /api/create-tasks with { tasks: [...], teamId: "...", assignedBy: "..." }
 * - Backend creates tasks in Zoho via API (or mock)
 * - Backend saves tasks to Supabase 'tasks' table for local dashboard
 * - Returns task URLs
 */

import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';
import type { CreateTasksRequest, CreateTasksResponse } from '../types/index.js';

const router = Router();

// ============================================================================
// Configuration
// ============================================================================

const USE_MOCK = process.env.USE_MOCK === 'true';
const ZOHO_DEFAULT_PORTAL_ID = process.env.ZOHO_DEFAULT_PORTAL_ID || 'demo-portal';
const ZOHO_DEFAULT_PROJECT_ID = process.env.ZOHO_DEFAULT_PROJECT_ID || 'demo-project';

// ============================================================================
// Validation
// ============================================================================

function validateCreateTasksRequest(body: any): body is CreateTasksRequest & { teamId: string, assignedBy: string } {
  if (!body.tasks || !Array.isArray(body.tasks)) {
    return false;
  }

  if (body.tasks.length === 0) {
    return false;
  }

  if (!body.teamId || typeof body.teamId !== 'string') {
    return false;
  }

  // Validate each task has required fields
  for (const task of body.tasks) {
    if (!task.title || typeof task.title !== 'string') {
      return false;
    }
  }

  return true;
}

// ============================================================================
// Mock Implementation
// ============================================================================

/**
 * Create tasks in mock mode (no actual Zoho API calls)
 * Returns deterministic fake URLs for demo purposes
 */
function createTasksMock(request: CreateTasksRequest): CreateTasksResponse {
  const { tasks, projectId = ZOHO_DEFAULT_PROJECT_ID } = request;

  const created = tasks.map((task, index) => ({
    taskId: `mock-task-${Date.now()}-${index}`,
    title: task.title,
    url: `https://projects.zoho.com/portal/${ZOHO_DEFAULT_PORTAL_ID}#taskdetail/${projectId}/mock-task-${Date.now()}-${index}`,
  }));

  return {
    created,
    // No errors in mock mode (always succeeds)
  };
}

// ============================================================================
// POST /api/create-tasks
// ============================================================================

router.post('/', async (req: Request, res: Response) => {
  try {
    // Validate request
    if (!validateCreateTasksRequest(req.body)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Tasks, teamId, and assignedBy are required',
      });
    }

    const { tasks, teamId, assignedBy, projectId } = req.body;

    console.log(`[CreateTasks] Creating ${tasks.length} tasks for team ${teamId}...`);

    // 1. Create in Zoho (Mock or Real)
    let zohoResponse: CreateTasksResponse;
    if (USE_MOCK) {
      zohoResponse = createTasksMock({ tasks, projectId });
    } else {
      // TODO: Implement real Zoho logic here
      zohoResponse = createTasksMock({ tasks, projectId }); // Fallback to mock for now
    }

    // 2. Save to Supabase
    const tasksToInsert = tasks.map((task: any, index: number) => ({
      description: task.title + (task.description ? `\n\n${task.description}` : ''),
      status: 'pending',
      priority: task.priority || 'medium',
      team_id: teamId,
      assigned_to: task.assignee || null, // Expecting UUID
      assigned_by: assignedBy,
      // Store Zoho link in description for now as schema doesn't have specific columns
      // or just omit if not needed strictly in DB
    }));

    const { error: dbError } = await supabase
      .from('tasks')
      .insert(tasksToInsert);

    if (dbError) {
      console.error('[CreateTasks] Supabase insert error:', dbError);
      // We don't fail the request if DB save fails, but we should log it
      // Or maybe we should return a warning?
    } else {
      console.log('[CreateTasks] Saved tasks to Supabase');
    }

    res.json(zohoResponse);
  } catch (error) {
    console.error('[CreateTasks] Error:', error);

    res.status(500).json({
      error: 'Task creation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
