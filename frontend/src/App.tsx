/**
 * App.tsx
 * 
 * Purpose: Top-level router and layout for MeetingMind.
 * 
 * User stories:
 * - As a user, I want to paste meeting notes and extract tasks
 * - As a user, I want to preview extracted tasks before creating them in Zoho
 * - As a user, I want to see a dashboard of my recent activity
 * 
 * Design decisions:
 * - Protected routes require authentication
 * - Supabase for user authentication
 * - Minimal layout: just a nav header and main content area
 * - Tailwind for styling to keep things clean and maintainable
 */

import { Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import PasteNotes from './pages/PasteNotes';
import PreviewTasks from './pages/PreviewTasks';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './contexts/AuthContext';
import { FiLogOut, FiUser } from 'react-icons/fi';
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [username, setUsername] = useState<string>('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    console.log('Sign out clicked');
    
    try {
      // Set a timeout to force logout if Supabase takes too long
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 3000)
      );
      
      const signOutPromise = supabase.auth.signOut();
      
      await Promise.race([signOutPromise, timeoutPromise]);
      console.log('Signed out successfully');
    } catch (error) {
      console.log('Sign out error or timeout:', error);
      // Continue anyway
    }
    
    // Clear everything
    setUsername('');
    sessionStorage.clear();
    localStorage.clear();
    
    // Force reload to login page
    window.location.href = '/login';
  };

  // Fetch username from user_profiles table
  useEffect(() => {
    const fetchUsername = async () => {
      if (!user) {
        setUsername('');
        return;
      }

      console.log('Fetching username for user:', user.id);
      console.log('User metadata:', user.user_metadata);
      
      // Use metadata directly (fallback since database query seems to hang)
      const displayName = user.user_metadata?.full_name || 
                         user.user_metadata?.name || 
                         user.email?.split('@')[0] || 
                         'User';
      
      console.log('Setting username to:', displayName);
      setUsername(displayName);

      // Try to fetch from database in background (don't wait)
      supabase
        .from('user_profiles')
        .select('username, full_name')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data, error }) => {
          console.log('Database query completed');
          console.log('User profile data:', data);
          console.log('Query error:', error);
          
          if (data && !error && data.full_name) {
            console.log('Updating to database name:', data.full_name);
            setUsername(data.full_name);
          }
        })
        .catch(err => {
          console.error('Database query failed:', err);
        });
    };

    fetchUsername();
  }, [user]);

  // Check if user is official (can see nav menu)
  const OFFICIAL_ROLES = [
    'ceo', 'cto', 'vp_engineering', 'director',
    'engineering_manager', 'product_manager', 'team_lead', 'hr_manager'
  ];
  const isOfficial = user?.user_metadata?.role && OFFICIAL_ROLES.includes(user.user_metadata.role);

  // If user is logged in and tries to access /login, redirect to home
  if (user && location.pathname === '/login') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header / Navigation - Only show if user is logged in and not on login page */}
      {user && location.pathname !== '/login' && (
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-8">
                <h1 className="text-xl font-bold bg-gradient-to-r from-orange-500 via-red-500 to-purple-600 bg-clip-text text-transparent">
                  MeetingMind
                </h1>
                {/* Only show navigation for officials */}
                {isOfficial && (
                  <nav className="flex space-x-4" role="navigation" aria-label="Main navigation">
                    <Link
                      to="/"
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        location.pathname === '/'
                          ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      Extract Tasks
                    </Link>
                    <Link
                      to="/preview"
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        location.pathname === '/preview'
                          ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      Preview
                    </Link>
                    <Link
                      to="/dashboard"
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        location.pathname === '/dashboard'
                          ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      Dashboard
                    </Link>
                  </nav>
                )}
              </div>
              
              {/* User Menu - Profile Display and Sign Out */}
              <div className="flex items-center space-x-3">
                {/* Profile Icon with Name */}
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg border border-gray-200">
                  <FiUser className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-sm text-gray-700">
                    {username || 'Loading...'}
                  </span>
                </div>
                
                {/* Sign Out Button */}
                <button
                  onClick={handleSignOut}
                  disabled={isLoggingOut}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 rounded-lg transition-all shadow-md hover:shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  title="Sign Out"
                >
                  <FiLogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">{isLoggingOut ? 'Signing Out...' : 'Sign Out'}</span>
                </button>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className={`${user && location.pathname !== '/login' ? 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8' : ''}`}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <PasteNotes />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/preview" 
            element={
              <ProtectedRoute>
                <PreviewTasks />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;
