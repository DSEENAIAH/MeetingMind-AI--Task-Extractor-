
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { FiUsers, FiCheckCircle, FiClock, FiSearch, FiUserPlus, FiTrash2, FiEdit2, FiRefreshCw, FiCheck, FiX, FiAlertCircle } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import TeamTabs from '../components/TeamTabs';
import { getTasks, deleteTask, updateTask, restoreTask, sendTeamInvitations, getTeamStats, searchUsers, removeTeamMember, getTeamMembers } from '../api/apiClient';
import { supabase } from '../lib/supabase';
import { ensureTeamHasData } from '../utils/sampleData';
import EditTaskModal from '../components/EditTaskModal';
import ConfirmationModal from '../components/ConfirmationModal';
import PasteNotes from './PasteNotes';

interface TeamStats {
    team_id?: string;
    team_name?: string;
    memberCount?: number;
    member_count?: number; // Keep both for compatibility
    total_tasks?: number;
    total?: number;
    completed_tasks?: number;
    completed?: number;
    pending_tasks?: number;
    pending?: number;
    inProgress?: number;
    full_name?: string;
    role?: string;
    email?: string;
}

interface Member {
    id: string;
    user_id: string;
    name: string;
    email?: string; // Made optional
    role: string;
    added_at: string;
    status?: 'active' | 'pending' | 'rejected' | 'accepted';
}

interface SearchUser {
    id: string;
    full_name: string;
    email?: string; // Made optional
    username: string;
}

const TeamKanbanBoard = ({ teamId, isAdmin, currentUserId, members }: { teamId: string, isAdmin: boolean, currentUserId?: string, members: Member[] }) => {
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = (searchParams.get('view') as 'pending' | 'in-progress' | 'completed' | 'deleted' | 'unassigned') || 'pending';

    const setActiveTab = (view: string) => {
        setSearchParams(prev => {
            const newParams = new URLSearchParams(prev);
            newParams.set('view', view);
            return newParams;
        });
    };
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

        // Real-time subscription for tasks in this team
        const channel = supabase
            .channel(`team-dashboard-tasks-${teamId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tasks',
                    filter: `team_id=eq.${teamId}`,
                },
                () => {
                    loadTasks(activeTab === 'deleted', true);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [teamId, activeTab, loadedDataMode]);

    const loadTasks = async (isDeletedTab: boolean, silent = false) => {
        if (!silent) setLoading(true);
        try {
            const filters: any = {
                teamId,
                deleted: isDeletedTab
            };

            // If not admin, only show tasks assigned to current user
            // if (!isAdmin && currentUserId) {
            //     filters.userId = currentUserId;
            // }

            const data = await getTasks(filters);
            setTasks(data);
            setLoadedDataMode(isDeletedTab ? 'deleted' : 'active');
        } catch (error) {
            console.error('Failed to load tasks:', error);
        } finally {
            if (!silent) setLoading(false);
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
            setIsDeleteModalOpen(false);
            setTaskToDelete(null);
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
            // Update local state
            setTasks(tasks.map(t => t.id === taskId ? { ...t, ...updates } : t));
            setIsEditModalOpen(false);
            setEditingTask(null);
        } catch (error) {
            console.error('Failed to update task:', error);
        }
    };

    const filteredTasks = tasks.filter(task => {
        if (activeTab === 'unassigned') {
            return !task.assigned_to;
        }
        if (activeTab === 'deleted') {
            return true; // Already filtered by API
        }
        return task.status === activeTab && task.assigned_to;
    }).filter(task =>
        task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.assigned_to_name?.toLowerCase().includes(searchQuery.toLowerCase())
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
                        { id: 'unassigned', name: 'Unassigned', count: activeTab === 'unassigned' ? filteredTasks.length : undefined },
                        { id: 'deleted', name: 'Deleted', count: activeTab === 'deleted' ? filteredTasks.length : undefined },
                    ].filter(tab => isAdmin || tab.id !== 'deleted').map((tab) => (
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
                        <div key={task.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex justify-between items-center group hover:shadow-md transition-shadow">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-sm font-medium text-gray-900">{task.description || 'Untitled Task'}</h3>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${task.priority === 'high' ? 'bg-red-100 text-red-800' :
                                        task.priority === 'medium' ? 'bg-orange-100 text-orange-800' :
                                            'bg-green-100 text-green-800'
                                        }`}>
                                        {task.priority || 'Medium'}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500">{task.description}</p>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className="text-xs text-gray-500 flex items-center gap-1 justify-end">
                                        <FiClock className="w-3 h-3" />
                                        {new Date(task.created_at).toLocaleDateString()}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        Assigned by: {task.assignedByName || 'Unknown'}
                                    </p>
                                </div>

                                {activeTab !== 'deleted' ? (
                                    isAdmin && activeTab === 'unassigned' ? (
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
                                            <select
                                                value={task.status}
                                                onChange={(e) => handleSaveTask(task.id, { status: e.target.value })}
                                                className="appearance-none bg-white border border-gray-300 text-gray-700 py-1 px-3 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 shadow-sm cursor-pointer hover:border-orange-400 transition-colors"
                                            >
                                                <option value="pending">To Do</option>
                                                <option value="in-progress">In Progress</option>
                                                <option value="completed">Completed</option>
                                            </select>
                                        </div>
                                    )
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
                members={members}
            />

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title={isPermanentDelete ? "Delete Task Permanently?" : "Move Task to Trash?"}
                message={isPermanentDelete
                    ? "This action cannot be undone. The task will be permanently removed."
                    : "The task will be moved to the trash. You can restore it later."}
                confirmText={isPermanentDelete ? "Delete Permanently" : "Move to Trash"}
                type="danger"
            />
        </div>
    );
};

const TeamDashboard = () => {
    const { teamId } = useParams<{ teamId: string }>();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = (searchParams.get('tab') as 'dashboard' | 'extract' | 'tasks') || 'dashboard';

    const setActiveTab = (tab: string) => {
        setSearchParams(prev => {
            const newParams = new URLSearchParams(prev);
            newParams.set('tab', tab);
            return newParams;
        });
    };

    // --- Team Data Logic ---
    const [stats, setStats] = useState<TeamStats | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);

    // Add Member Modal State
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [searchQueryUser, setSearchQueryUser] = useState('');
    const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<SearchUser[]>([]);
    const [sendingInvites, setSendingInvites] = useState(false);
    const { user } = useAuth();

    // Team Owner State
    const [teamOwnerId, setTeamOwnerId] = useState<string | null>(null);

    // Determine if current user is admin
    const currentUserMember = members.find(m => m.user_id === user?.id);

    // Normalize role to lowercase for comparison
    const userRole = currentUserMember?.role?.toLowerCase() || '';

    // Define explicit admin roles
    const ADMIN_ROLES = [
        'admin',
        'owner',
        'manager',
        'team lead',
        'team_lead',
        'product manager',
        'product_manager',
        'engineering manager',
        'engineer manager',
        'hr manager'
    ];

    // Check if user has an admin role (handling spaces vs underscores)
    const isRoleAdmin = ADMIN_ROLES.includes(userRole) || ADMIN_ROLES.includes(userRole.replace(/_/g, ' '));

    // Check if user is the team owner (creator)
    const isOwner = teamOwnerId && user?.id === teamOwnerId;

    const isAdmin = isRoleAdmin || isOwner;

    // Member Deletion State
    const [memberToDelete, setMemberToDelete] = useState<string | null>(null);
    const [isMemberDeleteModalOpen, setIsMemberDeleteModalOpen] = useState(false);

    useEffect(() => {
        if (teamId) {
            fetchTeamData();

            // Real-time subscription for team stats and members
            const channel = supabase
                .channel(`team-dashboard-data-${teamId}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'teams',
                        filter: `id=eq.${teamId}`,
                    },
                    () => {
                        fetchTeamData(true);
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'team_members',
                        filter: `team_id=eq.${teamId}`,
                    },
                    () => {
                        fetchTeamData(true);
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [teamId, user]);

    // Enforce tab restrictions for non-admins
    useEffect(() => {
        if (!loading && !isAdmin && activeTab !== 'tasks') {
            setActiveTab('tasks');
        }
    }, [isAdmin, loading, activeTab]);

    const fetchTeamData = async (silent = false) => {
        if (!teamId || !user) return;
        if (!silent) setLoading(true);
        try {
            // Fetch team owner directly
            const { data: teamData } = await supabase
                .from('teams')
                .select('created_by')
                .eq('id', teamId)
                .single();

            if (teamData) {
                setTeamOwnerId(teamData.created_by);
            }

            // Get team stats using client-side service
            const teamStats = await getTeamStats(teamId);
            setStats(teamStats);

            // Get team members using client-side service
            const teamMembers = await getTeamMembers(teamId);
            setMembers(teamMembers || []);

        } catch (error) {
            console.error('Error fetching team data:', error);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQueryUser.trim() || searchQueryUser.length < 2) return;

        try {
            setSearching(true);
            const users = await searchUsers(searchQueryUser);
            setSearchResults(users);
        } catch (error) {
            console.error('Error searching users:', error);
        } finally {
            setSearching(false);
        }
    };

    const handleDeleteMemberClick = (memberId: string) => {
        setMemberToDelete(memberId);
        setIsMemberDeleteModalOpen(true);
    };

    const confirmDeleteMember = async () => {
        if (!user || !teamId || !memberToDelete) return;

        try {
            await removeTeamMember(teamId, memberToDelete);
            fetchTeamData();
            setIsMemberDeleteModalOpen(false);
            setMemberToDelete(null);
        } catch (error) {
            console.error('Error removing member:', error);
            alert('Failed to remove member');
        }
    };

    const toggleUserSelection = (user: SearchUser) => {
        if (selectedUsers.some(u => u.id === user.id)) {
            setSelectedUsers(selectedUsers.filter(u => u.id !== user.id));
        } else {
            setSelectedUsers([...selectedUsers, user]);
        }
    };

    const handleSendInvitations = async () => {
        if (!user || !teamId || selectedUsers.length === 0) return;

        try {
            setSendingInvites(true);
            const userIds = selectedUsers.map(u => u.id);
            await sendTeamInvitations(teamId, userIds, user.id);

            fetchTeamData();
            setShowAddMemberModal(false);
            setSearchQueryUser('');
            setSearchResults([]);
            setSelectedUsers([]);
        } catch (error) {
            console.error('Error sending invitations:', error);
            alert('Failed to send invitations');
        } finally {
            setSendingInvites(false);
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
                {/* DEBUG INFO - TO BE REMOVED */}
                <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono text-gray-600">
                    DEBUG: Role="{userRole}" | IsAdmin={isAdmin.toString()} | IsOwner={isOwner?.toString()} | OwnerID={teamOwnerId} | UserID={user?.id}
                </div>
            </div>

            <TeamTabs activeTab={activeTab} onTabChange={setActiveTab} isAdmin={isAdmin} />

            <div className="mt-6">
                {activeTab === 'dashboard' && isAdmin && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Total Members</p>
                                        <p className="text-2xl font-bold text-gray-900">{stats?.memberCount || 0}</p>
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
                                        <p className="text-2xl font-bold text-gray-900">{(stats?.pending || 0) + (stats?.inProgress || 0)}</p>
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
                                        <p className="text-2xl font-bold text-gray-900">{stats?.completed || 0}</p>
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
                                {isAdmin && (
                                    <button
                                        onClick={() => setShowAddMemberModal(true)}
                                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                                    >
                                        <FiUserPlus className="-ml-1 mr-2 h-5 w-5" />
                                        Add Member
                                    </button>
                                )}
                            </div>
                            <ul className="divide-y divide-gray-200">
                                {members.map((member) => (
                                    <li key={member.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-lg">
                                                {(member.name || '?').charAt(0).toUpperCase()}
                                            </div>
                                            <div className="ml-4">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-medium text-gray-900">{member.name || 'Unknown User'}</p>
                                                    {member.status === 'pending' && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                                            Pending
                                                        </span>
                                                    )}
                                                    {member.status === 'accepted' && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                            Accepted
                                                        </span>
                                                    )}
                                                    {member.status === 'rejected' && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                                            Rejected
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-500">{member.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${member.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                                                }`}>
                                                {member.role}
                                            </span>
                                            {isAdmin && (
                                                <button
                                                    onClick={() => handleDeleteMemberClick(member.user_id)}
                                                    className="text-gray-400 hover:text-red-600 transition-colors p-2 rounded-full hover:bg-red-50"
                                                    title="Remove member"
                                                    aria-label="Remove member"
                                                >
                                                    <FiTrash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
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
                                                        Add Team Members
                                                    </h3>
                                                    <div className="mt-4">
                                                        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                                                            <input
                                                                type="text"
                                                                className="shadow-sm focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border text-gray-900 bg-white"
                                                                placeholder="Search by name or email"
                                                                value={searchQueryUser}
                                                                onChange={(e) => setSearchQueryUser(e.target.value)}
                                                            />
                                                            <button
                                                                type="submit"
                                                                disabled={searching}
                                                                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
                                                            >
                                                                {searching ? '...' : 'Search'}
                                                            </button>
                                                        </form>

                                                        {/* Selected Users Chips */}
                                                        {selectedUsers.length > 0 && (
                                                            <div className="flex flex-wrap gap-2 mb-4">
                                                                {selectedUsers.map(user => (
                                                                    <span key={user.id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                                                        {user.full_name}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => toggleUserSelection(user)}
                                                                            className="flex-shrink-0 ml-1.5 h-4 w-4 rounded-full inline-flex items-center justify-center text-orange-400 hover:bg-orange-200 hover:text-orange-500 focus:outline-none focus:bg-orange-500 focus:text-white"
                                                                        >
                                                                            <span className="sr-only">Remove {user.full_name}</span>
                                                                            <FiX className="h-3 w-3" />
                                                                        </button>
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}

                                                        <div className="max-h-60 overflow-y-auto space-y-2 border-t border-gray-100 pt-2">
                                                            {searchResults.map(user => {
                                                                const isSelected = selectedUsers.some(u => u.id === user.id);
                                                                const isAlreadyMember = members.some(m => m.user_id === user.id);

                                                                return (
                                                                    <div key={user.id} className={`flex items-center justify-between p-3 rounded-lg ${isSelected ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50'}`}>
                                                                        <div>
                                                                            <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                                                                            <p className="text-xs text-gray-500">{user.email}</p>
                                                                        </div>
                                                                        {isAlreadyMember ? (
                                                                            members.find(m => m.user_id === user.id)?.status === 'rejected' ? (
                                                                                <button
                                                                                    onClick={() => toggleUserSelection(user)}
                                                                                    className={`inline-flex items-center px-3 py-1 border text-xs font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 ${isSelected
                                                                                        ? 'border-orange-500 text-orange-700 bg-white hover:bg-orange-50'
                                                                                        : 'border-transparent text-orange-700 bg-orange-100 hover:bg-orange-200'
                                                                                        }`}
                                                                                >
                                                                                    {isSelected ? (
                                                                                        <>
                                                                                            <FiCheck className="mr-1 h-3 w-3" />
                                                                                            Re-invite
                                                                                        </>
                                                                                    ) : 'Re-invite'}
                                                                                </button>
                                                                            ) : (
                                                                                <span className="text-xs text-gray-400 font-medium px-3 py-1">Already Added</span>
                                                                            )
                                                                        ) : (
                                                                            <button
                                                                                onClick={() => toggleUserSelection(user)}
                                                                                className={`inline-flex items-center px-3 py-1 border text-xs font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 ${isSelected
                                                                                    ? 'border-orange-500 text-orange-700 bg-white hover:bg-orange-50'
                                                                                    : 'border-transparent text-orange-700 bg-orange-100 hover:bg-orange-200'
                                                                                    }`}
                                                                            >
                                                                                {isSelected ? (
                                                                                    <>
                                                                                        <FiCheck className="mr-1 h-3 w-3" />
                                                                                        Selected
                                                                                    </>
                                                                                ) : 'Select'}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                            {searchResults.length === 0 && searchQueryUser && !searching && (
                                                                <p className="text-sm text-gray-500 text-center py-4">No users found</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3">
                                            <button
                                                type="button"
                                                disabled={selectedUsers.length === 0 || sendingInvites}
                                                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-orange-600 text-base font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                onClick={handleSendInvitations}
                                            >
                                                {sendingInvites ? 'Sending...' : `Send Invitations (${selectedUsers.length})`}
                                            </button>
                                            <button
                                                type="button"
                                                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                                onClick={() => setShowAddMemberModal(false)}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'tasks' && teamId && (
                    <TeamKanbanBoard teamId={teamId} isAdmin={isAdmin} currentUserId={user?.id} members={members} />
                )}

                {activeTab === 'extract' && isAdmin && (
                    <PasteNotes />
                )}
            </div>

            {/* Member Delete Modal */}
            <ConfirmationModal
                isOpen={isMemberDeleteModalOpen}
                onClose={() => setIsMemberDeleteModalOpen(false)}
                onConfirm={confirmDeleteMember}
                title="Remove Team Member?"
                message="Are you sure you want to remove this member from the team? They will lose access to all team tasks."
                confirmText="Remove Member"
                type="danger"
            />
        </div>
    );
};

export default TeamDashboard;
