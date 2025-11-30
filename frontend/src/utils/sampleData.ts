/**
 * Sample data utilities for demonstrating the dashboard with real database data
 * This creates actual records in Supabase for testing purposes
 */

import { supabase } from '../lib/supabase';

export const createSampleDataForTeam = async (teamId: string, userId: string, userProfile: any) => {
  try {
    // console.log('Creating sample data for team:', teamId, 'user:', userId);

    // Check if team already has members and tasks
    const { data: existingMembers } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId);

    const { data: existingTasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('team_id', teamId);

    /* console.log('Checking team data:', { 
      teamId,
      existingMembers: existingMembers?.length,
      existingTasks: existingTasks?.length
    }); */

    // Only skip if we have both members AND tasks
    if (existingMembers && existingMembers.length > 0 && existingTasks && existingTasks.length > 0) {
      // console.log('Team already has sufficient data, skipping sample creation');
      return;
    }

    // 1. Add the current user as a team member if not already added
    const { data: userMembership } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
      .eq('user_id', userId);

    if (!userMembership || userMembership.length === 0) {
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: teamId,
          user_id: userId,
          name: userProfile?.full_name || 'Team Lead',
          role: 'Team Lead',
          added_by: userId,
        });

      if (memberError) {
        console.error('Error adding user to team:', memberError);
      } else {
        // console.log('Added user as team member');
      }
    }

    // Note: Cannot add sample members with fake user_id because of foreign key constraint
    // Team members must be real users from auth.users table

    // 2. Create sample tasks for this team
    const sampleTasks = [
      {
        team_id: teamId,
        description: 'Review and optimize the user authentication flow',
        assigned_to: userId,
        assigned_by: userId,
        priority: 'high',
        status: 'in-progress'
      },
      {
        team_id: teamId,
        description: 'Implement responsive design for mobile devices',
        assigned_to: userId,
        assigned_by: userId,
        priority: 'medium',
        status: 'pending'
      },
      {
        team_id: teamId,
        description: 'Write unit tests for core components',
        assigned_to: userId,
        assigned_by: userId,
        priority: 'medium',
        status: 'completed'
      },
      {
        team_id: teamId,
        description: 'Optimize database queries for better performance',
        assigned_to: userId,
        assigned_by: userId,
        priority: 'high',
        status: 'pending'
      },
      {
        team_id: teamId,
        description: 'Set up automated deployment pipeline',
        assigned_to: userId,
        assigned_by: userId,
        priority: 'low',
        status: 'completed'
      }
    ];

    const { error: taskError } = await supabase
      .from('tasks')
      .insert(sampleTasks);

    if (taskError) {
      console.error('Error creating sample tasks:', taskError);
    } else {
      // console.log('Sample tasks created successfully for team:', teamId);
    }

  } catch (error) {
    console.error('Error creating sample data for team:', error);
  }
};

export const createSampleData = async (userId: string, userProfile: any) => {
  try {
    // console.log('Creating sample data for user:', userId);

    // 1. Create sample teams if none exist
    const { data: existingTeams } = await supabase
      .from('teams')
      .select('*')
      .eq('created_by', userId);

    if (!existingTeams || existingTeams.length === 0) {
      const sampleTeams = [
        { name: 'Frontend Development Team', created_by: userId },
        { name: 'Backend API Team', created_by: userId },
      ];

      const { data: newTeams, error: teamError } = await supabase
        .from('teams')
        .insert(sampleTeams)
        .select();

      if (teamError) {
        console.error('Error creating sample teams:', teamError);
        return;
      }

      // Create sample data for each team
      if (newTeams) {
        for (const team of newTeams) {
          await createSampleDataForTeam(team.id, userId, userProfile);
        }
        // console.log('Sample data created successfully!');
        return newTeams;
      }
    }

    return existingTeams;
  } catch (error) {
    console.error('Error creating sample data:', error);
  }
};

export const checkAndCreateSampleData = async (userId: string) => {
  try {
    // First ensure user profile exists
    let { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError && profileError.code === 'PGRST116') {
      // User profile doesn't exist, create it
      const { data: authUser } = await supabase.auth.getUser();
      const userMetadata = authUser?.user?.user_metadata;

      const { data: newProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          username: `user_${userId.substring(0, 8)}`,
          full_name: userMetadata?.full_name || 'Team Member',
          role: userMetadata?.role || 'developer'
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating user profile:', createError);
        return;
      }
      userProfile = newProfile;
    }

    // Check if user has any teams
    const { data: teams } = await supabase
      .from('teams')
      .select('*')
      .eq('created_by', userId);

    // Check if user has any tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('assigned_to', userId);

    // If no teams or tasks, create sample data
    if ((!teams || teams.length === 0) && (!tasks || tasks.length === 0)) {
      await createSampleData(userId, userProfile);
    }
  } catch (error) {
    console.error('Error checking for sample data:', error);
  }
};

// Function to create sample data for a specific team (useful when viewing a team dashboard)
export const ensureTeamHasData = async (teamId: string, userId: string) => {
  try {
    // Get user profile
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (userProfile) {
      await createSampleDataForTeam(teamId, userId, userProfile);
    }
  } catch (error) {
    console.error('Error ensuring team has data:', error);
  }
};