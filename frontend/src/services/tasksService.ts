/**
 * Client-side task management service  
 * Replaces backend /api/tasks endpoints
 */

import { supabase } from '../lib/supabase';

export class TasksService {
  /**
   * Create tasks in database
   */
  static async createTasks(tasks: any[], teamId: string, assignedBy: string) {
    // 1. Fetch all team members with 'accepted' status
    const { data: teamMembers, error: membersError } = await supabase
      .from('team_members')
      .select('user_id, status, name')
      .eq('team_id', teamId);

    if (membersError) {
      console.error('Error fetching team members during task creation:', membersError);
      throw membersError;
    }

    // 2. Fetch team owner to allow them to be assigned even if not in members list
    const { data: teamData } = await supabase
      .from('teams')
      .select('created_by')
      .eq('id', teamId)
      .single();

    // Allow assignment to 'accepted' OR 'pending' members
    const acceptedMemberIds = new Set(
      teamMembers
        ?.filter(m => m.status === 'accepted' || m.status === 'pending')
        .map(m => m.user_id)
    );

    // Add owner to accepted members
    if (teamData?.created_by) {
      acceptedMemberIds.add(teamData.created_by);
    }

    const tasksToInsert = tasks.map(task => {
      // Determine assigned_to UUID
      // Handle both team_members object (has user_id) and user_profiles object (has id)
      let assignedTo = task.matchedUser?.user_id || task.matchedUser?.id;

      // Fallback: if assignee looks like a UUID, use it
      if (!assignedTo && task.assignee && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(task.assignee)) {
        assignedTo = task.assignee;
      }

      let finalAssignedTo = null;
      let finalAssignedToName = null;
      let unassignedReason = null;

      if (assignedTo) {
        // Check if user is an accepted member
        if (acceptedMemberIds.has(assignedTo)) {
          finalAssignedTo = assignedTo;
          finalAssignedToName = task.matchedUser?.full_name || task.assignee;
        } else {
          // Check why they are not assigned
          const member = teamMembers?.find(m => m.user_id === assignedTo);
          if (member) {
            unassignedReason = `Member status is '${member.status}', not 'accepted' or 'pending'`;
          } else {
            unassignedReason = 'User is not a member of this team';
          }
        }
      } else {
        unassignedReason = 'No assignee specified';
      }

      return {
        team_id: teamId,
        description: task.description || task.title,
        assigned_to: finalAssignedTo,
        assigned_to_name: finalAssignedToName,
        assigned_by: assignedBy,
        priority: task.priority || 'medium',
        status: 'pending',
        unassigned_reason: unassignedReason
      };
    });

    const { data, error } = await supabase
      .from('tasks')
      .insert(tasksToInsert)
      .select();

    if (error) {
      console.error('TasksService.createTasks: Supabase error:', error);
      throw new Error(`Supabase Error: ${error.message} (${error.details || 'no details'})`);
    }
    return data;
  }

  /**
   * Get tasks with filters
   */
  static async getTasks(filters: {
    userId?: string;
    teamId?: string;
    status?: string;
    deleted?: boolean
  }) {
    // console.log('TasksService.getTasks: Called with filters:', filters);
    let query = supabase.from('tasks').select('*');

    if (filters.userId) {
      query = query.eq('assigned_to', filters.userId);
    }
    if (filters.teamId) {
      query = query.eq('team_id', filters.teamId);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    const { data: tasks, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('TasksService.getTasks: Error fetching tasks:', error);
      throw error;
    }

    // Fetch assigner names
    if (tasks && tasks.length > 0) {
      const assignerIds = [...new Set(tasks.map(t => t.assigned_by).filter(id => id))];

      if (assignerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, full_name, username')
          .in('id', assignerIds);

        // Map profiles to tasks
        const tasksWithNames = tasks.map(task => {
          const profile = profiles?.find(p => p.id === task.assigned_by);
          return {
            ...task,
            assignedByName: profile?.full_name || profile?.username || 'Unknown'
          };
        });

        // console.log(`TasksService.getTasks: Found ${tasksWithNames.length} tasks with names`);
        return tasksWithNames;
      }
    }

    // console.log(`TasksService.getTasks: Found ${tasks?.length || 0} tasks`);
    return tasks;
  }

  /**
   * Update task status
   */
  static async updateTaskStatus(taskId: string, status: string) {
    const { data, error } = await supabase
      .from('tasks')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update task details
   */
  static async updateTask(taskId: string, updates: any) {
    const { data, error } = await supabase
      .from('tasks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete a task
   */
  static async deleteTask(taskId: string, force: boolean = false) {
    if (force) {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
    } else {
      // Soft delete - you can add a 'deleted' column if needed
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'deleted' })
        .eq('id', taskId);

      if (error) throw error;
    }
  }

  /**
   * Search users
   */
  static async searchUsers(query: string) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
      .limit(10);

    if (error) throw error;
    return data;
  }
}

export default TasksService;