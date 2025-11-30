
import { ExtractedTask } from '../api/apiClient';
import { FiCheckCircle, FiCalendar, FiAlertCircle, FiUser } from 'react-icons/fi';

interface TaskSummaryProps {
  tasks: ExtractedTask[];
}

function TaskSummary({ tasks }: TaskSummaryProps) {
  const total = tasks.length;
  const withDueDate = tasks.filter(t => t.dueDate).length;
  const withoutDueDate = total - withDueDate;

  // Calculate assignee stats
  const byAssignee: Record<string, number> = {};
  let unassignedCount = 0;

  tasks.forEach(t => {
    if (!t.assignee) {
      unassignedCount++;
    } else {
      byAssignee[t.assignee] = (byAssignee[t.assignee] || 0) + 1;
    }
  });

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">

        {/* Key Stats */}
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <FiCheckCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Tasks</p>
              <p className="text-2xl font-bold text-gray-900">{total}</p>
            </div>
          </div>

          <div className="w-px h-10 bg-gray-100 hidden md:block"></div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <FiCalendar className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Scheduled</p>
              <p className="text-2xl font-bold text-gray-900">{withDueDate}</p>
            </div>
          </div>

          {withoutDueDate > 0 && (
            <>
              <div className="w-px h-10 bg-gray-100 hidden md:block"></div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-50 rounded-lg">
                  <FiAlertCircle className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">No Due Date</p>
                  <p className="text-2xl font-bold text-gray-900">{withoutDueDate}</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Assignee Distribution */}
        <div className="flex-1 md:border-l md:border-gray-100 md:pl-8">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Assignment Status</p>
          <div className="flex flex-wrap gap-2">
            {unassignedCount > 0 && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                Unassigned: {unassignedCount}
              </div>
            )}
            {Object.entries(byAssignee).map(([name, count]) => (
              <div key={name} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium border border-blue-100">
                <FiUser className="w-3 h-3" />
                {name}: {count}
              </div>
            ))}
            {total === 0 && (
              <span className="text-sm text-gray-400 italic">No tasks extracted yet</span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default TaskSummary;
