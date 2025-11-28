/**
 * PreviewTasks.tsx
 * 
 * Purpose: Preview extracted tasks before creating them in Zoho Projects.
 * 
 * User story:
 * - After extraction, user reviews all tasks in a clean list view
 * - Can edit task details inline (title, description, priority, assignee)
 * - Can remove tasks they don't want to create
 * - Click "Create in Zoho" to send all tasks at once
 * 
 * UX decisions:
 * - Editable preview (not just read-only) for flexibility
 * - Bulk actions: create all or create selected
 * - Clear visual feedback during creation process
 * - Links to created tasks in Zoho for immediate access
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTasks, ExtractedTask, CreateTasksResponse } from '../api/apiClient';
import TaskRow from '../components/TaskRow';
import TaskSummary from '../components/TaskSummary';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

// Define official roles that can access this page
const OFFICIAL_ROLES = [
  'ceo',
  'cto',
  'vp_engineering',
  'director',
  'engineering_manager',
  'product_manager',
  'team_lead',
  'hr_manager'
];

interface TeamMember {
  id: string;
  username: string;
  full_name: string;
  role: string;
}

function PreviewTasks() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirect workers to dashboard
  useEffect(() => {
    if (user) {
      const role = user.user_metadata?.role;
      if (role && !OFFICIAL_ROLES.includes(role)) {
        // Worker role - redirect to dashboard
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, navigate]);

  const [tasks, setTasks] = useState<ExtractedTask[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [createResult, setCreateResult] = useState<CreateTasksResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [groupByAssignee, setGroupByAssignee] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  // Toggle selection for a single task
  const toggleSelection = (index: number, selected: boolean) => {
    const newSelection = new Set(selectedIndices);
    if (selected) {
      newSelection.add(index);
    } else {
      newSelection.delete(index);
    }
    setSelectedIndices(newSelection);
  };

  // Toggle select all
  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIndices(new Set(tasks.map((_, i) => i)));
    } else {
      setSelectedIndices(new Set());
    }
  };

  // Delete selected tasks
  const handleDeleteSelected = () => {
    if (selectedIndices.size === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedIndices.size} tasks?`)) return;

    const newTasks = tasks.filter((_, i) => !selectedIndices.has(i));
    setTasks(newTasks);
    setSelectedIndices(new Set());
    sessionStorage.setItem('extractedTasks', JSON.stringify(newTasks));
  };

  // Load tasks from session storage on mount
  useEffect(() => {
    const storedTasks = sessionStorage.getItem('extractedTasks');
    const storedTeamId = sessionStorage.getItem('currentTeamId');

    if (storedTeamId) {
      setTeamId(storedTeamId);
    }

    if (storedTasks) {
      try {
        const parsed = JSON.parse(storedTasks);
        console.log('[PreviewTasks] Loaded from sessionStorage:', parsed.length, 'tasks');
        setTasks(parsed);
      } catch (err) {
        console.error('Failed to parse stored tasks:', err);
        setError('Failed to load extracted tasks. Please try extracting again.');
      }
    } else {
      setError('No tasks found. Please extract tasks from meeting notes first.');
    }
  }, []);

  // Fetch team members
  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!teamId) return;

      const { data: membersData } = await supabase
        .from('team_members')
        .select('user_id, name, role')
        .eq('team_id', teamId);

      const members = membersData?.map((m: any) => ({
        id: m.user_id,
        username: m.name,
        full_name: m.name,
        role: m.role,
      })) || [];

      setTeamMembers(members);
    };

    fetchTeamMembers();
  }, [teamId]);

  /**
   * Update a specific task in the list
   */
  const handleUpdateTask = (index: number, updatedTask: ExtractedTask) => {
    const newTasks = [...tasks];
    newTasks[index] = updatedTask;
    setTasks(newTasks);
    sessionStorage.setItem('extractedTasks', JSON.stringify(newTasks));
  };

  /**
   * Remove a task from the list
   */
  const handleRemoveTask = (index: number) => {
    const newTasks = tasks.filter((_, i) => i !== index);
    setTasks(newTasks);
    sessionStorage.setItem('extractedTasks', JSON.stringify(newTasks));
  };

  /**
   * Create all tasks in Zoho Projects
   */
  const handleCreateTasks = async () => {
    if (tasks.length === 0) {
      setError('No tasks to create');
      return;
    }

    if (!teamId || !user) {
      setError('Missing team or user information');
      return;
    }

    setIsCreating(true);
    setError(null);
    setCreateResult(null);

    try {
      const result = await createTasks(tasks, teamId, user.id);
      setCreateResult(result);

      // TODO: Optionally clear session storage after successful creation
      // sessionStorage.removeItem('extractedTasks');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tasks');
    } finally {
      setIsCreating(false);
    }
  };

  // If no tasks, show empty state
  if (tasks.length === 0 && !error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks to preview</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by extracting tasks from your meeting notes.</p>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                            </p>
                          ))}
        </div>
                      )}
      </div>
    )
  }
              </div >
              );
}

export default PreviewTasks;
