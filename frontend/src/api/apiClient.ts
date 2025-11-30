/**
 * apiClient.ts
 * 
 * Purpose: Client-side API functions using Supabase directly and AI services.
 * Updated to work without backend - all operations happen client-side.
 */

import { supabase } from '../lib/supabase';
import { clientSideExtractTasks } from '../services/taskExtraction';
import TasksService from '../services/tasksService';
import TeamsService from '../services/teamsService';

// ============================================================================
// Types  
// ============================================================================

export interface ExtractedTask {
  title: string;
  description: string;
  assignee?: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string; // ISO 8601 format
  matchedUser?: UserProfile;
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
  warnings?: string[];
  data?: any[];
}

export interface Team {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  members: TeamMember[];
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  name: string;
  role: string;
  username?: string;
  added_at: string;
  email?: string;
  status?: 'pending' | 'accepted' | 'rejected';
}

export interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  role: string;
}

// ============================================================================
// Configuration
// ============================================================================

// No longer needed - all operations are client-side now!

// ============================================================================
// API Methods - Now Client-Side
// ============================================================================

/**
 * Extract tasks from meeting notes using AI (client-side)
 */
export async function extractTasks(notes: string, teamMembers: any[] = []): Promise<ExtractResponse> {
  return clientSideExtractTasks(notes, teamMembers);
}

/**
 * Create tasks in database (client-side)
 */
export async function createTasks(
  tasks: ExtractedTask[],
  teamId: string,
  assignedBy: string
): Promise<any> {
  return TasksService.createTasks(tasks, teamId, assignedBy);
}

/**
 * Get tasks with filters (client-side)
 */
export async function getTasks(filters: { userId?: string; teamId?: string; status?: string; deleted?: boolean }): Promise<any[]> {
  return TasksService.getTasks(filters);
}

/**
 * Update task status (client-side)
 */
export async function updateTaskStatus(taskId: string, status: 'pending' | 'in-progress' | 'completed'): Promise<any> {
  return TasksService.updateTaskStatus(taskId, status);
}

/**
 * Update task details (client-side)
 */
export async function updateTask(taskId: string, updates: any): Promise<any> {
  return TasksService.updateTask(taskId, updates);
}

/**
 * Delete a task (client-side)
 */
export async function deleteTask(taskId: string, force: boolean = false): Promise<void> {
  return TasksService.deleteTask(taskId, force);
}

/**
 * Restore a soft-deleted task (client-side)
 */
export async function restoreTask(taskId: string): Promise<any> {
  return TasksService.updateTaskStatus(taskId, 'pending');
}

/**
 * Get team members (client-side)
 */
export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  return TeamsService.getTeamMembers(teamId);
}

/**
 * Get team statistics (client-side)
 */
export async function getTeamStats(teamId: string): Promise<any> {
  return TeamsService.getTeamStats(teamId);
}

/**
 * Get user's teams (client-side)
 */
export async function getTeams(userId: string): Promise<Team[]> {
  return TeamsService.getTeams(userId);
}

/**
 * Create a new team (client-side)
 */
export async function createTeam(name: string, userId: string): Promise<Team> {
  return TeamsService.createTeam(name, userId);
}

/**
 * Add a member to a team (client-side)
 */
export async function addTeamMember(
  teamId: string,
  userId: string,
  addedBy: string,
  role: string = 'Member'
): Promise<TeamMember> {
  const result = await TeamsService.addTeamMembers(teamId, [userId], addedBy);
  return result[0];
}

/**
 * Send invitations to multiple users (client-side)
 */
export async function sendTeamInvitations(
  teamId: string,
  userIds: string[],
  addedBy: string
): Promise<any> {
  return TeamsService.addTeamMembers(teamId, userIds, addedBy);
}

/**
 * Get pending invitations for the current user (client-side)
 */
export async function getInvitations(): Promise<any[]> {
  // console.log('getInvitations: Function called');
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  // console.log('getInvitations: Session retrieved:', session);

  if (!session?.user) {
    // console.log('getInvitations: No user in session, returning empty');
    return [];
  }

  // console.log('getInvitations: User ID:', session.user.id);

  const { data: members, error } = await supabase
    .from('team_members')
    .select(`
      *,
      teams:teams(*)
    `)
    .eq('user_id', session.user.id)
    .eq('status', 'pending');

  if (error) {
    console.error('getInvitations: Error:', error);
    throw error;
  }
  // console.log('getInvitations: Raw members:', members);
  if (!members || members.length === 0) return [];

  // Fetch profiles for the 'added_by' users
  const addedByIds = members.map(m => m.added_by).filter(id => id);
  let profiles: any[] = [];
  if (addedByIds.length > 0) {
    const { data: profilesData } = await supabase
      .from('user_profiles')
      .select('id, full_name, username')
      .in('id', addedByIds);
    profiles = profilesData || [];
  }

  // Map to the format NotificationCenter expects
  return members.map(m => {
    const inviter = profiles.find(p => p.id === m.added_by);
    const inviterName = inviter?.full_name || inviter?.username || 'Unknown User';

    return {
      id: m.id,
      team_id: m.team_id,
      team_name: m.teams?.name || 'Unknown Team',
      invited_by_name: inviterName,
      created_at: m.added_at || new Date().toISOString()
    };
  });
}

/**
 * Accept a team invitation (client-side)
 */
export async function acceptInvitation(teamId: string): Promise<any> {
  // console.log('acceptInvitation: Called for team:', teamId);
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session?.user) throw new Error('Not authenticated');

  // console.log('acceptInvitation: User ID:', session.user.id);

  const { data: result, error } = await supabase
    .from('team_members')
    .update({ status: 'accepted' })
    .eq('team_id', teamId)
    .eq('user_id', session.user.id)
    .select();

  if (error) {
    console.error('acceptInvitation: Error:', error);
    throw error;
  }

  // console.log('acceptInvitation: Result:', result);

  if (!result || result.length === 0) {
    console.warn('acceptInvitation: No rows updated! Check RLS policies.');
  }

  return result;
}

/**
 * Reject a team invitation (client-side)
 */
export async function rejectInvitation(teamId: string): Promise<any> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session?.user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('user_id', session.user.id);

  if (error) throw error;
}

/**
 * Remove a member from a team (client-side)
 */
export async function removeTeamMember(teamId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('user_id', userId);

  if (error) throw error;
}

/**
 * Search users (client-side)
 */
export async function searchUsers(query: string): Promise<UserProfile[]> {
  return TasksService.searchUsers(query);
}

/**
 * Check auth status - now always true since we use Supabase Auth directly
 */
export async function checkAuthStatus(): Promise<boolean> {
  const { data: session } = await supabase.auth.getSession();
  return !!session?.user;
}

// ============================================================================
// Legacy API Functions (Deprecated but maintained for compatibility)
// ============================================================================

/**
 * @deprecated - Direct fetch calls should use new client-side functions above
 * This is a compatibility layer for components still using old API calls
 */
export const apiUrl = 'https://meetingmind-extracter.web.app/api';

/**
 * Helper function for legacy components that still make direct fetch calls
 * This will be gradually phased out as components are updated
 */
export async function legacyFetch(endpoint: string, options: RequestInit = {}) {
  // For now, redirect to show that API is client-side
  console.warn(`[Deprecated] Direct API call to ${endpoint} - use client-side functions instead`);
  throw new Error(`API endpoint ${endpoint} moved to client-side. Check console for details.`);
}

// ============================================================================
// Mock Data (for demo purposes)
// ============================================================================

/**
 * Mock task extraction for offline demo
 * Returns deterministic results based on input length
 */
export function mockExtractTasks(notes: string): ExtractResponse {
  // console.log('[Mock Extractor] Starting extraction, input length:', notes.length);
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

  // console.log('[Mock Extractor] Completed, extracted', tasks.length, 'tasks');
  return {
    tasks,
    metadata: {
      processedAt: new Date().toISOString(),
      model: 'mock-extractor-v1',
    },
  };
}
