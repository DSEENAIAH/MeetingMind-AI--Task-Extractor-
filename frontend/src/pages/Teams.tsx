
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiUsers, FiArrowRight, FiTrash2 } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { getTeams, createTeam } from '../api/apiClient';
import { supabase } from '../lib/supabase';
import ConfirmationModal from '../components/ConfirmationModal';

interface Team {
    id: string;
    name: string;
    created_by: string;
    created_at: string;
    member_count: number;
}

const OFFICIAL_ROLES = [
    'ceo', 'cto', 'vp_engineering', 'director',
    'engineering_manager', 'product_manager', 'team_lead', 'hr_manager', 'manager'
];

const Teams = () => {
    const { user } = useAuth();
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTeamName, setNewTeamName] = useState('');
    const [creating, setCreating] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; teamId: string | null }>({
        isOpen: false,
        teamId: null
    });

    const isOfficial = user?.user_metadata?.role && OFFICIAL_ROLES.includes(user.user_metadata.role);

    useEffect(() => {
        fetchTeams();
    }, [user]);

    const fetchTeams = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const data = await getTeams(user.id);
            setTeams(data);
        } catch (error) {
            console.error('Error fetching teams:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTeamName.trim() || !user) return;

        try {
            setCreating(true);
            const newTeam = await createTeam(newTeamName, user.id);
            setTeams([...teams, newTeam]);
            setNewTeamName('');
            setShowCreateModal(false);
            // Optional: Navigate to the new team dashboard immediately
            // navigate(`/teams/${newTeam.id}/dashboard`);
        } catch (error) {
            console.error('Error creating team:', error);
            alert('Error creating team');
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteClick = (e: React.MouseEvent, teamId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setDeleteConfirmation({ isOpen: true, teamId });
    };

    const handleConfirmDelete = async () => {
        const teamId = deleteConfirmation.teamId;
        if (!teamId || !user) return;

        try {
            // Delete team using Supabase directly
            const { error } = await supabase
                .from('teams')
                .delete()
                .eq('id', teamId)
                .eq('created_by', user.id); // Only allow creator to delete

            if (error) {
                console.error('Error deleting team:', error);
                alert('Failed to delete team');
            } else {
                setTeams(teams.filter(t => t.id !== teamId));
            }
        } catch (error) {
            console.error('Error deleting team:', error);
            alert('Error deleting team');
        } finally {
            setDeleteConfirmation({ isOpen: false, teamId: null });
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Your Teams</h1>
                    <p className="mt-1 text-sm text-gray-500">Manage your teams and assignments</p>
                </div>
            </div>
            {isOfficial && (
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                    <FiPlus className="-ml-1 mr-2 h-5 w-5" />
                    Create New Team
                </button>
            )}

            {
                loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                    </div>
                ) : teams.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
                        <FiUsers className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No teams yet</h3>
                        <p className="mt-1 text-sm text-gray-500">Get started by creating a new team.</p>
                        {isOfficial && (
                            <div className="mt-6">
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                                >
                                    <FiPlus className="-ml-1 mr-2 h-5 w-5" />
                                    Create Team
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {teams.map((team) => (
                            <Link
                                key={team.id}
                                to={`/teams/${team.id}/dashboard`}
                                className="group block bg-white overflow-hidden shadow-sm rounded-xl hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-orange-200"
                            >
                                <div className="p-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 bg-gradient-to-br from-orange-100 to-orange-50 rounded-lg p-3 group-hover:from-orange-200 group-hover:to-orange-100 transition-colors">
                                                <FiUsers className="h-6 w-6 text-orange-600" />
                                            </div>
                                            <div className="ml-4">
                                                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">{team.name}</h3>
                                                <div className="flex items-center mt-2 text-sm text-gray-500">
                                                    <span className="flex items-center bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                                        <FiUsers className="mr-1.5 h-3 w-3" />
                                                        {team.member_count} {team.member_count === 1 ? 'Member' : 'Members'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center ml-4">
                                            {/* Only show delete button if user is creator */}
                                            {user && team.created_by === user.id && (
                                                <button
                                                    onClick={(e) => handleDeleteClick(e, team.id)}
                                                    className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-full hover:bg-red-50 opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                    title="Delete Team"
                                                >
                                                    <FiTrash2 className="h-5 w-5" />
                                                </button>
                                            )}
                                            <FiArrowRight className="h-5 w-5 text-gray-300 group-hover:text-orange-500 transition-colors transform group-hover:translate-x-1" />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )
            }

            {/* Create Team Modal */}
            {
                showCreateModal && (
                    <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowCreateModal(false)}></div>
                            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                                <form onSubmit={handleCreateTeam}>
                                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                        <div className="sm:flex sm:items-start">
                                            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 sm:mx-0 sm:h-10 sm:w-10">
                                                <FiPlus className="h-6 w-6 text-orange-600" />
                                            </div>
                                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                                    Create New Team
                                                </h3>
                                                <div className="mt-2">
                                                    <input
                                                        type="text"
                                                        required
                                                        className="shadow-sm focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border text-gray-900 bg-white"
                                                        placeholder="Team Name (e.g. Engineering)"
                                                        value={newTeamName}
                                                        onChange={(e) => setNewTeamName(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                        <button
                                            type="submit"
                                            disabled={creating}
                                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-orange-600 text-base font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                                        >
                                            {creating ? 'Creating...' : 'Create'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowCreateModal(false)}
                                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={deleteConfirmation.isOpen}
                onClose={() => setDeleteConfirmation({ isOpen: false, teamId: null })}
                onConfirm={handleConfirmDelete}
                title="Delete Team"
                message="Are you sure you want to delete this team? This action cannot be undone and will remove all team data."
                confirmText="Delete Team"
                cancelText="Cancel"
                type="danger"
            />
        </div >
    );
};

export default Teams;
