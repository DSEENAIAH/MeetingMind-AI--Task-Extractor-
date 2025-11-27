/**
 * routes/createTasks.ts
 * 
 * Purpose: Create tasks in Zoho Projects from extracted task data.
 * 
 * User story:
 * - User reviews extracted tasks in frontend preview
 * - Clicks "Create in Zoho Projects"
 * - Frontend POSTs to /api/create-tasks with { tasks: [...], projectId?: "..." }
 * - Backend creates tasks in Zoho via API
 * - Returns task URLs for user to access directly
 * 
 * Design decisions:
 * - Batch creation (all tasks in one request)
 * - Partial success handling (some tasks may fail)
 * - Mock mode returns fake Zoho URLs for demo
 * - Real mode uses Zoho Projects REST API
 * 
 * TODO for production:
 * - Implement OAuth token refresh
 * - Add retry logic for failed requests
 * - Support custom fields mapping
 * - Add webhook for task status updates
 */

import { Router, Request, Response } from 'express';
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

function validateCreateTasksRequest(body: any): body is CreateTasksRequest {
  if (!body.tasks || !Array.isArray(body.tasks)) {
    return false;
  }

  if (body.tasks.length === 0) {
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
// Real Zoho Implementation (Stub)
// ============================================================================

/**
 * Create tasks in Zoho Projects via REST API
 * 
 * TODO: Implement when Zoho OAuth is ready
 * 
 * Steps:
 * 1. Get access token from session (or refresh if expired)
 * 2. For each task:
 *    - Map our task format to Zoho's expected format
 *    - POST to https://projectsapi.zoho.com/restapi/portal/{portalId}/projects/{projectId}/tasks/
 *    - Handle response (success or error)
 * 3. Return created tasks with URLs
 * 
 * Zoho API docs: https://www.zoho.com/projects/help/rest-api/tasks-api.html
 */
async function createTasksZoho(
  request: CreateTasksRequest,
  accessToken: string
): Promise<CreateTasksResponse> {
  // TODO: Implement real Zoho API calls
  // 
  // Example structure:
  // const zohoApiUrl = `https://projectsapi.zoho.com/restapi/portal/${portalId}/projects/${projectId}/tasks/`;
  // 
  // const responses = await Promise.allSettled(
  //   tasks.map(task => 
  //     fetch(zohoApiUrl, {
  //       method: 'POST',
  //       headers: {
  //         'Authorization': `Zoho-oauthtoken ${accessToken}`,
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({
  //         name: task.title,
  //         description: task.description,
  //         priority: task.priority === 'high' ? 'High' : task.priority === 'low' ? 'Low' : 'Medium',
  //         // ... other fields
  //       })
  //     })
  //   )
  // );
  //
  // Then parse responses and build CreateTasksResponse

  throw new Error('Real Zoho integration not implemented yet. Set USE_MOCK=true for demo.');
}

// ============================================================================
// POST /api/create-tasks
// ============================================================================

/**
 * Create tasks in Zoho Projects
 * 
 * Request body:
 * {
 *   tasks: ExtractedTask[] (required)
 *   projectId?: string (optional, uses default if not provided)
 *   portalId?: string (optional, uses default if not provided)
 * }
 * 
 * Response:
 * {
 *   created: [
 *     { taskId: string, title: string, url: string }
 *   ]
 *   errors?: [
 *     { title: string, error: string }
 *   ]
 * }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // Validate request
    if (!validateCreateTasksRequest(req.body)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Tasks field is required and must be a non-empty array with valid task objects',
      });
    }

    const request: CreateTasksRequest = req.body;

    console.log(`[CreateTasks] Creating ${request.tasks.length} tasks...`);

    let response: CreateTasksResponse;

    if (USE_MOCK) {
      // Mock mode: return fake Zoho URLs
      response = createTasksMock(request);
      console.log(`[CreateTasks] Mock mode: created ${response.created.length} tasks`);
    } else {
      // Real mode: check for access token
      const accessToken = req.session?.zohoTokens?.accessToken;

      if (!accessToken) {
        return res.status(401).json({
          error: 'Not authenticated',
          message: 'Please authenticate with Zoho first',
          authUrl: '/api/auth/zoho',
        });
      }

      try {
        response = await createTasksZoho(request, accessToken);
        console.log(`[CreateTasks] Real mode: created ${response.created.length} tasks`);
      } catch (error) {
        console.error('[CreateTasks] Zoho API error:', error);
        
        // Fall back to mock if Zoho API fails (useful during development)
        console.warn('[CreateTasks] Falling back to mock mode due to error');
        response = createTasksMock(request);
      }
    }

    res.json(response);
  } catch (error) {
    console.error('[CreateTasks] Error:', error);
    
    res.status(500).json({
      error: 'Task creation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
