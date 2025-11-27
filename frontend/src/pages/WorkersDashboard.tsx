/**
 * WorkersDashboard.tsx
 * 
 * Purpose: Dashboard for developers, QA, and other team members
 * Features:
 * - View assigned tasks
 * - Mark tasks as complete
 * - See task details and deadlines
 */

import { useState } from 'react';
import { FiCheckCircle, FiCircle, FiClock, FiUser } from 'react-icons/fi';

interface Task {
  id: string;
  description: string;
  assignedBy: string;
  assignedAt: Date;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
}

const WorkersDashboard = () => {
  // Mock data - will be replaced with real data from Supabase
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      description: 'Update the database schema for user profiles',
      assignedBy: 'John (Manager)',
      assignedAt: new Date('2025-11-26T10:00:00'),
      status: 'pending',
      priority: 'high',
    },
    {
      id: '2',
      description: 'Review pull request for authentication module',
      assignedBy: 'Sarah (Team Lead)',
      assignedAt: new Date('2025-11-26T09:00:00'),
      status: 'in-progress',
      priority: 'medium',
    },
    {
      id: '3',
      description: 'Fix the login bug reported in issue #234',
      assignedBy: 'Mike (Tech Lead)',
      assignedAt: new Date('2025-11-25T14:00:00'),
      status: 'completed',
      priority: 'high',
    },
    {
      id: '4',
      description: 'Write unit tests for payment service',
      assignedBy: 'John (Manager)',
      assignedAt: new Date('2025-11-25T11:00:00'),
      status: 'pending',
      priority: 'low',
    },
  ]);

  const [filter, setFilter] = useState<'all' | 'pending' | 'in-progress' | 'completed'>('all');

  const handleStatusChange = (taskId: string, newStatus: Task['status']) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, status: newStatus } : task
    ));
  };

  const filteredTasks = filter === 'all' 
    ? tasks 
    : tasks.filter(task => task.status === filter);

  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const inProgressCount = tasks.filter(t => t.status === 'in-progress').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed': return <FiCheckCircle className="text-green-500 w-5 h-5" />;
      case 'in-progress': return <FiClock className="text-orange-500 w-5 h-5" />;
      case 'pending': return <FiCircle className="text-gray-400 w-5 h-5" />;
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            My Tasks
          </h1>
          <p className="text-gray-600">Track and manage your assigned work</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`p-4 rounded-xl shadow-lg transition-all ${
              filter === 'all' 
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' 
                : 'bg-white hover:shadow-xl text-gray-800'
            }`}
          >
            <div className="text-3xl font-bold">{tasks.length}</div>
            <div className="text-sm opacity-90">Total Tasks</div>
          </button>

          <button
            onClick={() => setFilter('pending')}
            className={`p-4 rounded-xl shadow-lg transition-all ${
              filter === 'pending' 
                ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white' 
                : 'bg-white hover:shadow-xl text-gray-800'
            }`}
          >
            <div className="text-3xl font-bold">{pendingCount}</div>
            <div className="text-sm opacity-90">Pending</div>
          </button>

          <button
            onClick={() => setFilter('in-progress')}
            className={`p-4 rounded-xl shadow-lg transition-all ${
              filter === 'in-progress' 
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white' 
                : 'bg-white hover:shadow-xl text-gray-800'
            }`}
          >
            <div className="text-3xl font-bold">{inProgressCount}</div>
            <div className="text-sm opacity-90">In Progress</div>
          </button>

          <button
            onClick={() => setFilter('completed')}
            className={`p-4 rounded-xl shadow-lg transition-all ${
              filter === 'completed' 
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' 
                : 'bg-white hover:shadow-xl text-gray-800'
            }`}
          >
            <div className="text-3xl font-bold">{completedCount}</div>
            <div className="text-sm opacity-90">Completed</div>
          </button>
        </div>

        {/* Tasks List */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            {filter === 'all' ? 'All Tasks' : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Tasks`}
          </h2>

          {filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <FiCheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No tasks found</p>
              <p className="text-gray-400 text-sm">You're all caught up! 🎉</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTasks.map(task => (
                <div 
                  key={task.id} 
                  className="p-5 border-2 border-gray-200 rounded-lg hover:border-purple-300 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      {getStatusIcon(task.status)}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className={`text-lg font-medium ${
                          task.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-800'
                        }`}>
                          {task.description}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(task.priority)}`}>
                          {task.priority.toUpperCase()}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                        <div className="flex items-center gap-1">
                          <FiUser className="w-4 h-4" />
                          <span>{task.assignedBy}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FiClock className="w-4 h-4" />
                          <span>{formatDate(task.assignedAt)}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStatusChange(task.id, 'pending')}
                          disabled={task.status === 'pending'}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            task.status === 'pending'
                              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Pending
                        </button>
                        <button
                          onClick={() => handleStatusChange(task.id, 'in-progress')}
                          disabled={task.status === 'in-progress'}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            task.status === 'in-progress'
                              ? 'bg-orange-500 text-white cursor-not-allowed'
                              : 'bg-orange-100 text-orange-700 hover:bg-orange-200 hover:scale-105'
                          }`}
                        >
                          In Progress
                        </button>
                        <button
                          onClick={() => handleStatusChange(task.id, 'completed')}
                          disabled={task.status === 'completed'}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                            task.status === 'completed'
                              ? 'bg-gradient-to-r from-green-500 to-green-600 text-white cursor-not-allowed'
                              : 'bg-green-100 text-green-700 hover:bg-gradient-to-r hover:from-green-500 hover:to-green-600 hover:text-white hover:scale-105'
                          }`}
                        >
                          {task.status === 'completed' && <FiCheckCircle className="w-4 h-4" />}
                          Mark Complete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkersDashboard;
