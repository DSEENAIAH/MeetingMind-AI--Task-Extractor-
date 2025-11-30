/**
 * Client-side team management service
 * Replaces backend /api/teams endpoints
 */

import { supabase } from '../lib/supabase';

export class TeamsService {
  /**
   * Get user's teams (Created + Member)
   */
  static async getTeams(userId: string) {
    // console.log('TeamsService.getTeams: Called for user:', userId);

    // First, get teams where user is the creator
    const { data: createdTeams, error: createdError } = await supabase
      .from('teams')
      .select('*')
      .eq('created_by', userId);

    if (createdError) {
      console.error('TeamsService.getTeams: Error fetching created teams:', createdError);
      throw createdError;
    }
    // console.log('TeamsService.getTeams: Created teams:', createdTeams);

    // Get team members separately for created teams
    let teamsWithMembers = [];
    if (createdTeams && createdTeams.length > 0) {
      for (const team of createdTeams) {
        const { data: members, error: membersError } = await supabase
          .from('team_members')
          .select('*')
          .eq('team_id', team.id);

        if (membersError) console.error('Error fetching team members:', membersError);

        teamsWithMembers.push({
          ...team,
          team_members: members || [],
          member_count: members ? members.length : 0
        });
      }
    }

    // Then, get teams where user is a member (ONLY ACCEPTED)
    // console.log('TeamsService.getTeams: Fetching membership for user:', userId);
    const { data: membershipData, error: memberError } = await supabase
      .from('team_members')
      .select('team_id, status')
      .eq('user_id', userId)
      .eq('status', 'accepted');

    if (memberError) {
      console.error('TeamsService.getTeams: Error fetching membership:', memberError);
      throw memberError;
    }
    // console.log('TeamsService.getTeams: Membership data:', membershipData);

    // Get the actual team data for teams where user is a member
    if (membershipData && membershipData.length > 0) {
      const teamIds = membershipData.map(m => m.team_id);
      // console.log('TeamsService.getTeams: Fetching details for team IDs:', teamIds);

      const { data: memberTeams, error: memberTeamsError } = await supabase
        .from('teams')
        .select('*')
        .in('id', teamIds);

      if (memberTeamsError) {
        console.error('TeamsService.getTeams: Error fetching member teams:', memberTeamsError);
        throw memberTeamsError;
      }
      // console.log('TeamsService.getTeams: Member teams details:', memberTeams);

      // Add member teams that aren't already in created teams
      if (memberTeams) {
        for (const team of memberTeams) {
          if (!teamsWithMembers.find(existingTeam => existingTeam.id === team.id)) {
            const { data: members, error: membersError } = await supabase
              .from('team_members')
              .select('*')
              .eq('team_id', team.id);

            if (membersError) console.error('Error fetching team members:', membersError);

            teamsWithMembers.push({
              ...team,
              team_members: members || [],
              member_count: members ? members.length : 0
            });
          }
        }
      }
    }

    // console.log('TeamsService.getTeams: Final teams list:', teamsWithMembers);
    return teamsWithMembers;
  }

  /**
   * Get teams where user is an accepted member (for Workers)
   */
  static async getJoinedTeams(userId: string) {
    // console.log('TeamsService.getJoinedTeams: Called for user:', userId);

    // Get teams where user is a member (ONLY ACCEPTED)
    const { data: membershipData, error: memberError } = await supabase
      .from('team_members')
      .select('team_id, status')
      .eq('user_id', userId)
      .eq('status', 'accepted');

    if (memberError) {
      console.error('TeamsService.getJoinedTeams: Error fetching membership:', memberError);
      throw memberError;
    }

    if (!membershipData || membershipData.length === 0) {
      return [];
    }

    // Deduplicate team IDs
    const teamIds = [...new Set(membershipData.map(m => m.team_id))];

    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .in('id', teamIds);

    if (teamsError) {
      console.error('TeamsService.getJoinedTeams: Error fetching teams:', teamsError);
      throw teamsError;
    }

    // Fetch members for these teams to keep structure consistent
    let teamsWithMembers = [];
    if (teams) {
      for (const team of teams) {
        const { data: members, error: membersError } = await supabase
          .from('team_members')
          .select('*')
          .eq('team_id', team.id);

        if (membersError) console.error('Error fetching team members:', membersError);

        teamsWithMembers.push({
          ...team,
          team_members: members || [],
          member_count: members ? members.length : 0
        });
      }
    }

    // console.log('TeamsService.getJoinedTeams: Returning teams:', teamsWithMembers);
    return teamsWithMembers;
  }

  /**
   * Create a new team
   */
  static async createTeam(name: string, userId: string) {
    const { data, error } = await supabase
      .from('teams')
      .insert([{ name, created_by: userId }])
      .select()
      .single();

    if (error) throw error;

    // ADD CREATOR AS MEMBER
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('full_name, username')
      .eq('id', userId)
      .single();

    const memberName = userProfile?.full_name || userProfile?.username || 'Team Owner';

    await supabase.from('team_members').insert({
      team_id: data.id,
      user_id: userId,
      role: 'owner',
      status: 'accepted',
      name: memberName
    });

    return data;
  }

  /**
   * Add team members
   */
  static async addTeamMembers(teamId: string, userIds: string[], addedBy: string) {
    // Fetch user profiles to get names
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching user profiles for new members:', profilesError);
    }

    const membersToAdd = userIds.map(userId => {
      const profile = profiles?.find(p => p.id === userId);
      return {
        team_id: teamId,
        user_id: userId,
        added_by: addedBy,
        role: 'Member',
        name: profile?.full_name || 'Unknown User',
        status: 'pending'
      };
    });

    const { data, error } = await supabase
      .from('team_members')
      .insert(membersToAdd)
      .select();

    if (error) throw error;

    // Send notifications
    try {
      const notifications = userIds.map(userId => ({
        user_id: userId,
        type: 'team_invitation',
        title: 'Team Invitation',
        message: `You have been invited to join a team.`,
        data: { team_id: teamId, added_by: addedBy }
      }));

      await supabase.from('notifications').insert(notifications);
    } catch (notifyError) {
      console.error('Failed to send notifications:', notifyError);
    }

    return data;
  }

  /**
   * Get team members
   */
  static async getTeamMembers(teamId: string) {
    const { data: members, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId);

    if (error) throw error;

    // Fetch user profiles to get emails (if available in profiles)
    if (members && members.length > 0) {
      const userIds = members.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, username, email')
        .in('id', userIds);

      return members.map(member => {
        const profile = profiles?.find(p => p.id === member.user_id);
        return {
          ...member,
          email: profile?.email || (profile?.username ? `${profile.username}@example.com` : 'No Email')
        };
      });
    }

    return members;
  }

  /**
   * Get team statistics
   */
  static async getTeamStats(teamId: string) {
    // Get tasks for this team
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('status')
      .eq('team_id', teamId);

    if (tasksError) throw tasksError;

    // Get team members count
    const { data: members, error: membersError } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', teamId);

    if (membersError) throw membersError;

    const stats = {
      total: tasks?.length || 0,
      pending: tasks?.filter(t => t.status === 'pending').length || 0,
      inProgress: tasks?.filter(t => t.status === 'in-progress').length || 0,
      completed: tasks?.filter(t => t.status === 'completed').length || 0,
      memberCount: members?.length || 0,
    };

    return stats;
  }
}

export default TeamsService;