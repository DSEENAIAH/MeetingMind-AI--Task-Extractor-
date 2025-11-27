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

  // Load tasks from session storage on mount
  useEffect(() => {
    const storedTasks = sessionStorage.getItem('extractedTasks');
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

    setIsCreating(true);
    setError(null);
    setCreateResult(null);

    try {
      const result = await createTasks(tasks);
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
            >
              Go to Extract Tasks
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Preview Extracted Tasks
        </h2>
        <p className="text-gray-600">
          Review and edit tasks before creating them in Zoho Projects. You can modify details or remove tasks you don't need.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md" role="alert">
          <p className="text-sm text-red-800">{error}</p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
          >
            Go back to extract tasks
          </button>
        </div>
      )}

      {/* Summary */}
      {tasks.length > 0 && <TaskSummary tasks={tasks} />}

      {/* Tasks List / Grouped View */}
      {tasks.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">
              {tasks.length} Task{tasks.length !== 1 ? 's' : ''} Extracted
            </h3>
            <div className="flex items-center gap-3">
              <label className="flex items-center text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={groupByAssignee}
                  onChange={() => setGroupByAssignee(v => !v)}
                  className="mr-1"
                />
                Group by Assignee
              </label>
            <button
              type="button"
              data-testid="create-tasks-button"
              onClick={handleCreateTasks}
              disabled={isCreating || tasks.length === 0}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                isCreating || tasks.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isCreating ? 'Creating...' : 'Create in Zoho Projects'}
            </button>
            </div>
          </div>
          {groupByAssignee ? (
            <div>
              {Object.entries(
                tasks.reduce<Record<string, ExtractedTask[]>>((acc, t) => {
                  const key = t.assignee || 'Unassigned';
                  acc[key] = acc[key] || [];
                  acc[key].push(t);
                  return acc;
                }, {})
              ).map(([assignee, list]) => (
                <div key={assignee} className="border-t border-gray-200">
                  <div className="px-6 py-3 bg-gray-50 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-700">
                      {assignee} <span className="text-gray-500 font-normal">({list.length})</span>
                    </h4>
                    {assignee === 'Team' && (
                      <span className="text-xs px-2 py-1 rounded bg-indigo-100 text-indigo-700">Milestone</span>
                    )}
                  </div>
                  <div className="divide-y divide-gray-200">
                    {list.map((task) => {
                      const globalIndex = tasks.indexOf(task);
                      return (
                        <TaskRow
                          key={globalIndex}
                          task={task}
                          onUpdate={(updatedTask) => handleUpdateTask(globalIndex, updatedTask)}
                          onRemove={() => handleRemoveTask(globalIndex)}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {tasks.map((task, index) => (
                <TaskRow
                  key={index}
                  task={task}
                  onUpdate={(updatedTask) => handleUpdateTask(index, updatedTask)}
                  onRemove={() => handleRemoveTask(index)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Success Result */}
      {createResult && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-md p-6" role="status">
          <h3 className="text-lg font-medium text-green-900 mb-4">
            Tasks Created Successfully!
          </h3>
          <div className="space-y-2">
            {createResult.created.map((task, index) => (
              <div key={index} className="flex items-center text-sm text-green-800">
                <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>{task.title}</span>
                <a href={task.url} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-600 hover:underline">
                  View in Zoho →
                </a>
              </div>
            ))}
          </div>
          {createResult.errors && createResult.errors.length > 0 && (
            <div className="mt-4 pt-4 border-t border-green-200">
              <p className="text-sm font-medium text-yellow-800 mb-2">Some tasks failed:</p>
              {createResult.errors.map((err, index) => (
                <p key={index} className="text-sm text-yellow-700">
                  • {err.title}: {err.error}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PreviewTasks;
