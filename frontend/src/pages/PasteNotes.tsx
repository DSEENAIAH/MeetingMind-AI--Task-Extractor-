
import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { extractTasks, ExtractedTask } from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { FiAlertCircle, FiUsers, FiArrowRight, FiFileText, FiInfo, FiCheck, FiLoader, FiTrash2, FiPlayCircle } from 'react-icons/fi';

interface TeamMember {
  id: string;
  username: string;
  full_name: string;
  role: string;
}

function PasteNotes() {
  const navigate = useNavigate();
  const { teamId } = useParams<{ teamId: string }>();
  const { user } = useAuth();

  // Team state
  const [teamName, setTeamName] = useState<string>('');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);

  // State
  const [notes, setNotes] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTask[] | null>(null);
  const [showTips, setShowTips] = useState(false);

  // Clear old extraction data when returning to paste page
  useEffect(() => {
    sessionStorage.removeItem('extractedTasks');
    sessionStorage.removeItem('notesHash');
    sessionStorage.removeItem('currentTeamId');
  }, []);

  // Fetch team details and members
  useEffect(() => {
    const fetchTeamDetails = async () => {
      if (!teamId || !user) {
        setLoadingTeam(false);
        return;
      }

      try {
        setLoadingTeam(true);

        // Fetch team info using Supabase directly
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select('name')
          .eq('id', teamId)
          .single();

        if (teamError) {
          console.error('Failed to fetch team:', teamError);
          setError('Failed to load team details.');
        } else {
          setTeamName(teamData.name);
        }

        // Fetch team members using Supabase directly
        const { data: membersData, error: membersError } = await supabase
          .from('team_members')
          .select(`
            id,
            user_id,
            name,
            role
          `)
          .eq('team_id', teamId);

        if (membersError) {
          console.error('Failed to fetch members:', membersError);
        } else {
          setTeamMembers(membersData || []);
        }

      } catch (err) {
        console.error('Error fetching team details:', err);
        setError('Failed to load team details.');
      } finally {
        setLoadingTeam(false);
      }
    };

    fetchTeamDetails();
  }, [teamId, user]);

  /**
   * Handle task extraction from notes
   */
  const handleExtract = useCallback(async () => {
    if (!notes.trim()) {
      setError('Please paste some meeting notes first');
      return;
    }

    setIsExtracting(true);
    setError(null);
    setExtractedTasks(null);

    try {
      const response = await extractTasks(notes, teamMembers);
      setExtractedTasks(response.tasks);

      // Store in session storage
      const notesHash = notes.substring(0, 50);
      sessionStorage.setItem('extractedTasks', JSON.stringify(response.tasks));
      sessionStorage.setItem('originalNotes', notes);
      sessionStorage.setItem('notesHash', notesHash);
      sessionStorage.setItem('currentTeamId', teamId || '');

      // Auto-navigate to preview after 1 second
      setTimeout(() => {
        navigate('/preview');
      }, 800);

    } catch (err) {
      console.error('[PasteNotes] API extraction failed:', err);
      setError('Failed to extract tasks. Please check your API key and try again.');
    } finally {
      setIsExtracting(false);
    }
  }, [notes, navigate, teamId]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleExtract();
    }
  }, [handleExtract]);

  if (loadingTeam) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error && !teamName) {
    return (
      <div className="max-w-2xl mx-auto mt-12 p-4 bg-red-50 border border-red-100 rounded-lg text-red-800 flex items-center gap-3">
        <FiAlertCircle className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm font-medium">{error} Please ensure the team ID is correct.</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 border-b border-gray-200 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Extract Tasks</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium border border-gray-200">
              AI Powered
            </span>
          </div>
          <p className="text-gray-500 text-sm max-w-xl">
            Paste your meeting transcript below. Our AI will analyze the conversation and automatically identify actionable tasks, assignees, and deadlines.
          </p>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{teamName}</span>
          </div>
          <div className="w-px h-4 bg-gray-300"></div>
          <div className="flex items-center gap-1.5">
            <FiUsers className="w-4 h-4" />
            <span>{teamMembers.length} members</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Input Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-shadow hover:shadow-md">
            <div className="p-1 bg-gray-50 border-b border-gray-200 flex justify-between items-center px-4 py-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Transcript Input</span>
              <button
                onClick={() => setNotes('')}
                className="text-xs text-gray-400 hover:text-red-600 flex items-center gap-1 transition-colors"
                disabled={!notes}
              >
                <FiTrash2 className="w-3 h-3" /> Clear
              </button>
            </div>
            <textarea
              id="meeting-notes"
              className="w-full h-[500px] p-6 focus:outline-none resize-none font-mono text-sm text-gray-800 leading-relaxed placeholder-gray-400"
              placeholder="Paste your meeting notes here..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onKeyDown={handleKeyDown}
            />

            {/* Action Bar */}
            <div className="bg-gray-50 border-t border-gray-200 p-4 flex items-center justify-between">
              <div className="text-xs text-gray-500 flex items-center gap-2">
                <span className="hidden sm:inline">Pro tip: Press</span>
                <kbd className="px-2 py-1 bg-white border border-gray-200 rounded text-gray-600 font-sans text-[10px] shadow-sm">Ctrl + Enter</kbd>
                <span className="hidden sm:inline">to extract</span>
              </div>

              <button
                onClick={handleExtract}
                disabled={isExtracting || !notes.trim()}
                className={`
                  flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-all shadow-sm
                  ${isExtracting || !notes.trim()
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                    : 'bg-gray-900 text-white hover:bg-black hover:shadow-md active:transform active:scale-95'
                  }
                `}
              >
                {isExtracting ? (
                  <>
                    <FiLoader className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>Extract Tasks</span>
                    <FiArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <FiAlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          {extractedTasks && (
            <div className="p-4 bg-green-50 border border-green-100 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <FiCheck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-900">Success!</p>
                <p className="text-xs text-green-700">Extracted {extractedTasks.length} tasks. Redirecting...</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* How it works */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FiInfo className="w-4 h-4 text-gray-400" />
              How it works
            </h3>
            <ul className="space-y-3">
              {[
                'Paste any meeting transcript or notes.',
                'AI identifies action items and deadlines.',
                'Tasks are matched to team members.',
                'Review and confirm before creating.'
              ].map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-600">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-medium border border-gray-200">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Sample Data */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FiFileText className="w-4 h-4 text-gray-400" />
              Try with sample data
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => setNotes(`The project planning meeting was held on Feb 4, 2025 with Sarah, James, Priya, and Marco. Sarah began by outlining tasks for the "Client Dashboard Upgrade" project. Priya was assigned to create the updated dashboard layout and analytics page mock-ups, with a deadline of February 10. James would begin development after receiving Priya's mock-ups and was given until February 20 to complete the analytics API and dashboard logic. Marco was scheduled to start QA testing on February 21 and finish by February 26. The team agreed to hold a final project review on February 27. Everyone confirmed the tasks and deadlines, and the meeting concluded.`)}
                className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">Project Planning</span>
                  <FiPlayCircle className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                </div>
                <p className="text-xs text-gray-500 line-clamp-2">
                  Narrative style notes about a dashboard upgrade project with assignments.
                </p>
              </button>

              <button
                onClick={() => setNotes(`Team Standup Meeting Transcript - November 24, 2025

Attendees: John, Sarah, Mike, Ramya, Lisa

Discussion:
Ramya, this is your task - finish the quarterly report by 10pm today
John mentioned he'll review PR #234 tomorrow morning
Sarah said she needs to update the API documentation by Friday
We told Mike to fix that urgent login bug ASAP - it's blocking QA testing
Lisa will handle the client demo and needs to prepare slides by end of week`)}
                className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">Daily Standup</span>
                  <FiPlayCircle className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                </div>
                <p className="text-xs text-gray-500 line-clamp-2">
                  Bullet-point style standup notes with quick action items.
                </p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PasteNotes;
