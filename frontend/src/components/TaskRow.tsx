
import { useState } from 'react';
import { ExtractedTask } from '../api/apiClient';
import { FiEdit2, FiTrash2, FiCheck, FiUser, FiFlag } from 'react-icons/fi';

interface TeamMember {
  id: string;
  username: string;
  full_name: string;
  role: string;
}

interface TaskRowProps {
  task: ExtractedTask;
  teamMembers?: TeamMember[];
  onUpdate: (task: ExtractedTask) => void;
  onRemove: () => void;
}

function TaskRow({ task, teamMembers = [], onUpdate, onRemove }: TaskRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState(task);

  const handleSave = () => {
    onUpdate(editedTask);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedTask(task);
    setIsEditing(false);
  };

  const priorityColors = {
    low: 'bg-blue-50 text-blue-700 border-blue-100',
    medium: 'bg-orange-50 text-orange-700 border-orange-100',
    high: 'bg-red-50 text-red-700 border-red-100',
  };

  // Find assignee name if ID is stored, or just use the string
  const getAssigneeDisplay = () => {
    if (!task.assignee) return <span className="text-gray-400 italic">Unassigned</span>;

    // If assignee matches a member ID, show their name
    const member = teamMembers.find(m => m.id === task.assignee || m.username === task.assignee || m.full_name === task.assignee);
    return member ? member.full_name : task.assignee;
  };

  if (isEditing) {
    return (
      <div className="p-4 bg-blue-50/50 border-l-4 border-blue-500 transition-all">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Title</label>
            <input
              type="text"
              value={editedTask.title}
              onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium text-gray-900 shadow-sm"
              placeholder="Task title"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Description</label>
            <textarea
              value={editedTask.description}
              onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-600 shadow-sm resize-y"
              rows={3}
              placeholder="Task description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Assignee</label>
              <select
                value={editedTask.matchedUser?.id || (teamMembers.find(m => m.id === editedTask.assignee)?.id) || ''}
                onChange={(e) => {
                  const selectedMemberId = e.target.value;
                  const member = teamMembers.find(m => m.id === selectedMemberId);
                  if (member) {
                    setEditedTask({
                      ...editedTask,
                      assignee: member.id,
                      matchedUser: {
                        id: member.id,
                        username: member.username,
                        full_name: member.full_name,
                        role: member.role
                      }
                    });
                  } else {
                    // Unassigned
                    setEditedTask({
                      ...editedTask,
                      assignee: '',
                      matchedUser: undefined
                    });
                  }
                }}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-700 shadow-sm"
              >
                <option value="">Unassigned</option>
                {teamMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.full_name} ({member.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Priority</label>
              <select
                value={editedTask.priority || 'medium'}
                onChange={(e) => setEditedTask({ ...editedTask, priority: e.target.value as any })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-700 shadow-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors flex items-center gap-1"
            >
              <FiCheck className="w-4 h-4" /> Save Changes
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <li className="group hover:bg-gray-50 transition-colors duration-150">
      <div className="p-4 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h4 className="text-base font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                {task.title}
              </h4>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${priorityColors[task.priority || 'medium']}`}>
                {task.priority || 'medium'}
              </span>
            </div>

            <p className="text-sm text-gray-500 line-clamp-2 mb-3">
              {task.description}
            </p>

            <div className="flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <FiUser className="w-3.5 h-3.5 text-gray-400" />
                <span className="font-medium text-gray-700">{getAssigneeDisplay()}</span>
              </div>
              {task.dueDate && (
                <div className="flex items-center gap-1.5">
                  <FiFlag className="w-3.5 h-3.5 text-gray-400" />
                  <span>Due {new Date(task.dueDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit Task"
            >
              <FiEdit2 className="w-4 h-4" />
            </button>
            <button
              onClick={onRemove}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Remove Task"
            >
              <FiTrash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

export default TaskRow;
