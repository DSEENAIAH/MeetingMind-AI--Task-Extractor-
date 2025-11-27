/**
 * apiClient.ts
 * 
 * Purpose: Centralized API client for communicating with the backend.
 * 
 * Design decisions:
 * - Single source of truth for all backend communication
 * - Graceful error handling with user-friendly messages
 * - Type-safe interfaces for requests/responses
 * - Falls back to mock data if backend is unreachable (useful for demos)
 * 
 * Security notes:
 * - No secrets stored in frontend code
 * - API URL comes from environment variables
 * - All auth tokens handled by backend (cookies or headers)
 */

// ============================================================================
// Types
// ============================================================================

export interface ExtractedTask {
  title: string;
  description: string;
  assignee?: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string; // ISO 8601 format
}

export interface ExtractRequest {
  notes: string;
}

export interface ExtractResponse {
  tasks: ExtractedTask[];
  metadata?: {
    processedAt: string;
    model?: string;
  };
}

export interface CreateTasksRequest {
  tasks: ExtractedTask[];
  projectId?: string; // Zoho project ID
}

export interface CreateTasksResponse {
  created: {
    taskId: string;
    title: string;
    url: string;
  }[];
  errors?: {
    title: string;
    error: string;
  }[];
}

// ============================================================================
// Configuration
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      // Include credentials for cookie-based auth (when Zoho OAuth is implemented)
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `API error: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  } catch (error) {
    // NOTE: In production, you might want to log this to an error tracking service
    console.error(`API request failed: ${endpoint}`, error);
    throw error;
  }
}

// ============================================================================
// API Methods
// ============================================================================

/**
 * Extract tasks from meeting notes using AI
 * 
 * @param notes - Raw meeting notes text
 * @returns Structured list of extracted tasks
 */
export async function extractTasks(notes: string): Promise<ExtractResponse> {
  return apiFetch<ExtractResponse>('/extract', {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });
}

/**
 * Create tasks in Zoho Projects
 * 
 * @param tasks - List of tasks to create
 * @param projectId - Optional Zoho project ID (uses default if not provided)
 * @returns Created task details with URLs
 */
export async function createTasks(
  tasks: ExtractedTask[],
  projectId?: string
): Promise<CreateTasksResponse> {
  return apiFetch<CreateTasksResponse>('/create-tasks', {
    method: 'POST',
    body: JSON.stringify({ tasks, projectId }),
  });
}

/**
 * Initiate Zoho OAuth flow
 * Redirects user to Zoho login page
 */
export function initiateZohoAuth(): void {
  // NOTE: This will redirect the entire page to the backend OAuth endpoint
  // The backend handles the redirect to Zoho and callback flow
  window.location.href = `${API_BASE_URL}/auth/zoho`;
}

/**
 * Check if user is authenticated with Zoho
 * 
 * TODO: Implement this endpoint on backend
 * For now, returns false (demo mode doesn't require auth)
 */
export async function checkAuthStatus(): Promise<boolean> {
  try {
    const response = await apiFetch<{ authenticated: boolean }>('/auth/status');
    return response.authenticated;
  } catch {
    // If endpoint doesn't exist or fails, assume not authenticated
    return false;
  }
}

// ============================================================================
// Mock Data (for demo purposes)
// ============================================================================

/**
 * Mock task extraction for offline demo
 * Returns deterministic results based on input length
 */
export function mockExtractTasks(notes: string): ExtractResponse {
  console.log('[Mock Extractor] Starting extraction, input length:', notes.length);
  const tasks: ExtractedTask[] = [];
  
  // Filler patterns to ignore
  const FILLER_PATTERNS = [
    /^hi[,! ]?$/i, /^hello[,! ]?$/i, /^morning[,! ]?$/i, /^good morning/i,
    /^yeah[,! ]?$/i, /^yep[,! ]?$/i, /^okay[,! ]?$/i, /^ok[,! ]?$/i,
    /^all good/i, /^sounds good/i, /^no blockers/i, /^bye[,! ]?$/i,
    /^great[,! ]?$/i, /^perfect[,! ]?$/i, /^no issues/i, /^on track/i,
  ];
  
  // Action indicators
  const ACTION_VERBS = [
    'finish', 'complete', 'start', 'begin', 'fix', 'prepare', 'push',
    'deploy', 'integrate', 'update', 'design', 'layout', 'testing',
    'test', 'release', 'close', 'review', 'cache', 'authentication'
  ];

  // Date extraction
  function extractDueDate(text: string): string | undefined {
    const monthMap: Record<string, string> = {
      jan: '01', january: '01', feb: '02', february: '02', mar: '03', march: '03',
      apr: '04', april: '04', may: '05', jun: '06', june: '06', jul: '07',
      july: '07', aug: '08', august: '08', sep: '09', sept: '09', september: '09',
      oct: '10', october: '10', nov: '11', november: '11', dec: '12', december: '12'
    };
    
    const md = text.match(/(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{1,2})/i);
    if (md) {
      const month = monthMap[md[1].toLowerCase()];
      const day = md[2].padStart(2, '0');
      return `${new Date().getFullYear()}-${month}-${day}`;
    }
    
    if (/tomorrow/i.test(text)) {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d.toISOString().split('T')[0];
    }
    
    if (/today|eod|end of day/i.test(text)) {
      return new Date().toISOString().split('T')[0];
    }
    
    return undefined;
  }

  // Heuristic timestamp-speaker extraction (primary strategy for transcripts)
  let currentSpeaker: string | undefined;
  const todayISO = new Date().toISOString().split('T')[0];
  const transcriptLines = notes.split('\n').map(l => l.trim()).filter(Boolean);

  const pushTask = (title: string, opts: { assignee?: string; dueDate?: string }) => {
    if (tasks.some(t => t.title.toLowerCase().includes(title.toLowerCase().substring(0, 20)))) return;
    tasks.push({
      title,
      description: `Extracted from transcript`,
      assignee: opts.assignee,
      dueDate: opts.dueDate,
      priority: 'medium',
    });
  };

  for (const rawLine of transcriptLines) {
    // Parse speaker from timestamp format: [00:22] Seenu: or 00:22 Seenu:
    const speakerMatch = rawLine.match(/^(?:\[?\d{2}:\d{2}(?::\d{2})?\]?\s+)([A-Z][a-z]+)(?:\s*\([^)]*\))?:\s*(.+)$/i);
    if (speakerMatch) {
      currentSpeaker = speakerMatch[1].trim();
      const content = speakerMatch[2].trim();
      
      // Check if this speaker line contains a task commitment
      const lower = content.toLowerCase();
      
      // Pattern: "I can/will do X" - speaker commits to task
      if (/^i\s+(can|will|'ll)\s+(.+)/i.test(content)) {
        const taskMatch = content.match(/^i\s+(?:can|will|'ll)\s+(.+)/i);
        if (taskMatch) {
          const taskDesc = taskMatch[1].replace(/\.$/, ''); // Remove trailing period
          pushTask(taskDesc, { assignee: currentSpeaker, dueDate: extractDueDate(taskDesc) });
        }
      }
      continue;
    }

    // Parse non-speaker lines (usually manager assigning tasks)
    const line = rawLine.replace(/[""]/g, '"').replace(/[']/g, "'");
    if (FILLER_PATTERNS.some(p => p.test(line))) continue;
    const lower = line.toLowerCase();

    // Pattern: "Name, after X, can you Y" or "Name, can you Y"
    const canYouMatch = line.match(/([A-Z][a-z]+),\s+(?:after\s+[^,]+,\s+)?can\s+you\s+(.+?)\?/i);
    if (canYouMatch) {
      const assignee = canYouMatch[1];
      const taskDesc = canYouMatch[2];
      pushTask(taskDesc, { assignee, dueDate: extractDueDate(taskDesc) });
    }
    
    // Pattern: "who's doing X" - indicates need for assignment
    const whosMatch = line.match(/who'?s\s+(doing|updating|handling)\s+(.+?)\?/i);
    if (whosMatch) {
      const action = whosMatch[1];
      const taskDesc = `${action} ${whosMatch[2]}`;
      pushTask(taskDesc, { dueDate: extractDueDate(taskDesc) });
    }
    
    // Pattern: "we need X" - indicates required task
    const needMatch = line.match(/we\s+need\s+(.+?)\./i);
    if (needMatch) {
      const taskDesc = needMatch[1];
      pushTask(taskDesc, { dueDate: extractDueDate(taskDesc) });
    }
    
    // Pattern: "Name to do X by Date"
    const taskMatch = line.match(/([A-Z][a-z]+)\s+to\s+(.+?)\s+by\s+(\w+)/i);
    if (taskMatch) {
      const assignee = taskMatch[1];
      const taskDesc = taskMatch[2];
      const deadline = taskMatch[3];
      pushTask(taskDesc, { assignee, dueDate: extractDueDate(`by ${deadline}`) });
    }

    // Pattern: "Name will do X"
    const willMatch = line.match(/([A-Z][a-z]+)\s+will\s+(.+)/i);
    if (willMatch) {
      const assignee = willMatch[1];
      const taskDesc = willMatch[2];
      pushTask(taskDesc, { assignee, dueDate: extractDueDate(taskDesc) });
    }
    
    // Pattern: "Name needs to X"
    const needsMatch = line.match(/([A-Z][a-z]+)\s+needs?\s+to\s+(.+)/i);
    if (needsMatch) {
      const assignee = needsMatch[1];
      const taskDesc = needsMatch[2];
      pushTask(taskDesc, { assignee, dueDate: extractDueDate(taskDesc) });
    }

    // Pattern: "Name mentioned/said he/she will X"
    const mentionedMatch = line.match(/([A-Z][a-z]+)\s+(?:mentioned|said)\s+(?:he|she|they)\s+(?:will|'ll|needs?\s+to)\s+(.+)/i);
    if (mentionedMatch) {
      const assignee = mentionedMatch[1];
      const taskDesc = mentionedMatch[2];
      pushTask(taskDesc, { assignee, dueDate: extractDueDate(taskDesc) });
    }

    // Pattern: "told/asked Name to do X"
    const toldMatch = line.match(/(?:told|asked)\s+([A-Z][a-z]+)\s+to\s+(.+)/i);
    if (toldMatch) {
      const assignee = toldMatch[1];
      const taskDesc = toldMatch[2];
      pushTask(taskDesc, { assignee, dueDate: extractDueDate(taskDesc) });
    }

    // Pattern: "Name, this is your task - X"
    const yourTaskMatch = line.match(/([A-Z][a-z]+),\s+this\s+is\s+your\s+task\s*[-:]\s*(.+)/i);
    if (yourTaskMatch) {
      const assignee = yourTaskMatch[1];
      const taskDesc = yourTaskMatch[2];
      pushTask(taskDesc, { assignee, dueDate: extractDueDate(taskDesc) });
    }

    // Pattern: "someone should X" - unassigned task
    const someoneMatch = line.match(/someone\s+should\s+(.+)/i);
    if (someoneMatch) {
      const taskDesc = someoneMatch[1];
      pushTask(taskDesc, { dueDate: extractDueDate(taskDesc) });
    }
  }

  // Process bullet points and action items if present
  const bulletMatches = notes.match(/^\s*[-*•]\s+(.+)$/gm);
  if (bulletMatches) {
    for (const bullet of bulletMatches) {
      const cleanBullet = bullet.replace(/^\s*[-*•]\s+/, '').trim();
      if (FILLER_PATTERNS.some(p => p.test(cleanBullet))) continue;
      
      // Check if bullet contains assignment
      const assigneeMatch = cleanBullet.match(/([A-Z][a-z]+)\s+(?:to|will|needs?\s+to|should)\s+(.+)/i);
      if (assigneeMatch) {
        const assignee = assigneeMatch[1];
        const taskDesc = assigneeMatch[2];
        pushTask(taskDesc, { assignee, dueDate: extractDueDate(taskDesc) });
      } else if (cleanBullet.length > 10) {
        pushTask(cleanBullet, { dueDate: extractDueDate(cleanBullet) });
      }
    }
  }

  // Fallback for non-transcript notes
  if (tasks.length === 0) {
    tasks.push({
      title: 'Review meeting notes',
      description: notes.substring(0, 200),
      priority: 'low',
    });
  }

  console.log('[Mock Extractor] Completed, extracted', tasks.length, 'tasks');
  return {
    tasks,
    metadata: {
      processedAt: new Date().toISOString(),
      model: 'mock-extractor-v1',
    },
  };
}
