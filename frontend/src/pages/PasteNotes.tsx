/**
 * PasteNotes.tsx
 * 
 * Purpose: Main landing page where users paste meeting notes and extract tasks.
 * 
 * User story:
 * - As a user, I paste my meeting notes into a textarea
 * - I click "Extract Tasks" and see a loading state
 * - The AI extracts structured tasks which I can preview before creating
 * 
 * UX decisions:
 * - Large, accessible textarea with placeholder text guiding users
 * - Clear call-to-action button with loading state
 * - Inline preview of extracted tasks (before navigating to full preview)
 * - Error handling with user-friendly messages
 * - Keyboard shortcuts for power users (Ctrl+Enter to extract)
 * 
 * Technical notes:
 * - Uses React hooks for state management
 * - Stores extracted tasks in session storage for preview page
 * - Falls back to mock extraction if backend is unavailable
 */

import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { extractTasks, mockExtractTasks, ExtractedTask } from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { FiAlertCircle, FiUsers, FiPlus, FiX, FiSearch, FiUserPlus } from 'react-icons/fi';

// Define official roles that can access this page
const OFFICIAL_ROLES = [
  'ceo',
  'cto',
  'vp_engineering',
  'director',
  'engineering_manager',
  'product_manager',
  'team_lead',
  'hr_manager'
];

interface Team {
  id: string;
  name: string;
  created_by: string;
  member_count: number;
}

interface DbUser {
  id: string;
  username: string;
  full_name: string;
  role: string;
}

interface TeamMember {
  id: string;
  username: string;
  full_name: string;
  role: string;
}

function PasteNotes() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Team state
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  
  // Member management state
  const [allUsers, setAllUsers] = useState<DbUser[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [searchUsername, setSearchUsername] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<DbUser[]>([]);
  
  // Redirect workers to dashboard
  useEffect(() => {
    if (user) {
      const role = user.user_metadata?.role;
      if (role && !OFFICIAL_ROLES.includes(role)) {
        // Worker role - redirect to dashboard
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, navigate]);
  
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

  // Fetch team members when selected team changes
  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!selectedTeam) {
        setTeamMembers([]);
        return;
      }

      const { data: membersData } = await supabase
        .from('team_members')
        .select('user_id, name, role')
        .eq('team_id', selectedTeam);

      const members = membersData?.map((m: any) => ({
        id: m.user_id,
        username: m.name,
        full_name: m.name,
        role: m.role,
      })) || [];

      setTeamMembers(members);
    };

    fetchTeamMembers();
  }, [selectedTeam]);

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
  
  // Fetch teams created by this user
  useEffect(() => {
    const fetchTeams = async () => {
      if (!user) return;

      console.log('Fetching teams for user:', user.id);
      
      try {
        // Add timeout to detect hanging queries
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout after 5 seconds')), 5000)
        );

        const queryPromise = supabase
          .from('teams')
          .select('id, name, created_by')
          .eq('created_by', user.id);

        const { data: teamsData, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

        console.log('Teams query result:', { teamsData, error });

        if (teamsData && !error) {
          // Get member count for each team
          const teamsWithCount = await Promise.all(
            teamsData.map(async (team) => {
              const { count } = await supabase
                .from('team_members')
                .select('*', { count: 'exact', head: true })
                .eq('team_id', team.id);

              return {
                id: team.id,
                name: team.name,
                created_by: team.created_by,
                member_count: count || 0,
              };
            })
          );

          console.log('Teams with count:', teamsWithCount);
          console.log('Setting teams state to:', teamsWithCount);
          setTeams(teamsWithCount);
          console.log('Teams state should now be updated');
        } else if (error) {
          console.error('Error fetching teams:', error);
        }
      } catch (err) {
        console.error('Failed to fetch teams:', err);
        // Show error to user
        setError('Unable to load teams. Please check your connection and try refreshing the page.');
      }
    };

    fetchTeams();
  }, [user]);

  // Handle create team
  const handleCreateTeam = async () => {
    if (!newTeamName.trim() || !user || isCreatingTeam) {
      return;
    }
    
    setIsCreatingTeam(true);
    
    try {
      // Insert and return the created team in one call
      const { data, error } = await supabase
        .from('teams')
        .insert([{ name: newTeamName, created_by: user.id }])
        .select('*')
        .single();

      if (error) {
        console.error('Failed to create team:', error);
        alert('Failed to create team: ' + error.message);
        return;
      }

      // Update UI immediately
      const newTeam = { ...data, member_count: 0 };
      setTeams([...teams, newTeam]);
      setNewTeamName('');
      setShowCreateTeam(false);
      setSelectedTeam(data.id);
      
    } catch (err) {
      console.error('Exception creating team:', err);
      alert('Exception creating team: ' + err);
    } finally {
      setIsCreatingTeam(false);
    }
  };

  // Add member to team
  const handleAddMember = async (userId: string) => {
    if (!selectedTeam || !user) return;

    const userToAdd = allUsers.find(u => u.id === userId);
    if (!userToAdd) return;

    const { error } = await supabase
      .from('team_members')
      .insert([
        {
          team_id: selectedTeam,
          user_id: userId,
          name: userToAdd.full_name,
          role: userToAdd.role,
          added_by: user.id
        }
      ]);

    if (!error) {
      // Add to local state
      const newMember = {
        id: userId,
        username: userToAdd.username,
        full_name: userToAdd.full_name,
        role: userToAdd.role,
      };
      
      setTeamMembers([...teamMembers, newMember]);
      
      // Update team count
      setTeams(teams.map(t => 
        t.id === selectedTeam 
          ? { ...t, member_count: teamMembers.length + 1 }
          : t
      ));

      setSearchUsername('');
    }
  };

  // Remove member from team
  const handleRemoveMember = async (userId: string) => {
    if (!selectedTeam) return;

    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', selectedTeam)
      .eq('user_id', userId);

    if (!error) {
      const updatedMembers = teamMembers.filter(m => m.id !== userId);
      setTeamMembers(updatedMembers);

      // Update team count
      setTeams(teams.map(t => 
        t.id === selectedTeam 
          ? { ...t, member_count: updatedMembers.length }
          : t
      ));
    }
  };
  
  // State
  const [notes, setNotes] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTask[] | null>(null);

  // Clear old extraction data when returning to paste page
  useEffect(() => {
    sessionStorage.removeItem('extractedTasks');
    sessionStorage.removeItem('notesHash');
  }, []);

  /**
   * Handle task extraction from notes
   * Tries backend API first, falls back to mock if unavailable
   */
  const handleExtract = useCallback(async () => {
    if (!notes.trim()) {
      setError('Please paste some meeting notes first');
      return;
    }

    console.log('[PasteNotes] Starting extraction...');
    console.log('[PasteNotes] Notes length:', notes.length);
    
    setIsExtracting(true);
    setError(null);
    setExtractedTasks(null);

    try {
      // Try real API extraction
      console.log('[PasteNotes] Calling backend API...');
      const response = await extractTasks(notes);
      console.log('[PasteNotes] Backend response:', response.tasks.length, 'tasks');
      setExtractedTasks(response.tasks);
      
      // Store in session storage for preview page with hash for cache invalidation
      const notesHash = notes.substring(0, 50); // Simple hash: first 50 chars
      sessionStorage.setItem('extractedTasks', JSON.stringify(response.tasks));
      sessionStorage.setItem('originalNotes', notes);
      sessionStorage.setItem('notesHash', notesHash);

      // Auto-navigate to preview after 1 second (gives user time to see success)
      setTimeout(() => {
        navigate('/preview');
      }, 1000);

    } catch (err) {
      console.error('[PasteNotes] API extraction failed:', err);
      setError('Failed to extract tasks. Please check your API key and try again.');
    } finally {
      setIsExtracting(false);
    }
  }, [notes, navigate]);

  /**
   * Handle keyboard shortcuts
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter or Cmd+Enter to extract
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleExtract();
    }
  }, [handleExtract]);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Extract Tasks from Meeting Notes
        </h2>
        <p className="text-gray-600">
          Paste ANY meeting transcript below - our AI extracts ALL actionable tasks from ANY format.
          Handles timestamped transcripts, bullet lists, conversational notes, messy formats.
        </p>
      </div>

      console.log('=== RENDER: PasteNotes component ===');
      console.log('Current teams state:', teams);
      console.log('Teams length:', teams.length);
      console.log('User:', user?.id);
      
      {/* Team Selection Section */}
      <div className="mb-6 bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FiUsers className="text-orange-500" />
            My Teams
          </h3>
          <button
            onClick={() => setShowCreateTeam(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:scale-105 transition-transform text-sm font-medium"
          >
            <FiPlus />
            Create New Team
          </button>
        </div>

        {/* Create Team Form */}
        {showCreateTeam && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <input
              type="text"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="Enter team name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 focus:ring-2 focus:ring-orange-500 outline-none"
              onKeyPress={(e) => e.key === 'Enter' && handleCreateTeam()}
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateTeam}
                disabled={isCreatingTeam || !newTeamName.trim()}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingTeam ? 'Creating...' : 'Create'}
              </button>
              <button
                onClick={() => {
                  setShowCreateTeam(false);
                  setNewTeamName('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Teams Grid (3 per row) */}
        {teams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map(team => (
              <button
                key={team.id}
                onClick={() => setSelectedTeam(selectedTeam === team.id ? null : team.id)}
                className={`p-5 rounded-xl border-2 transition-all text-left ${
                  selectedTeam === team.id
                    ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-red-50 shadow-lg scale-105'
                    : 'border-gray-200 bg-white hover:border-orange-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-gray-800 mb-1">{team.name}</h4>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FiUsers className="w-4 h-4" />
                      <span>{team.member_count} member{team.member_count !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  {selectedTeam === team.id && (
                    <div className="ml-2 px-2 py-1 bg-orange-500 text-white rounded-full text-xs font-medium">
                      Selected
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  Click to {selectedTeam === team.id ? 'deselect' : 'select'}
                </div>
              </button>
            ))}
          </div>
        ) : (
          /* No teams message with retry option */
          <div className="text-center py-12">
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
              <FiAlertCircle className="inline mr-2" />
              <span className="text-sm font-medium">
                {error ? 'Unable to load teams. ' : 'No teams yet. '}
                {error && (
                  <button 
                    onClick={() => {
                      setError('');
                      window.location.reload();
                    }}
                    className="underline hover:text-yellow-900"
                  >
                    Try refreshing the page
                  </button>
                )}
                {!error && 'Create your first team to get started!'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Team Members Management */}
      {selectedTeam && (
        <div className="mb-6 bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FiUserPlus className="text-purple-500" />
            Team Members ({teamMembers.length})
          </h3>

          {/* Search and Add Member */}
          <div className="mb-4 space-y-2">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchUsername}
                onChange={(e) => setSearchUsername(e.target.value)}
                placeholder="Search users by username or name..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>

            {/* Search Results */}
            {searchUsername && filteredUsers.length > 0 && (
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white shadow-sm">
                {filteredUsers.slice(0, 5).map(dbUser => {
                  const isAlreadyMember = teamMembers.some(m => m.id === dbUser.id);
                  return (
                    <button
                      key={dbUser.id}
                      onClick={() => !isAlreadyMember && handleAddMember(dbUser.id)}
                      disabled={isAlreadyMember}
                      className={`w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors ${
                        isAlreadyMember ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-800">@{dbUser.username}</div>
                          <div className="text-sm text-gray-500">{dbUser.full_name}</div>
                          <div className="text-xs text-gray-400 mt-1">{dbUser.role}</div>
                        </div>
                        {isAlreadyMember && (
                          <span className="text-xs text-green-600 font-medium">✓ Added</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Current Members List */}
          {teamMembers.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-sm bg-gray-50 rounded-lg">
              No members yet. Search and add members from existing users above.
            </div>
          ) : (
            <div className="space-y-2">
              {teamMembers.map(member => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div>
                    <div className="font-medium text-gray-800">@{member.username}</div>
                    <div className="text-sm text-gray-500">{member.full_name}</div>
                    <div className="text-xs text-gray-400 mt-1">{member.role}</div>
                  </div>
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove member"
                  >
                    <FiX />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Transcript Input Area - Only shown when team is selected */}
      {selectedTeam && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <label htmlFor="meeting-notes" className="block text-sm font-medium text-gray-700 mb-2">
            Meeting Notes
          </label>
          <textarea
            id="meeting-notes"
            data-testid="notes-textarea"
            className="w-full h-96 p-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y font-mono text-sm"
            placeholder={`Paste ANY meeting transcript here - our AI handles ALL formats:

📝 Bullet lists:
- John to review PR by Friday
- Sarah will update docs

🎙️ Timestamped transcripts:
00:03 Karen: Sam, can you update the setup guide by Thursday?
00:15 David: Lina, please upload the component library today

💬 Conversational notes:
Ramya, finish the report by 10pm
John mentioned he'll review code tomorrow
Everyone needs to complete self-assessments by Monday

📋 Mixed formats, messy notes, any structure - we extract ALL tasks!

Press Ctrl+Enter to extract tasks quickly!`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Meeting notes input"
            aria-describedby="notes-help"
          />
          <p id="notes-help" className="mt-2 text-xs text-gray-500">
            Tip: Press <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded">Ctrl+Enter</kbd> to extract tasks
          </p>

          {/* Error Message */}
          {error && (
            <div
              className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md"
              role="alert"
              aria-live="assertive"
            >
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Success Preview */}
          {extractedTasks && (
            <div
              className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p className="text-sm font-medium text-green-800">
                  Extracted {extractedTasks.length} task{extractedTasks.length !== 1 ? 's' : ''}
                </p>
              </div>
              <p className="text-xs text-green-700">Redirecting to preview...</p>
            </div>
          )}

          {/* Extract Button */}
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              data-testid="extract-button"
              onClick={handleExtract}
              disabled={isExtracting || !notes.trim() || !selectedTeam}
              className={`px-6 py-3 rounded-md font-medium transition-colors ${
                isExtracting || !notes.trim() || !selectedTeam
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
              }`}
              aria-label={isExtracting ? 'Extracting tasks...' : 'Extract tasks from notes'}
            >
              {isExtracting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Extracting...
                </span>
              ) : (
                'Extract Tasks'
              )}
            </button>
          </div>

          {/* Sample Notes (for demo) */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800 mb-2">
              <strong>Demo tip:</strong> Don't have meeting notes handy? Click below to load sample transcripts.
            </p>
            <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setNotes(`The project planning meeting was held on Feb 4, 2025 with Sarah, James, Priya, and Marco. Sarah began by outlining tasks for the "Client Dashboard Upgrade" project. Priya was assigned to create the updated dashboard layout and analytics page mock-ups, with a deadline of February 10. James would begin development after receiving Priya's mock-ups and was given until February 20 to complete the analytics API and dashboard logic. Marco was scheduled to start QA testing on February 21 and finish by February 26. The team agreed to hold a final project review on February 27. Everyone confirmed the tasks and deadlines, and the meeting concluded.`)}
            className="text-sm text-blue-600 hover:text-blue-700 underline"
          >
            Load paragraph transcript
          </button>
          <button
            type="button"
            onClick={() => setNotes(`Team Standup Meeting Transcript - November 24, 2025

Attendees: John, Sarah, Mike, Ramya, Lisa

Discussion:

Ramya, this is your task - finish the quarterly report by 10pm today

John mentioned he'll review PR #234 tomorrow morning

Sarah said she needs to update the API documentation by Friday

We told Mike to fix that urgent login bug ASAP - it's blocking QA testing

Lisa will handle the client demo and needs to prepare slides by end of week

Manager: "Also, someone should schedule a follow-up meeting with the design team"

John: "I'll take care of deploying the hotfix to production by EOD"

Sarah: "I can work on updating the project timeline in Zoho Projects"

Action items discussed:
- Code review completion needed urgently
- Documentation updates are high priority
- Bug fixes required before release
- Client feedback needs follow-up

Next standup: Tomorrow 9 AM`)}
            className="text-sm text-blue-600 hover:text-blue-700 underline"
          >
            Load conversational notes
          </button>
        </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PasteNotes;
