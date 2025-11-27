/**
 * OfficialsDashboard.tsx
 * 
 * Purpose: Dashboard for managers, team leads, HR, and other officials
 * Features:
 * - Create and manage teams
 * - Paste meeting transcripts
 * - Extract and assign tasks
 * - Only assign tasks to team members
 */

import { useState, useEffect } from 'react';
import { FiUsers, FiFileText, FiPlus, FiX, FiUserPlus, FiAlertCircle, FiSearch } from 'react-icons/fi';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface TeamMember {
  id: string;
  username: string;
  full_name: string;
  role: string;
}

interface Team {
  id: string;
  name: string;
  created_by: string;
  members: TeamMember[];
}

interface DbUser {
  id: string;
  username: string;
  full_name: string;
  role: string;
}

interface Task {
  id: string;
  description: string;
  assignedTo: string | null;
  isTeamMember: boolean;
}

const OfficialsDashboard = () => {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [allUsers, setAllUsers] = useState<DbUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<DbUser[]>([]);
  const [searchUsername, setSearchUsername] = useState('');
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  
  const [transcript, setTranscript] = useState('');
  const [extractedTasks, setExtractedTasks] = useState<Task[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedTeamForTranscript, setSelectedTeamForTranscript] = useState<string | null>(null);

  // Fetch all users from database
  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, username, full_name, role')
        .order('username');
      
      if (data && !error) {
        setAllUsers(data);
        setFilteredUsers(data);
      }
    };

    fetchUsers();
  }, []);

  // Fetch teams created by this user
  useEffect(() => {
    const fetchTeams = async () => {
      if (!user) return;

      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .eq('created_by', user.id);

      if (teamsData && !teamsError) {
        // Fetch members for each team
        const teamsWithMembers = await Promise.all(
          teamsData.map(async (team) => {
            const { data: membersData } = await supabase
              .from('team_members')
              .select(`
                user_id,
                user_profiles (
                  id,
                  username,
                  full_name,
                  role
                )
              `)
              .eq('team_id', team.id);

            const members = membersData?.map((m: any) => ({
              id: m.user_profiles.id,
              username: m.user_profiles.username,
              full_name: m.user_profiles.full_name,
              role: m.user_profiles.role,
            })) || [];

            return {
              id: team.id,
              name: team.name,
              created_by: team.created_by,
              members,
            };
          })
        );

        setTeams(teamsWithMembers);
      }
    };

    fetchTeams();
  }, [user]);

  // Filter users based on search
  useEffect(() => {
    if (searchUsername.trim()) {
      const filtered = allUsers.filter(u => 
        u.username.toLowerCase().includes(searchUsername.toLowerCase()) ||
        u.full_name.toLowerCase().includes(searchUsername.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(allUsers);
    }
  }, [searchUsername, allUsers]);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim() || !user) return;
    
    const { data, error } = await supabase
      .from('teams')
      .insert([
        {
          name: newTeamName,
          created_by: user.id,
        }
      ])
      .select()
      .single();

    if (data && !error) {
      const newTeam: Team = {
        id: data.id,
        name: data.name,
        created_by: data.created_by,
        members: [],
      };
      
      setTeams([...teams, newTeam]);
      setNewTeamName('');
      setShowCreateTeam(false);
      setSelectedTeam(newTeam.id);
    }
  };

  const handleAddMember = async (userId: string) => {
    if (!selectedTeam) return;
    
    // Check if user is already a member
    const team = teams.find(t => t.id === selectedTeam);
    if (team?.members.some(m => m.id === userId)) {
      alert('User is already a team member');
      return;
    }

    const { error } = await supabase
      .from('team_members')
      .insert([
        {
          team_id: selectedTeam,
          user_id: userId,
        }
      ]);

    if (!error) {
      // Add member to local state
      const userToAdd = allUsers.find(u => u.id === userId);
      if (userToAdd) {
        setTeams(teams.map(team => 
          team.id === selectedTeam 
            ? { 
                ...team, 
                members: [...team.members, {
                  id: userToAdd.id,
                  username: userToAdd.username,
                  full_name: userToAdd.full_name,
                  role: userToAdd.role,
                }] 
              }
            : team
        ));
        setSearchUsername('');
      }
    }
  };

  const handleRemoveMember = async (teamId: string, userId: string) => {
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId);

    if (!error) {
      setTeams(teams.map(team => 
        team.id === teamId 
          ? { ...team, members: team.members.filter(m => m.id !== userId) }
          : team
      ));
    }
  };

  const handleProcessTranscript = async () => {
    if (!transcript.trim() || !selectedTeamForTranscript) return;
    
    setIsProcessing(true);
    
    // Simple task extraction (will be enhanced with AI later)
    const lines = transcript.split('\n').filter(line => line.trim());
    const tasks: Task[] = [];
    
    const currentTeamForTranscript = teams.find(t => t.id === selectedTeamForTranscript);
    
    lines.forEach((line, index) => {
      // Extract potential assignee usernames from the transcript
      const usernameMatch = line.match(/@(\w+)/);
      const assignedTo = usernameMatch ? usernameMatch[1] : null;
      
      // Check if assigned person is in selected team
      const isTeamMember = assignedTo 
        ? currentTeamForTranscript?.members.some(m => m.username.toLowerCase() === assignedTo.toLowerCase()) || false
        : false;
      
      tasks.push({
        id: `task-${Date.now()}-${index}`,
        description: line,
        assignedTo,
        isTeamMember,
      });
    });
    
    setExtractedTasks(tasks);
    setIsProcessing(false);
  };

  const handleAssignTask = (taskId: string, memberUsername: string) => {
    setExtractedTasks(extractedTasks.map(task => 
      task.id === taskId 
        ? { ...task, assignedTo: memberUsername, isTeamMember: true }
        : task
    ));
  };

  const currentTeam = teams.find(t => t.id === selectedTeam);
  const currentTeamForTranscript = teams.find(t => t.id === selectedTeamForTranscript);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-500 via-red-500 to-purple-600 bg-clip-text text-transparent mb-2">
            Officials Dashboard
          </h1>
          <p className="text-gray-600">Manage teams and assign tasks</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Team Management Section */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <FiUsers className="text-orange-500" />
                  Teams
                </h2>
                <button
                  onClick={() => setShowCreateTeam(true)}
                  className="p-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:scale-105 transition-transform"
                  title="Create Team"
                >
                  <FiPlus />
                </button>
              </div>

              {/* Create Team Modal */}
              {showCreateTeam && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <input
                    type="text"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="Team name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateTeam}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:scale-[1.02] transition-transform"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => setShowCreateTeam(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Teams List */}
              <div className="space-y-2">
                {teams.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">No teams yet. Create one!</p>
                ) : (
                  teams.map(team => (
                    <button
                      key={team.id}
                      onClick={() => setSelectedTeam(team.id)}
                      className={`w-full text-left p-3 rounded-lg transition-all ${
                        selectedTeam === team.id
                          ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                      }`}
                    >
                      <div className="font-semibold">{team.name}</div>
                      <div className="text-sm opacity-90">{team.members.length} members</div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Team Members */}
            {currentTeam && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <FiUserPlus className="text-purple-500" />
                  Team Members
                </h3>

                {/* Search and Add Member */}
                <div className="mb-4 space-y-2">
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={searchUsername}
                      onChange={(e) => setSearchUsername(e.target.value)}
                      placeholder="Search by username..."
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>

                  {/* Search Results */}
                  {searchUsername && filteredUsers.length > 0 && (
                    <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                      {filteredUsers.slice(0, 5).map(dbUser => {
                        const isAlreadyMember = currentTeam.members.some(m => m.id === dbUser.id);
                        return (
                          <button
                            key={dbUser.id}
                            onClick={() => !isAlreadyMember && handleAddMember(dbUser.id)}
                            disabled={isAlreadyMember}
                            className={`w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                              isAlreadyMember ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                            }`}
                          >
                            <div className="font-medium text-gray-800">@{dbUser.username}</div>
                            <div className="text-sm text-gray-500">{dbUser.full_name} • {dbUser.role}</div>
                            {isAlreadyMember && (
                              <div className="text-xs text-green-600 mt-1">Already a member</div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {searchUsername && filteredUsers.length === 0 && (
                    <div className="p-3 text-sm text-gray-500 text-center bg-gray-50 rounded-lg">
                      No users found
                    </div>
                  )}
                </div>

                {/* Members List */}
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-600 mb-2">
                    {currentTeam.members.length} member{currentTeam.members.length !== 1 ? 's' : ''}
                  </div>
                  {currentTeam.members.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">No members yet. Search and add users!</p>
                  ) : (
                    currentTeam.members.map(member => (
                      <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-800">@{member.username}</div>
                          <div className="text-sm text-gray-500">{member.full_name}</div>
                          <div className="text-xs text-gray-400 mt-1">{member.role}</div>
                        </div>
                        <button
                          onClick={() => handleRemoveMember(currentTeam.id, member.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove member"
                        >
                          <FiX />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Transcript & Tasks Section */}
          <div className="lg:col-span-2 space-y-4">
            {/* Transcript Input */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FiFileText className="text-red-500" />
                Meeting Transcript
              </h2>
              
              {/* Team Selection for Transcript */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Team
                </label>
                {teams.length === 0 ? (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2 text-yellow-800">
                    <FiAlertCircle />
                    <span className="text-sm">Please create a team first</span>
                  </div>
                ) : (
                  <select
                    value={selectedTeamForTranscript || ''}
                    onChange={(e) => setSelectedTeamForTranscript(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                  >
                    <option value="">-- Select a team --</option>
                    {teams.map(team => (
                      <option key={team.id} value={team.id}>
                        {team.name} ({team.members.length} members)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                disabled={!selectedTeamForTranscript}
                placeholder="Paste meeting transcript here...&#10;&#10;Example:&#10;@john needs to update the database schema&#10;@sarah will review the pull request&#10;@mike should fix the login bug"
                className="w-full h-48 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none resize-none disabled:bg-gray-100"
              />

              <button
                onClick={handleProcessTranscript}
                disabled={!selectedTeamForTranscript || !transcript.trim() || isProcessing}
                className="mt-4 w-full px-6 py-3 bg-gradient-to-r from-orange-500 via-red-500 to-purple-600 text-white rounded-lg font-semibold hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Processing...' : 'Extract Tasks'}
              </button>
            </div>

            {/* Extracted Tasks */}
            {extractedTasks.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  Extracted Tasks ({extractedTasks.length})
                </h2>

                <div className="space-y-3">
                  {extractedTasks.map(task => (
                    <div key={task.id} className="p-4 border border-gray-200 rounded-lg">
                      <p className="text-gray-800 mb-3">{task.description}</p>
                      
                      <div className="flex items-center gap-3">
                        <select
                          value={task.assignedTo || ''}
                          onChange={(e) => handleAssignTask(task.id, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                        >
                          <option value="">Assign to...</option>
                          {currentTeamForTranscript?.members.map(member => (
                            <option key={member.id} value={member.username}>
                              @{member.username} - {member.full_name} ({member.role})
                            </option>
                          ))}
                        </select>

                        {task.assignedTo && !task.isTeamMember && (
                          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                            <FiAlertCircle />
                            <span>Not in team</span>
                          </div>
                        )}

                        {task.assignedTo && task.isTeamMember && (
                          <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
                            ✓ Assigned
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  className="mt-4 w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:scale-[1.02] transition-transform"
                >
                  Save Tasks
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfficialsDashboard;
