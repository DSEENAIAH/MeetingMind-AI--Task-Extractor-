/**
 * AuthContext.tsx
 * 
 * Purpose: Manage authentication state and provide auth methods throughout the app
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, fullName: string, role: string, username: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithGithub: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Clear corrupted auth on load if refresh token is invalid
    const clearCorruptedAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.log('Auth session corrupted, clearing...');
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    clearCorruptedAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Handle OAuth sign-in: create user profile if it doesn't exist
      if (event === 'SIGNED_IN' && session?.user) {
        const userId = session.user.id;
        
        // Check if user profile exists
        const { data: existingProfile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', userId)
          .single();

        if (!existingProfile) {
          // Extract user info from OAuth metadata
          const fullName = session.user.user_metadata?.full_name || 
                          session.user.user_metadata?.name || 
                          session.user.email?.split('@')[0] || 
                          'User';
          
          // Generate username from email or OAuth username
          const baseUsername = session.user.user_metadata?.user_name ||
                              session.user.user_metadata?.preferred_username ||
                              session.user.email?.split('@')[0] ||
                              'user';
          
          // Clean username (remove special chars, make lowercase)
          let username = baseUsername.toLowerCase().replace(/[^a-z0-9_]/g, '_');
          
          // Ensure username is unique by appending random suffix if needed
          let finalUsername = username;
          let attempts = 0;
          while (attempts < 5) {
            const { data: existingUser } = await supabase
              .from('user_profiles')
              .select('username')
              .eq('username', finalUsername)
              .single();
            
            if (!existingUser) break;
            
            // Username taken, try with suffix
            finalUsername = `${username}_${Math.floor(Math.random() * 10000)}`;
            attempts++;
          }

          // Default role for OAuth users
          const role = 'developer';

          // Create user profile
          await supabase.from('user_profiles').insert({
            id: userId,
            username: finalUsername,
            full_name: fullName,
            role: role,
          });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string, role: string, username: string) => {
    // First, create the auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role,
        },
      },
    });

    if (authError) {
      return { error: authError };
    }

    // Then create the user profile entry
    if (authData.user) {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          username: username,
          full_name: fullName,
          role: role,
        });

      if (profileError) {
        // Check if it's a unique constraint violation
        if (profileError.code === '23505') {
          return { 
            error: { 
              message: 'Username already taken. Please choose a different username.',
              name: 'DuplicateUsername',
              status: 400
            } as AuthError 
          };
        }
        return { error: profileError as unknown as AuthError };
      }
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const signInWithGithub = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    signInWithGithub,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
