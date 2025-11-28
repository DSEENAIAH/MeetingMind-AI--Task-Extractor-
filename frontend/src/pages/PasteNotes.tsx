
import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { extractTasks, ExtractedTask } from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { FiAlertCircle, FiUsers } from 'react-icons/fi';

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
        const headers = {
          'Authorization': 'Bearer mock-token',
          'x-user-id': user.id
        };

        // Fetch team info and members in parallel using backend API
        const [teamRes, membersRes] = await Promise.all([
          fetch(`http://localhost:5000/api/teams/${teamId}`, { headers }),
          fetch(`http://localhost:5000/api/teams/${teamId}/members`, { headers })
        ]);

        if (teamRes.ok) {
          const teamData = await teamRes.json();
          setTeamName(teamData.name);
        } else {
          console.error('Failed to fetch team:', await teamRes.text());
          setError('Failed to load team details.');
        }

        if (membersRes.ok) {
          const membersData = await membersRes.json();
          setTeamMembers(membersData);
        } else {
          console.error('Failed to fetch members:', await membersRes.text());
          // Don't fail the whole page if members fail, just log it
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
      sessionStorage.setItem('currentTeamId', teamId || '');

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
  }, [notes, navigate, teamId]);

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

  if (loadingTeam) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (error && !teamName) { // Only show this error if team details couldn't be loaded at all
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          <FiAlertCircle className="inline mr-2" />
          <span className="text-sm font-medium">
            {error} Please ensure the team ID is correct and you have access.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-semibold uppercase tracking-wide">
            Team: {teamName}
          </span>
          <span className="text-gray-400 text-sm">|</span>
          <span className="text-gray-500 text-sm flex items-center gap-1">
            <FiUsers className="w-4 h-4" /> {teamMembers.length} members
          </span>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Extract Tasks from Meeting Notes
        </h2>
        <p className="text-gray-600">
          Paste ANY meeting transcript below - our AI extracts ALL actionable tasks from ANY format.
        </p>
      </div>

      {/* Transcript Input Area */}
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
            disabled={isExtracting || !notes.trim()}
            className={`px-6 py-3 rounded-md font-medium transition-colors ${isExtracting || !notes.trim()
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
    </div>
  );
}

export default PasteNotes;
