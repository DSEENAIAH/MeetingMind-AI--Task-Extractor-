
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FiUsers, FiCheckCircle, FiClock, FiSearch, FiUserPlus, FiTrash2, FiEdit2, FiRefreshCw } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import TeamTabs from '../components/TeamTabs';
import { getTasks, deleteTask, updateTask, restoreTask } from '../api/apiClient';
import EditTaskModal from '../components/EditTaskModal';
import ConfirmationModal from '../components/ConfirmationModal';
import PasteNotes from './PasteNotes';

interface TeamStats {
    team_id: string;
    team_name: string;
    member_count: number;
    total_tasks: number;
    completed_tasks: number;
    full_name: string;
    role: string;
    email?: string;
    pending_tasks: number;
}

interface Member {
    id: string;
    user_id: string;
    name: string;
    email: string;
    role: string;
    added_at: string;
}

interface SearchUser {
    id: string;
    full_name: string;
    email: string;
    username: string;
}

const TeamKanbanBoard = ({ teamId }: { teamId: string }) => {
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'pending' | 'in-progress' | 'completed' | 'deleted'>('pending');
    const [searchQuery, setSearchQuery] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<any>(null);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
    const [isPermanentDelete, setIsPermanentDelete] = useState(false);
    const [loadedDataMode, setLoadedDataMode] = useState<'active' | 'deleted' | null>(null);

    useEffect(() => {
        const isDeletedTab = activeTab === 'deleted';
        const requiredMode = isDeletedTab ? 'deleted' : 'active';

        // Only load if the data mode doesn't match what we need
        if (loadedDataMode !== requiredMode) {
            loadTasks(isDeletedTab);
        }
    }, [teamId, activeTab, loadedDataMode]);

    const loadTasks = async (isDeletedTab: boolean) => {
        setLoading(true);
        try {
            const data = await getTasks({
                teamId,
                deleted: isDeletedTab
            });
            setTasks(data);
            setLoadedDataMode(isDeletedTab ? 'deleted' : 'active');
        } catch (error) {
            console.error('Failed to load tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (taskId: string, permanent: boolean = false) => {
        setTaskToDelete(taskId);
        setIsPermanentDelete(permanent);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!taskToDelete) return;
        try {
            await deleteTask(taskToDelete, isPermanentDelete);
            // Remove from current view
            setTasks(tasks.filter(t => t.id !== taskToDelete));
        } catch (error) {
            console.error('Failed to delete task:', error);
        }
    };

    const handleRestore = async (taskId: string) => {
        try {
            await restoreTask(taskId);
            // Remove from deleted view
            setTasks(tasks.filter(t => t.id !== taskId));
        } catch (error) {
            console.error('Failed to restore task:', error);
        }
    };

    const handleEdit = (task: any) => {
        setEditingTask(task);
        setIsEditModalOpen(true);
    };

    const handleSaveTask = async (taskId: string, updates: any) => {
        try {
            await updateTask(taskId, updates);
            setTasks(tasks.map(t => (t.id === taskId ? { ...t, ...updates } : t)));
            setIsEditModalOpen(false);
            loadTasks(activeTab === 'deleted');
        } catch (error) {
            console.error('Failed to update task:', error);
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

    // Filter tasks based on active tab
    const filteredTasks = tasks.filter(task => {
        const matchesTab = activeTab === 'deleted' ? true : task.status === activeTab;
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
                    {activeTab === 'deleted' && (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-700">
                            Deleted
                        </span>
                    )}
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
                        <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-[10px]">
                            {(task.assignedByName || '?').charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate max-w-[100px]">{task.assignedByName || 'Unknown'}</span>
                    </div>
                </div>

                {activeTab !== 'deleted' ? (
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => handleEdit(task)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Task"
                        >
                            <FiEdit2 className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => handleDeleteClick(task.id, false)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Task"
                        >
                            <FiTrash2 className="w-5 h-5" />
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleRestore(task.id)}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Restore Task"
                        >
                            <FiRefreshCw className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => handleDeleteClick(task.id, true)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Permanently Delete"
                        >
                            <FiTrash2 className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="bg-gray-50/50 p-6 rounded-xl border border-gray-200/50">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiSearch className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full sm:w-64 pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 sm:text-sm transition duration-150 ease-in-out"
                        placeholder="Search team tasks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    {[
                        { id: 'pending', name: 'To Do', count: activeTab === 'pending' ? filteredTasks.length : undefined },
                        { id: 'in-progress', name: 'In Progress', count: activeTab === 'in-progress' ? filteredTasks.length : undefined },
                        { id: 'completed', name: 'Completed', count: activeTab === 'completed' ? filteredTasks.length : undefined },
                        { id: 'deleted', name: 'Deleted', count: activeTab === 'deleted' ? filteredTasks.length : undefined },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors duration-200
                  ${activeTab === tab.id
                                    ? 'border-orange-600 text-orange-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                `}
                        >
                            {tab.name}
                            {/* Only show count if we have the data for it, or if it's the active tab */}
                            {tab.id === activeTab && !loading && (
                                <span className={`
                      ml-2 py-0.5 px-2.5 rounded-full text-xs font-medium
                      ${activeTab === tab.id ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-600'}
                    `}>
                                    {filteredTasks.length}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Task List */}
            <div className="space-y-3 min-h-[200px]">
                {loading ? (
                    <div className="flex justify-center items-center h-40">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                    </div>
                ) : filteredTasks.length > 0 ? (
                    filteredTasks.map(task => (
                        <TaskItem key={task.id} task={task} />
                    ))
                ) : (
                    <div className="text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed">
                        <p className="text-gray-500">No tasks found in this section.</p>
                    </div>
                )}
            </div>

            <EditTaskModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                task={editingTask}
                onSave={handleSaveTask}
            />

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title={isPermanentDelete ? "Permanently Delete Task" : "Delete Task"}
                message={isPermanentDelete
                    ? "This action cannot be undone. The task will be permanently removed."
                    : "Are you sure you want to delete this task? It will be moved to the Deleted tab."}
                confirmText={isPermanentDelete ? "Permanently Delete" : "Delete"}
                type="danger"
            />
        </div>
    );
};

const TeamDashboard = () => {
    const { teamId } = useParams<{ teamId: string }>();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'extract' | 'tasks'>('dashboard');

    // Dashboard State
    const [stats, setStats] = useState<TeamStats | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);

    // Add Member Modal State
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
    const [searching, setSearching] = useState(false);
    const [adding, setAdding] = useState<string | null>(null);

    useEffect(() => {
        if (teamId && user) {
            fetchTeamData();
        }
    }, [teamId, user]); // Only fetch on mount or user/team change

    const fetchTeamData = async () => {
        try {
            setLoading(true);
            const headers = {
                'Authorization': 'Bearer mock-token',
                'x-user-id': user?.id || ''
            };

            const [statsRes, membersRes] = await Promise.all([
                fetch(`http://localhost:5000/api/teams/${teamId}/stats`, { headers }),
                fetch(`http://localhost:5000/api/teams/${teamId}/members`, { headers })
            ]);

            if (statsRes.ok) setStats(await statsRes.json());
            if (membersRes.ok) setMembers(await membersRes.json());

        } catch (error) {
            console.error('Error fetching team data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim() || searchQuery.length < 2) return;

        try {
            setSearching(true);
            const response = await fetch(`http://localhost:5000/api/users/search?query=${encodeURIComponent(searchQuery)}`);
            if (response.ok) {
                setSearchResults(await response.json());
            }
        } catch (error) {
            console.error('Error searching users:', error);
        } finally {
            setSearching(false);
        }
    };

    const handleAddMember = async (searchUser: SearchUser) => {
        if (!user || !teamId) return;

        try {
            setAdding(searchUser.id);
            const response = await fetch(`http://localhost:5000/api/teams/${teamId}/members`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer mock-token',
                    'x-user-id': user.id
                },
                body: JSON.stringify({ userId: searchUser.id })
            });

            if (response.ok) {
                fetchTeamData();
                setShowAddMemberModal(false);
                setSearchQuery('');
                setSearchResults([]);
            }
        } catch (error) {
            console.error('Error adding member:', error);
        } finally {
            setAdding(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">{stats?.team_name}</h1>
                <p className="text-gray-500">Manage your team, tasks, and members</p>
            </div>

            <TeamTabs activeTab={activeTab} onTabChange={setActiveTab} />

            <div className="mt-6">
                {activeTab === 'dashboard' && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Total Members</p>
                                        <p className="text-2xl font-bold text-gray-900">{stats?.member_count || 0}</p>
                                    </div>
                                    <div className="p-3 bg-blue-50 rounded-lg">
                                        <FiUsers className="w-6 h-6 text-blue-600" />
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Active Tasks</p>
                                        <p className="text-2xl font-bold text-gray-900">{stats?.pending_tasks || 0}</p>
                                    </div>
                                    <div className="p-3 bg-orange-50 rounded-lg">
                                        <FiClock className="w-6 h-6 text-orange-600" />
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Completed Tasks</p>
                                        <p className="text-2xl font-bold text-gray-900">{stats?.completed_tasks || 0}</p>
                                    </div>
                                    <div className="p-3 bg-green-50 rounded-lg">
                                        <FiCheckCircle className="w-6 h-6 text-green-600" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Team Members Section */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
                            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                                <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
                                <button
                                    onClick={() => setShowAddMemberModal(true)}
                                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                                >
                                    <FiUserPlus className="-ml-1 mr-2 h-5 w-5" />
                                    Add Member
                                </button>
                            </div>
                            <ul className="divide-y divide-gray-200">
                                {members.map((member) => (
                                    <li key={member.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-lg">
                                                {member.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="ml-4">
                                                <p className="text-sm font-medium text-gray-900">{member.name}</p>
                                                <p className="text-sm text-gray-500">{member.email}</p>
                                            </div>
                                        </div>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${member.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                                            }`}>
                                            {member.role}
                                        </span>
                                    </li>
                                ))}
                                {members.length === 0 && (
                                    <li className="p-6 text-center text-gray-500">No members found</li>
                                )}
                            </ul>
                        </div>

                        {/* Add Member Modal */}
                        {showAddMemberModal && (
                            <div className="fixed inset-0 z-50 overflow-y-auto">
                                <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                                    <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                                        <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setShowAddMemberModal(false)}></div>
                                    </div>
                                    <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                                    <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                                        <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                            <div className="sm:flex sm:items-start">
                                                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                                        Add Team Member
                                                    </h3>
                                                    <div className="mt-4">
                                                        <form onSubmit={handleSearch} className="flex gap-2">
                                                            <input
                                                                type="text"
                                                                className="shadow-sm focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                                                placeholder="Search by name or email"
                                                                value={searchQuery}
                                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                            />
                                                            <button
                                                                type="submit"
                                                                disabled={searching}
                                                                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
                                                            >
                                                                {searching ? '...' : 'Search'}
                                                            </button>
                                                        </form>

                                                        <div className="mt-4 max-h-60 overflow-y-auto space-y-2">
                                                            {searchResults.map(user => (
                                                                <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                                    <div>
                                                                        <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                                                                        <p className="text-xs text-gray-500">{user.email}</p>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => handleAddMember(user)}
                                                                        disabled={adding === user.id}
                                                                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-orange-700 bg-orange-100 hover:bg-orange-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
                                                                    >
                                                                        {adding === user.id ? 'Adding...' : 'Add'}
                                                                    </button>
                                                                </div>
                                                            ))}
                                                            {searchResults.length === 0 && searchQuery && !searching && (
                                                                <p className="text-sm text-gray-500 text-center">No users found</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                            <button
                                                type="button"
                                                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                                onClick={() => setShowAddMemberModal(false)}
                                            >
                                                Close
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'tasks' && teamId && (
                    <TeamKanbanBoard teamId={teamId} />
                )}

                {activeTab === 'extract' && (
                    <PasteNotes />
                )}
            </div>
        </div>
    );
};

export default TeamDashboard;
