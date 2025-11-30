import React, { useState, useEffect, useRef } from 'react';
import { FiBell, FiCheck, FiX, FiInfo } from 'react-icons/fi';
import { getInvitations, acceptInvitation, rejectInvitation } from '../api/apiClient';
// import { useNavigate } from 'react-router-dom';

interface Invitation {
    id: string;
    team_id: string;
    team_name: string;
    invited_by_name: string;
    created_at: string;
}

const NotificationCenter = () => {
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    // const navigate = useNavigate();

    const fetchInvitations = async () => {
        try {
            // console.log('NotificationCenter: Fetching invitations...');
            const data = await getInvitations();
            // console.log('NotificationCenter: Fetched invitations:', data);
            setInvitations(data);
        } catch (error) {
            console.error('NotificationCenter: Failed to fetch invitations:', error);
        }
    };

    // Initial fetch and polling
    useEffect(() => {
        fetchInvitations();
        const interval = setInterval(fetchInvitations, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAccept = async (teamId: string) => {
        setLoading(true);
        try {
            await acceptInvitation(teamId);
            await fetchInvitations(); // Refresh list
            // Optional: Navigate to the new team or show success toast
            // navigate(`/teams/${teamId}/dashboard`); // Removed to stay on current page
            setIsOpen(false);
        } catch (error) {
            console.error('Failed to accept invitation:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async (teamId: string) => {
        setLoading(true);
        try {
            await rejectInvitation(teamId);
            await fetchInvitations(); // Refresh list
        } catch (error) {
            console.error('Failed to reject invitation:', error);
        } finally {
            setLoading(false);
        }
    };

    const unreadCount = invitations.length;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                aria-label="Notifications"
            >
                <FiBell className="h-6 w-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 block h-4 w-4 transform -translate-y-1/4 translate-x-1/4 rounded-full ring-2 ring-white bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                    <div className="py-1" role="menu" aria-orientation="vertical">
                        <div className="px-4 py-2 border-b border-gray-100">
                            <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                        </div>

                        {invitations.length === 0 ? (
                            <div className="px-4 py-6 text-center text-gray-500">
                                <FiInfo className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                                <p className="text-sm">No new notifications</p>
                            </div>
                        ) : (
                            <div className="max-h-96 overflow-y-auto">
                                {invitations.map((invitation) => (
                                    <div key={invitation.id} className="px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors">
                                        <div className="flex items-start">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900">
                                                    Team Invitation
                                                </p>
                                                <p className="text-sm text-gray-500 mt-0.5">
                                                    <span className="font-medium text-gray-700">{invitation.invited_by_name}</span> invited you to join <span className="font-medium text-gray-700">{invitation.team_name}</span>
                                                </p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {new Date(invitation.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-3 flex gap-2">
                                            <button
                                                onClick={() => handleAccept(invitation.team_id)}
                                                disabled={loading}
                                                className="flex-1 inline-flex justify-center items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
                                            >
                                                <FiCheck className="mr-1.5 h-3 w-3" />
                                                Accept
                                            </button>
                                            <button
                                                onClick={() => handleReject(invitation.team_id)}
                                                disabled={loading}
                                                className="flex-1 inline-flex justify-center items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
                                            >
                                                <FiX className="mr-1.5 h-3 w-3" />
                                                Decline
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationCenter;
