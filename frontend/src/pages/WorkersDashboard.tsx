/**
 * WorkersDashboard.tsx
 * 
 * Purpose: Dashboard for developers, QA, and other team members
 * Features:
/**
 * WorkersDashboard.tsx
 * 
 * Purpose: Dashboard for developers, QA, and other team members
 * Features:
 * - View assigned tasks in a clean, tabbed list view
 * - Mark tasks as complete
 * - See task details and deadlines
 */

import { useState, useEffect } from 'react';
import { FiCheckCircle, FiCircle, FiClock, FiFilter, FiSearch } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { getTasks, updateTaskStatus } from '../api/apiClient';
import { TeamsService } from '../services/teamsService';
import { supabase } from '../lib/supabase';

const WorkersDashboard = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'in-progress' | 'completed'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch tasks for current user
  useEffect(() => {
    if (user) {
      loadTasks();
      loadTeams();

      // Real-time subscription for tasks assigned to this user
      const channel = supabase
        .channel('workers-dashboard-tasks')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tasks',
            filter: `assigned_to=eq.${user.id}`,
          },
          () => {
            loadTasks();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, selectedTeamId]); // Reload when user or selectedTeamId changes

  const loadTeams = async () => {
    if (!user) return;
    if (!user) return;
    try {
      const data = await TeamsService.getJoinedTeams(user.id);
      setTeams(data);
    } catch (error) {
      console.error('Failed to load teams:', error);
    }
  };

  const loadTasks = async () => {
    if (!user) return;
    try {
      const filters: any = { userId: user.id };
      if (selectedTeamId) {
        filters.teamId = selectedTeamId;
      }
      const data = await getTasks(filters);
      setTasks(data);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: 'pending' | 'in-progress' | 'completed') => {
    try {
      await updateTaskStatus(taskId, newStatus);
      setTasks(tasks.map(task =>
        task.id === taskId ? { ...task, status: newStatus } : task
      ));
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const getPriorityBadge = (priority: string) => {
    const styles = {
      high: 'bg-red-50 text-red-700 ring-red-600/20',
      medium: 'bg-orange-50 text-orange-700 ring-orange-600/20',
      low: 'bg-blue-50 text-blue-700 ring-blue-600/20',
      default: 'bg-gray-50 text-gray-600 ring-gray-500/20'
    };
    const style = styles[priority as keyof typeof styles] || styles.default;

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ring-1 ring-inset ${style} capitalize`}>
        {priority || 'medium'}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
  };

  const filteredTasks = tasks.filter(task => {
    const matchesTab = task.status === activeTab;
    const matchesSearch = task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const TaskItem = ({ task }: { task: any }) => (
    <div className="group flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all duration-200 mb-3">
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-center gap-3 mb-2">
          <h3 className="text-lg font-semibold text-gray-900 truncate" title={task.title}>
            {task.title || 'Untitled Task'}
          </h3>
          {getPriorityBadge(task.priority)}
        </div>
        <p className="text-sm text-gray-600 line-clamp-2 mb-3 sm:mb-0">
          {task.description}
        </p>
      </div>

      <div className="flex items-center gap-6 flex-shrink-0 mt-3 sm:mt-0">
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <FiClock className="w-4 h-4" />
            <span>{formatDate(task.created_at)}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>Assigned by: {task.assignedByName || 'Unknown'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Edit/Delete buttons removed for workers */}

          {/* <div className="w-px h-6 bg-gray-200 mx-1" /> */}

          {task.status !== 'pending' && (
            <button
              onClick={() => handleStatusChange(task.id, 'pending')}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Move to To Do"
            >
              <FiCircle className="w-5 h-5" />
            </button>
          )}
          {task.status !== 'in-progress' && (
            <button
              onClick={() => handleStatusChange(task.id, 'in-progress')}
              className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
              title="Move to In Progress"
            >
              <FiClock className="w-5 h-5" />
            </button>
          )}
          {task.status !== 'completed' && (
            <button
              onClick={() => handleStatusChange(task.id, 'completed')}
              className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="Mark Complete"
            >
              <FiCheckCircle className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/50 font-sans flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 min-h-screen flex-shrink-0 hidden md:block">
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">My Joined Teams</h2>
          <nav className="space-y-2">
            <button
              onClick={() => setSelectedTeamId(null)}
              className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedTeamId === null
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
              All Tasks
            </button>
            {teams.map(team => (
              <button
                key={team.id}
                onClick={() => setSelectedTeamId(team.id)}
                className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedTeamId === team.id
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                {team.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="max-w-5xl mx-auto">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                {selectedTeamId
                  ? `${teams.find(t => t.id === selectedTeamId)?.name || 'Team'} Tasks`
                  : 'My Tasks'}
              </h1>
              <p className="text-gray-500 mt-1">
                {selectedTeamId
                  ? 'Tasks assigned to you in this team'
                  : 'Manage your daily workload efficiently'}
              </p>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full sm:w-64 pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              {[
                { id: 'pending', name: 'To Do', count: tasks.filter(t => t.status === 'pending').length },
                { id: 'in-progress', name: 'In Progress', count: tasks.filter(t => t.status === 'in-progress').length },
                { id: 'completed', name: 'Completed', count: tasks.filter(t => t.status === 'completed').length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors duration-200
                    ${activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                  `}
                >
                  {tab.name}
                  <span className={`
                    ml-2 py-0.5 px-2.5 rounded-full text-xs font-medium
                    ${activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}
                  `}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          {/* Task List */}
          <div className="space-y-2">
            {filteredTasks.length > 0 ? (
              filteredTasks.map(task => (
                <TaskItem key={task.id} task={task} />
              ))
            ) : (
              <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                <div className="mx-auto h-12 w-12 text-gray-400 flex items-center justify-center bg-gray-50 rounded-full mb-4">
                  <FiFilter className="h-6 w-6" />
                </div>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchQuery ? 'Try adjusting your search terms.' : `You have no ${activeTab.replace('-', ' ')} tasks.`}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default WorkersDashboard;
