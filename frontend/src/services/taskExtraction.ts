/**
 * Client-side AI service for task extraction
 * Replaces the backend /api/extract endpoint
 */

// Import your existing AI clients
import { extractTasksWithGemini } from '../lib/llmClient';
import { mockExtractTasks } from '../api/apiClient';
import { supabase } from '../lib/supabase';

export class TaskExtractionService {
  /**
   * Extract tasks from notes (client-side)
   */
  static async extractTasks(notes: string, teamMembers: any[] = [], useMock: boolean = false) {
    try {
      if (useMock) {
        return mockExtractTasks(notes);
      }

      // Use Gemini AI directly from frontend, passing team members for context
      return await extractTasksWithGemini(notes, teamMembers);
    } catch (error) {
      console.error('[TaskExtraction] Error:', error);
      throw error;
    }
  }
}

// Update API client to use client-side extraction
export const clientSideExtractTasks = async (notes: string, teamMembers: any[] = []) => {
  try {
    // Call Gemini AI directly from frontend
    const response = await TaskExtractionService.extractTasks(notes, teamMembers);

    // Get users for matching (directly from Supabase) if not provided or to supplement
    let users = teamMembers;

    // If no team members provided, try to fetch all profiles (fallback)
    if (!users || users.length === 0) {
      const { data: allProfiles } = await supabase
        .from('user_profiles')
        .select('*');
      users = allProfiles || [];
    }

    // Match assignees to users (same logic as backend)
    if (users && users.length > 0) {
      response.tasks = response.tasks.map((task: any) => {
        if (task.assignee) {
          const matched = users.find((u: any) =>
            (u.username && u.username.toLowerCase().includes(task.assignee.toLowerCase())) ||
            (u.full_name && u.full_name.toLowerCase().includes(task.assignee.toLowerCase())) ||
            (u.name && u.name.toLowerCase().includes(task.assignee.toLowerCase()))
          );
          if (matched) {
            task.matchedUser = matched;
            // Ensure we use the exact name from the matched user
            task.assignee = matched.full_name || matched.name || matched.username;
          }
        }
        return task;
      });
    }

    return response;
  } catch (error) {
    console.error('[ClientSide] Task extraction failed:', error);
    throw error;
  }
};