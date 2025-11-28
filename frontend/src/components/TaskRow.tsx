/**
 * TaskRow.tsx
 * 
 * Purpose: Individual task component for preview/editing.
 * 
 * Features:
 * - Inline editing of task fields (title, description, priority, assignee)
 * - Remove button to delete tasks from preview
 * - Clean, accessible UI with proper ARIA labels
 * - Priority badge with color coding
 * 
 * Design decisions:
 * - Keep editing simple: click to edit, blur to save
 * - Visual feedback for required fields
 * - Confirmation before removal (via button color/icon)
 */

import { useState } from 'react';
import { ExtractedTask } from '../api/apiClient';

interface TeamMember {
  id: string;
  username: string;
  full_name: string;
  role: string;
}

interface TaskRowProps {
  task: ExtractedTask;
  teamMembers?: TeamMember[];
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  onUpdate: (task: ExtractedTask) => void;
  onRemove: () => void;
}

function TaskRow({ task, teamMembers = [], selected = false, onSelect, onUpdate, onRemove }: TaskRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState(task);

  const handleSave = () => {
    onUpdate(editedTask);
    setIsEditing(false);
  };

  const priorityColors = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800',
  };

  // Find assignee name if ID is stored, or just use the string
  const getAssigneeDisplay = () => {
    if (!task.assignee) return null;
    // If assignee matches a member ID, show their name
    const member = teamMembers.find(m => m.id === task.assignee || m.username === task.assignee || m.full_name === task.assignee);
    return member ? member.full_name : task.assignee;
  };

  return (
    <div
      className={`p-6 transition-all border-l-4 ${selected ? 'bg-blue-50 border-blue-500' : 'bg-white hover:bg-gray-50 border-transparent hover:border-gray-200'
        }`}
      data-testid="task-row"
    >
      <div className="flex items-start gap-4">
        {/* Checkbox */}
        <div className="pt-1">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect && onSelect(e.target.checked)}
            className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
          />
        </div>

        <div className="flex-1 min-w-0">
          {/* Title */}
          {isEditing ? (
            <input
              type="text"
              value={editedTask.title}
              onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 font-medium"
              placeholder="Task title"
              aria-label="Task title"
            />
          ) : (
            <h4 className="text-lg font-medium text-gray-900 mb-2">{task.title}</h4>
          )}

          {/* Description */}
          {isEditing ? (
            <textarea
              value={editedTask.description}
              onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
              className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Task description"
              aria-label="Task description"
            />
          ) : (
            <p className="text-sm text-gray-600 mb-3">{task.description}</p>
          )}

          {/* Metadata: Priority, Assignee, Due Date */}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {/* Priority */}
            {isEditing ? (
              <select
                value={editedTask.priority || 'medium'}
                onChange={(e) =>
                  setEditedTask({
                    ...editedTask,
                    priority: e.target.value as 'low' | 'medium' | 'high',
                  })
                }
                className="px-3 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                aria-label="Task priority"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            ) : (
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColors[task.priority || 'medium']
                  }`}
              >
                {(task.priority || 'medium').toUpperCase()}
              </span>
            )}

            {/* Assignee */}
            {isEditing ? (
              teamMembers.length > 0 ? (
                <select
                  value={editedTask.assignee || ''}
                  onChange={(e) => setEditedTask({ ...editedTask, assignee: e.target.value })}
                  className="px-3 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  aria-label="Task assignee"
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.full_name} (@{member.username})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={editedTask.assignee || ''}
                  onChange={(e) => setEditedTask({ ...editedTask, assignee: e.target.value })}
                  className="px-3 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="Assignee (optional)"
                  aria-label="Task assignee"
                />
              )
            ) : (
              (task.matchedUser || task.assignee) && (
                <span className={`inline-flex items-center ${!task.matchedUser && teamMembers.length > 0 && !teamMembers.find(m => m.id === task.assignee || m.username === task.assignee || m.full_name === task.assignee)
                  ? 'text-red-600 bg-red-50 px-2 py-0.5 rounded'
                  : 'text-gray-600'
                  }`}>
                  {task.matchedUser ? (
                    <div className="flex items-center">
                      <div className="flex items-center gap-1.5 mr-1">
                        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-700">
                          {task.matchedUser.full_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">{task.matchedUser.full_name}</span>
                      </div>

                      {/* Check if matched user is in the team */}
                      {teamMembers.length > 0 && !teamMembers.some(m => m.id === task.matchedUser?.id) && (
                        <div className="flex items-center ml-2 text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-xs">
                          <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span className="font-medium">Not in team</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      {getAssigneeDisplay()}
                    </>
                  )}

                  {!task.matchedUser && teamMembers.length > 0 && !teamMembers.find(m => m.id === task.assignee || m.username === task.assignee || m.full_name === task.assignee) && (
                    <span className="ml-1 text-xs font-bold" title="User not in team">(?)</span>
                  )}
                </span>
              )
            )}

            {/* Due Date */}
            {isEditing ? (
              <input
                type="date"
                value={editedTask.dueDate || ''}
                onChange={(e) => setEditedTask({ ...editedTask, dueDate: e.target.value })}
                className="px-3 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                aria-label="Task due date"
              />
            ) : (
              task.dueDate && (
                <span className="inline-flex items-center text-gray-600">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  {new Date(task.dueDate).toLocaleDateString()}
                </span>
              )
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="ml-4 flex items-center space-x-2">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={handleSave}
                className="p-2 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                aria-label="Save task"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditedTask(task);
                  setIsEditing(false);
                }}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                aria-label="Cancel editing"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                aria-label="Edit task"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={onRemove}
                className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                aria-label="Remove task"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
              ```
              className="px-3 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              aria-label="Task priority"
              >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
          ) : (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColors[task.priority || 'medium']
              }`}
          >
            {(task.priority || 'medium').toUpperCase()}
          </span>
            )}

          {/* Assignee */}
          {isEditing ? (
            teamMembers.length > 0 ? (
              <select
                value={editedTask.assignee || ''}
                onChange={(e) => setEditedTask({ ...editedTask, assignee: e.target.value })}
                className="px-3 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                aria-label="Task assignee"
              >
                <option value="">Unassigned</option>
                {teamMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.full_name} (@{member.username})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={editedTask.assignee || ''}
                onChange={(e) => setEditedTask({ ...editedTask, assignee: e.target.value })}
                className="px-3 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="Assignee (optional)"
                aria-label="Task assignee"
              />
            )
          ) : (
            (task.matchedUser || task.assignee) && (
              <span className={`inline-flex items-center ${!task.matchedUser && teamMembers.length > 0 && !teamMembers.find(m => m.id === task.assignee || m.username === task.assignee || m.full_name === task.assignee)
                ? 'text-red-600 bg-red-50 px-2 py-0.5 rounded'
                : 'text-gray-600'
                }`}>
                {task.matchedUser ? (
                  <div className="flex items-center">
                    <div className="flex items-center gap-1.5 mr-1">
                      <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-700">
                        {task.matchedUser.full_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900">{task.matchedUser.full_name}</span>
                    </div>

                    {/* Check if matched user is in the team */}
                    {teamMembers.length > 0 && !teamMembers.some(m => m.id === task.matchedUser?.id) && (
                      <div className="flex items-center ml-2 text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-xs">
                        <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="font-medium">Not in team</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    {getAssigneeDisplay()}
                  </>
                )}

                {!task.matchedUser && teamMembers.length > 0 && !teamMembers.find(m => m.id === task.assignee || m.username === task.assignee || m.full_name === task.assignee) && (
                  <span className="ml-1 text-xs font-bold" title="User not in team">(?)</span>
                )}
              </span>
            )
          )}

          {/* Due Date */}
          {isEditing ? (
            <input
              type="date"
              value={editedTask.dueDate || ''}
              onChange={(e) => setEditedTask({ ...editedTask, dueDate: e.target.value })}
              className="px-3 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              aria-label="Task due date"
            />
          ) : (
            task.dueDate && (
              <span className="inline-flex items-center text-gray-600">
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                {new Date(task.dueDate).toLocaleDateString()}
              </span>
            )
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="ml-4 flex items-center space-x-2">
        {isEditing ? (
          <>
            <button
              type="button"
              onClick={handleSave}
              className="p-2 text-green-600 hover:bg-green-50 rounded-md transition-colors"
              aria-label="Save task"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => {
                setEditedTask(task);
                setIsEditing(false);
              }}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              aria-label="Cancel editing"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              aria-label="Edit task"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
              aria-label="Remove task"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
    </div >
  );
}

export default TaskRow;
```
