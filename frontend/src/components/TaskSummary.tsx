// React import preserved for JSX but unused bindings trimmed by compiler
import { ExtractedTask } from '../api/apiClient';

interface TaskSummaryProps {
  tasks: ExtractedTask[];
}

function TaskSummary({ tasks }: TaskSummaryProps) {
  const total = tasks.length;
  const withDueDate = tasks.filter(t => t.dueDate).length;
  const withoutDueDate = total - withDueDate;
  const byAssignee: Record<string, number> = {};
  tasks.forEach(t => {
    const key = t.assignee || 'Unassigned';
    byAssignee[key] = (byAssignee[key] || 0) + 1;
  });
  const milestoneTasks = tasks.filter(t => t.assignee === 'Team' || /release|sprint|close/i.test(t.title));

  return (
    <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Task Summary</h3>
      <div className="grid sm:grid-cols-3 gap-4 text-sm">
        <div className="flex flex-col">
          <span className="text-gray-500">Total</span>
          <span className="font-medium">{total}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-gray-500">With Due Date</span>
          <span className="font-medium">{withDueDate}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-gray-500">Missing Due Date</span>
          <span className="font-medium">{withoutDueDate}</span>
        </div>
      </div>
      <div className="mt-4">
        <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Assignees</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(byAssignee).map(([name,count]) => (
            <span key={name} className="px-2 py-1 bg-white border border-gray-300 rounded text-xs">
              {name}: {count}
            </span>
          ))}
        </div>
      </div>
      {milestoneTasks.length > 0 && (
        <div className="mt-4">
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Milestones</p>
          <ul className="list-disc list-inside text-xs text-gray-700">
            {milestoneTasks.map((m,i) => (
              <li key={i}>{m.title}{m.dueDate ? ` (due ${new Date(m.dueDate).toLocaleDateString()})` : ''}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default TaskSummary;
