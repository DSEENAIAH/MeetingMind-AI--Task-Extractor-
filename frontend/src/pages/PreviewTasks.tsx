
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTasks, ExtractedTask, CreateTasksResponse } from '../api/apiClient';
import TaskRow from '../components/TaskRow';
import TaskSummary from '../components/TaskSummary';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { FiArrowLeft, FiCheck, FiAlertCircle, FiLoader, FiSave } from 'react-icons/fi';

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
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState<string>('');

  // Load tasks from session storage on mount
  useEffect(() => {
    const storedTasks = sessionStorage.getItem('extractedTasks');
    const storedTeamId = sessionStorage.getItem('currentTeamId');

    if (storedTeamId) {
      setTeamId(storedTeamId);
      // Fetch team name
      const fetchTeamName = async () => {
        const { data } = await supabase.from('teams').select('name').eq('id', storedTeamId).single();
        if (data) setTeamName(data.name);
      };
      fetchTeamName();
    }

    if (storedTasks) {
      try {
        const parsed = JSON.parse(storedTasks);
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
   * Create all tasks in local database
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

      // If there are warnings, set them as error to show them
      if (result.warnings && result.warnings.length > 0) {
        setError(`Tasks created, but with warnings: ${result.warnings.join(' ')}`);
      }

      // TODO: Optionally clear session storage after successful creation
      // sessionStorage.removeItem('extractedTasks');
    } catch (err: any) {
      console.error('Error creating tasks:', err);
      setError(err.message || JSON.stringify(err) || 'Failed to create tasks');
    } finally {
      setIsCreating(false);
    }
  };

  // If no tasks, show empty state
  if (tasks.length === 0 && !error) {
    return (
      <div className="max-w-4xl mx-auto mt-12 px-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="mx-auto h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <FiCheck className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">No tasks to preview</h3>
          <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
            Get started by extracting tasks from your meeting notes.
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => navigate('/extract')}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-gray-900 hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors"
            >
              Go to Extraction
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (createResult) {
    return (
      <div className="max-w-3xl mx-auto mt-12 px-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-8 text-center border-b border-gray-100">
            <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <FiCheck className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Tasks Created Successfully!</h3>
            <p className="text-gray-600">
              You've successfully assigned <span className="font-semibold text-gray-900">
                {Array.isArray(createResult)
                  ? createResult.length
                  : (createResult.data ? createResult.data.length : (createResult.created?.length || 0))
                } tasks
              </span> to your team.
            </p>
          </div>

          {createResult.warnings && createResult.warnings.length > 0 && (
            <div className="p-6 bg-yellow-50 border-b border-yellow-100">
              <div className="flex items-start gap-3">
                <FiAlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-800 mb-1">Warnings</h4>
                  <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                    {createResult.warnings.map((warning: string, i: number) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="p-6 bg-gray-50 flex justify-center gap-4">
            <button
              onClick={() => navigate(`/teams/${teamId}/dashboard?tab=tasks`)}
              className="px-5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors shadow-sm"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => navigate(`/teams/${teamId}/extract`)}
              className="px-5 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-black transition-colors shadow-sm"
            >
              Extract More
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="mb-4 text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1 transition-colors"
          >
            <FiArrowLeft className="w-4 h-4" /> Back to Extract
          </button>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Review & Assign</h1>
          <p className="text-gray-500 text-sm mt-1">
            Review the extracted tasks below and assign them to your team.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {teamName && (
            <div className="hidden md:flex items-center gap-2 text-sm text-gray-500 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span className="font-medium text-gray-700">{teamName}</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleCreateTasks}
            disabled={isCreating}
            className={`
              inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white shadow-sm transition-all
              ${isCreating
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md active:transform active:scale-95'
              }
            `}
          >
            {isCreating ? (
              <>
                <FiLoader className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <FiSave className="w-4 h-4" />
                Create {tasks.length} Tasks
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3">
          <FiAlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      <TaskSummary tasks={tasks} />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center text-xs font-medium text-gray-500 uppercase tracking-wider">
          <span>Task Details</span>
          <span>{tasks.length} Tasks Found</span>
        </div>
        <ul className="divide-y divide-gray-100">
          {tasks.map((task, index) => (
            <TaskRow
              key={index}
              task={task}
              onUpdate={(updatedTask) => handleUpdateTask(index, updatedTask)}
              onRemove={() => handleRemoveTask(index)}
              teamMembers={teamMembers}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

export default PreviewTasks;
