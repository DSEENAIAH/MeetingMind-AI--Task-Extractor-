/**
 * OfficialsDashboard.tsx
 * 
 * Purpose: Dashboard for managers, team leads, HR, and other officials
 * Features:
 * - Create and manage teams (Real Supabase DB)
 * - Paste meeting transcripts
 * - Extract and assign tasks (Real AI)
 * - Only assign tasks to team members
 */

import { useState, useEffect } from 'react';
import { FiUsers, FiFileText, FiPlus, FiX, FiUserPlus, FiAlertCircle, FiSearch, FiUser } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import {
  getTeams,
  createTeam,
  addTeamMember,
  removeTeamMember,
  searchUsers,
  extractTasks,
  createTasks,
  getTasks,
  getTeamStats,
  type Team,
  type UserProfile,
  type ExtractedTask
} from '../api/apiClient';
import { supabase } from '../lib/supabase';

const OfficialsDashboard = () => {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searchUsername, setSearchUsername] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  const [transcript, setTranscript] = useState('');
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTask[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedTeamForTranscript, setSelectedTeamForTranscript] = useState<string | null>(null);
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [teamStats, setTeamStats] = useState<any>(null);
  const [teamTasks, setTeamTasks] = useState<any[]>([]);
  const [tasksTab, setTasksTab] = useState<'all' | 'unassigned' | 'assigned'>('all');

  // Fetch user's teams on load
  useEffect(() => {
    if (!user) return;
    loadTeams();

    // Real-time subscriptions
    const channel = supabase
      .channel('officials-dashboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teams',
          filter: `created_by=eq.${user.id}`,
        },
        () => {
          loadTeams();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_members',
        },
        () => {
          loadTeams();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        (payload) => {
          // If the task change relates to the currently selected team, reload stats
          if (selectedTeam) {
            // We can't easily check if the task belongs to the selected team from the payload alone 
            // without a join or checking the team_id if it's in the payload.
            // Assuming payload.new or payload.old has team_id.
            const newTeamId = (payload.new as any)?.team_id;
            const oldTeamId = (payload.old as any)?.team_id;

            if (newTeamId === selectedTeam || oldTeamId === selectedTeam) {
              // console.log('Tasks updated for selected team, reloading stats...');
              loadTeamStats(selectedTeam);
              loadTeamTasks(selectedTeam);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedTeam]); // Re-subscribe when selectedTeam changes to ensure closure captures it? 
  // Actually, better to use a ref for selectedTeam or just reload stats if we can. 
  // But putting selectedTeam in dependency array means we unsubscribe/resubscribe on every selection change.
  // That's fine for now.

  const loadTeams = async () => {
    if (!user) return;
    try {
      const data = await getTeams(user.id);
      setTeams(data);
    } catch (error) {
      console.error('Failed to load teams:', error);
    }
  };

  // Search users when typing
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchUsername.trim().length >= 2) {
        setIsSearching(true);
        try {
          const results = await searchUsers(searchUsername);
          setSearchResults(results);
        } catch (error) {
          console.error('Search failed:', error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchUsername]);

  const handleTeamClick = (teamId: string) => {
    setSelectedTeam(teamId);
    setSelectedTeamForTranscript(teamId);
    loadTeamStats(teamId);
    loadTeamTasks(teamId);
    // Smooth scroll to transcript area
    setTimeout(() => {
      document.getElementById('transcript-area')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const loadTeamStats = async (teamId: string) => {
    try {
      const stats = await getTeamStats(teamId);
      setTeamStats(stats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadTeamTasks = async (teamId: string) => {
    try {
      const data = await getTasks({ teamId });
      setTeamTasks(data);
    } catch (error) {
      console.error('Failed to load team tasks:', error);
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim() || !user || isCreatingTeam) return;

    setIsCreatingTeam(true);
    try {
      const newTeam = await createTeam(newTeamName, user.id);
      setTeams([newTeam, ...teams]); // Add to top
      setNewTeamName('');
      setShowCreateTeam(false);
      handleTeamClick(newTeam.id);
    } catch (error) {
      alert('Failed to create team. Please try again.');
    } finally {
      setIsCreatingTeam(false);
    }
  };

  const handleAddMember = async (userId: string) => {
    if (!selectedTeam || !user) return;

    // Check if user is already a member
    const team = teams.find(t => t.id === selectedTeam);
    if (team?.members.some(m => m.user_id === userId)) {
      alert('User is already a team member');
      return;
    }

    try {
      const newMember = await addTeamMember(selectedTeam, userId, user.id);

      // Update local state
      setTeams(teams.map(t =>
        t.id === selectedTeam
          ? { ...t, members: [...t.members, newMember] }
          : t
      ));
      setSearchUsername('');
      setSearchResults([]);
    } catch (error) {
      alert('Failed to add member.');
    }
  };

  const handleRemoveMember = async (teamId: string, userId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      await removeTeamMember(teamId, userId);

      setTeams(teams.map(team =>
        team.id === teamId
          ? { ...team, members: team.members.filter(m => m.user_id !== userId) }
          : team
      ));
    } catch (error) {
      alert('Failed to remove member.');
    }
  };

  const handleProcessTranscript = async () => {
    if (!transcript.trim() || !selectedTeamForTranscript) return;

    setIsProcessing(true);
    try {
      const response = await extractTasks(transcript);
      setExtractedTasks(response.tasks);
    } catch (error) {
      console.error('Extraction failed:', error);
      alert('Failed to extract tasks. Please check your backend connection.');
    } finally {
      setIsProcessing(false);
    }
  };



  const handleSaveTasks = async () => {
    if (!selectedTeamForTranscript || !user) return;

    setIsAssigning(true);
    try {
      await createTasks(extractedTasks, selectedTeamForTranscript, user.id);
      alert('Tasks assigned successfully!');
      setExtractedTasks([]);
      setTranscript('');
      setExtractedTasks([]);
      setTranscript('');
      loadTeamStats(selectedTeamForTranscript); // Refresh stats
      loadTeamTasks(selectedTeamForTranscript); // Refresh tasks
    } catch (error) {
      console.error('Failed to assign tasks:', error);
      alert('Failed to assign tasks. Please try again.');
    } finally {
      setIsAssigning(false);
    }
  };

  const currentTeam = teams.find(t => t.id === selectedTeam);
  const currentTeamForTranscript = teams.find(t => t.id === selectedTeamForTranscript);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Officials Dashboard
          </h1>
          <p className="text-gray-600">Select a team to manage members or extract tasks from meetings.</p>
        </div>

        {/* Teams Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <FiUsers className="text-orange-500" />
              Your Teams
            </h2>
            <button
              onClick={() => setShowCreateTeam(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors shadow-sm"
            >
              <FiPlus />
              New Team
            </button>
          </div>

          {/* Create Team Modal */}
          {showCreateTeam && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Create New Team</h3>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="Enter team name (e.g. 'Frontend Squad')"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-orange-500 outline-none"
                  autoFocus
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleCreateTeam}
                    disabled={!newTeamName.trim() || isCreatingTeam}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {isCreatingTeam ? 'Creating...' : 'Create Team'}
                  </button>
                  <button
                    onClick={() => setShowCreateTeam(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Teams Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* Create Team Card (if no teams) */}
            {teams.length === 0 && !showCreateTeam && (
              <button
                onClick={() => setShowCreateTeam(true)}
                className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all group h-48"
              >
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <FiPlus className="w-6 h-6 text-orange-500" />
                </div>
                <span className="font-medium text-gray-600 group-hover:text-orange-600">Create Your First Team</span>
              </button>
            )}

            {/* Team Cards */}
            {teams.map(team => (
              <button
                key={team.id}
                onClick={() => handleTeamClick(team.id)}
                className={`relative p-6 rounded-xl border-2 text-left transition-all h-48 flex flex-col justify-between group ${selectedTeam === team.id
                  ? 'border-orange-500 bg-white shadow-lg ring-4 ring-orange-500/10'
                  : 'border-gray-200 bg-white hover:border-orange-300 hover:shadow-md'
                  }`}
              >
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-orange-600 transition-colors">
                    {team.name}
                  </h3>
                  <p className="text-sm text-gray-500">Created by you</p>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">
                    <FiUsers className="w-4 h-4" />
                    <span>{team.members?.length || 0} members</span>
                  </div>
                  {selectedTeam === team.id && (
                    <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-sm">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Team Content */}
        {selectedTeam && currentTeam && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Team Stats Section */}
            {teamStats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                  <div className="text-sm text-gray-500">Total Tasks</div>
                  <div className="text-2xl font-bold text-gray-900">{teamStats.total}</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                  <div className="text-sm text-gray-500">Pending</div>
                  <div className="text-2xl font-bold text-orange-600">{teamStats.pending}</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                  <div className="text-sm text-gray-500">In Progress</div>
                  <div className="text-2xl font-bold text-blue-600">{teamStats.inProgress}</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                  <div className="text-sm text-gray-500">Completed</div>
                  <div className="text-2xl font-bold text-green-600">{teamStats.completed}</div>
                </div>
              </div>
            )}

            {/* Team Members Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Team Members</h3>
                  <p className="text-sm text-gray-500">Manage who can be assigned tasks in {currentTeam.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={searchUsername}
                      onChange={(e) => setSearchUsername(e.target.value)}
                      placeholder="Search users to add..."
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm w-64"
                    />
                    {/* Search Dropdown */}
                    {searchUsername && (
                      <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 max-h-60 overflow-y-auto z-20">
                        {isSearching ? (
                          <div className="p-3 text-center text-gray-500 text-sm">Searching...</div>
                        ) : searchResults.length > 0 ? (
                          searchResults.map(user => {
                            const isMember = currentTeam.members.some(m => m.user_id === user.id);
                            return (
                              <button
                                key={user.id}
                                onClick={() => !isMember && handleAddMember(user.id)}
                                disabled={isMember}
                                className={`w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center justify-between ${isMember ? 'opacity-50 cursor-not-allowed' : ''
                                  }`}
                              >
                                <div>
                                  <div className="font-medium text-sm">@{user.username}</div>
                                  <div className="text-xs text-gray-500">{user.full_name}</div>
                                </div>
                                {isMember ? (
                                  <span className="text-xs text-green-600">Added</span>
                                ) : (
                                  <FiPlus className="text-gray-400" />
                                )}
                              </button>
                            );
                          })
                        ) : (
                          <div className="p-3 text-center text-gray-500 text-sm">No users found</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6">
                {currentTeam.members.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <FiUserPlus className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p>No members yet. Search above to add people!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {currentTeam.members.map(member => (
                      <div key={member.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-orange-200 transition-colors shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-red-100 rounded-full flex items-center justify-center text-orange-600 font-bold">
                            {(member.name || member.username || '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{member.name}</div>
                            <div className="text-xs text-gray-500">{member.role}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveMember(currentTeam.id, member.user_id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove member"
                        >
                          <FiX />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Transcript Section */}
            <div id="transcript-area" className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="p-6 bg-gradient-to-r from-gray-900 to-gray-800 text-white flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <FiFileText className="text-orange-400" />
                    Extract Tasks
                  </h2>
                  <p className="text-gray-400 text-sm mt-1">Paste meeting notes to extract tasks for {currentTeam.name}</p>
                </div>
              </div>

              <div className="p-6">
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder={`Paste meeting transcript here...

Example:
@john needs to update the database schema by Friday
@sarah will review the pull request
@mike should fix the login bug`}
                  className="w-full h-64 px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none resize-y font-mono text-sm bg-gray-50 focus:bg-white transition-colors"
                />

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleProcessTranscript}
                    disabled={!transcript.trim() || isProcessing}
                    className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:transform-none flex items-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <span>Extract Tasks</span>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Extracted Tasks Results */}
            {extractedTasks.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 animate-in fade-in slide-in-from-bottom-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <span className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm">
                    {extractedTasks.length}
                  </span>
                  Extracted Tasks
                </h2>

                <div className="space-y-4">
                  {extractedTasks.map((task, idx) => (
                    <div key={idx} className="group p-4 border border-gray-200 rounded-xl hover:border-orange-300 hover:shadow-md transition-all bg-white">
                      <div className="flex items-start gap-4">
                        <div className="mt-1 text-gray-400 font-mono text-xs">#{idx + 1}</div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-gray-900">{task.title}</h4>
                            <span className={`text-xs px-2 py-1 rounded-full ${task.priority === 'high' ? 'bg-red-100 text-red-700' :
                              task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                              {task.priority || 'medium'}
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm mt-1 mb-3">{task.description}</p>

                          <div className="flex flex-wrap items-center gap-3">
                            <div className="relative">
                              <select
                                value={task.matchedUser?.id || (currentTeamForTranscript?.members.find(m => m.username === task.assignee || m.name === task.assignee)?.user_id) || ''}
                                onChange={(e) => {
                                  const selectedId = e.target.value;
                                  const member = currentTeamForTranscript?.members.find(m => m.user_id === selectedId);

                                  const updatedTasks = [...extractedTasks];
                                  if (member) {
                                    updatedTasks[idx] = {
                                      ...updatedTasks[idx],
                                      assignee: member.name, // Keep name for display/fallback
                                      matchedUser: {
                                        id: member.user_id,
                                        username: member.username || member.name,
                                        full_name: member.name,
                                        role: member.role
                                      }
                                    };
                                  } else {
                                    updatedTasks[idx] = {
                                      ...updatedTasks[idx],
                                      assignee: '',
                                      matchedUser: undefined
                                    };
                                  }
                                  setExtractedTasks(updatedTasks);
                                }}
                                className={`appearance-none pl-8 pr-8 py-1.5 rounded-lg text-sm font-medium border outline-none focus:ring-2 focus:ring-offset-1 ${task.assignee
                                  ? 'bg-blue-50 text-blue-700 border-blue-200 focus:ring-blue-500'
                                  : 'bg-gray-50 text-gray-600 border-gray-200 focus:ring-gray-400'
                                  }`}
                              >
                                <option value="">Unassigned</option>
                                {currentTeamForTranscript?.members.map(member => (
                                  <option key={member.id} value={member.user_id}>
                                    @{member.username || member.name}
                                  </option>
                                ))}
                              </select>
                              <FiUser className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 ${task.assignee ? 'text-blue-500' : 'text-gray-400'}`} />
                            </div>

                            {task.assignee && !currentTeamForTranscript?.members.some(m => (m.username === task.assignee || m.name === task.assignee)) && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 text-xs font-medium rounded-md border border-red-100">
                                <FiAlertCircle className="w-3 h-3" />
                                Not in team
                              </span>
                            )}

                            {task.dueDate && (
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                📅 {task.dueDate}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex justify-end">
                  <button
                    onClick={handleSaveTasks}
                    disabled={isAssigning}
                    className="px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl font-semibold hover:opacity-90 transition-colors shadow-lg flex items-center gap-2 disabled:opacity-50"
                  >
                    {isAssigning ? 'Assigning...' : 'Assign Tasks'}
                  </button>
                </div>
              </div>
            )}
            {/* Team Tasks Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-8">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Team Tasks</h3>
                  <p className="text-sm text-gray-500">Manage tasks for {currentTeam.name}</p>
                </div>
                <div className="flex bg-gray-200 rounded-lg p-1">
                  {(['all', 'unassigned', 'assigned'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setTasksTab(tab)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${tasksTab === tab
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6">
                {teamTasks
                  .filter(task => {
                    if (tasksTab === 'unassigned') return !task.assigned_to;
                    if (tasksTab === 'assigned') return !!task.assigned_to;
                    return true;
                  })
                  .map(task => (
                    <div key={task.id} className="flex items-start justify-between p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-900">{task.description}</h4>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${task.priority === 'high' ? 'bg-red-100 text-red-700' :
                            task.priority === 'medium' ? 'bg-orange-100 text-orange-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                            {task.priority}
                          </span>
                          {!task.assigned_to && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                              Unassigned
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {task.assigned_to ? (
                            <span className="flex items-center gap-1">
                              Assigned to: <span className="font-medium text-gray-700">{task.assigned_to_name || 'Unknown'}</span>
                            </span>
                          ) : (
                            <span className="text-red-500 flex items-center gap-1">
                              <FiAlertCircle className="w-3 h-3" />
                              {task.unassigned_reason || 'No assignee specified'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(task.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                {teamTasks.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No tasks found.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OfficialsDashboard;
