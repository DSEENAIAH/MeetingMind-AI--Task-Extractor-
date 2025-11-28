
import express from 'express';
import { supabase } from '../lib/supabase';

const router = express.Router();

// Middleware to check if user is authenticated (basic check via header)
// In a real app, you'd verify the JWT token
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'Missing authorization header' });
    }
    next();
};

// List teams for the current user
router.get('/', requireAuth, async (req, res) => {
    try {
        const userId = req.headers['x-user-id']; // Passed from frontend for simplicity in this demo

        if (!userId) {
            // Fallback: try to get from query if not in header (for testing)
            if (req.query.userId) {
                // It's okay for testing
            } else {
                return res.status(400).json({ error: 'User ID required' });
            }
        }

        const targetUserId = (req.headers['x-user-id'] as string) || (req.query.userId as string);

        console.log(`Fetching teams for user: ${targetUserId}`);

        // Get teams created by user OR where user is a member
        const { data, error } = await supabase
            .from('teams')
            .select(`
        *,
        team_members!inner (user_id)
      `)
            .eq('team_members.user_id', targetUserId);

        // Also get teams created by this user (even if not in members table, though they should be)
        const { data: createdTeams, error: createdError } = await supabase
            .from('teams')
            .select('*')
            .eq('created_by', targetUserId);

        if (error && createdError) {
            console.error('Error fetching teams:', error || createdError);
            return res.status(500).json({ error: 'Failed to fetch teams' });
        }

        // Combine and deduplicate
        const allTeams = [...(data || []).map((t: any) => {
            const { team_members, ...team } = t;
            return team;
        }), ...(createdTeams || [])];

        const uniqueTeams = Array.from(new Map(allTeams.map(item => [item.id, item])).values());

        // Fetch member counts for each team
        const teamsWithCounts = await Promise.all(uniqueTeams.map(async (team: any) => {
            const { count } = await supabase
                .from('team_members')
                .select('*', { count: 'exact', head: true })
                .eq('team_id', team.id)
                .neq('user_id', team.created_by);

            return {
                ...team,
                member_count: count || 0
            };
        }));

        res.json(teamsWithCounts);
    } catch (error) {
        console.error('Server error fetching teams:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a new team
router.post('/', requireAuth, async (req, res) => {
    try {
        const { name, createdBy } = req.body;

        if (!name || !createdBy) {
            return res.status(400).json({ error: 'Name and createdBy are required' });
        }

        console.log(`Creating team '${name}' for user ${createdBy}`);

        // 1. Create Team
        const { data: team, error: teamError } = await supabase
            .from('teams')
            .insert({ name, created_by: createdBy })
            .select()
            .single();

        if (teamError) {
            console.error('Error creating team:', teamError);
            return res.status(500).json({ error: 'Failed to create team' });
        }

        // 2. Add creator as a member (admin role)
        const { error: memberError } = await supabase
            .from('team_members')
            .insert({
                team_id: team.id,
                user_id: createdBy
            });

        if (memberError) {
            console.error('Error adding creator to team:', memberError);
            // Don't fail the request, but log it. 
        }

        res.json(team);
    } catch (error) {
        console.error('Server error creating team:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get team details
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('teams')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            return res.status(404).json({ error: 'Team not found' });
        }

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get team members
router.get('/:id/members', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Fetch team details to get creator
        const { data: teamData, error: teamError } = await supabase
            .from('teams')
            .select('created_by')
            .eq('id', id)
            .single();

        if (teamError) {
            return res.status(404).json({ error: 'Team not found' });
        }

        // 2. Fetch team members (excluding creator)
        const { data: members, error: membersError } = await supabase
            .from('team_members')
            .select('*')
            .eq('team_id', id)
            .neq('user_id', teamData.created_by);

        if (membersError) {
            console.error('Error fetching members:', membersError);
            return res.status(500).json({ error: 'Failed to fetch members' });
        }

        if (!members || members.length === 0) {
            return res.json([]);
        }

        // 2. Fetch user profiles for these members
        const userIds = members.map((m: any) => m.user_id);
        const { data: profiles, error: profilesError } = await supabase
            .from('user_profiles')
            .select('id, full_name, email, username, role')
            .in('id', userIds);

        if (profilesError) {
            console.error('Error fetching profiles:', profilesError);
            // Return members without profile data if profiles fail
            return res.json(members);
        }

        // 3. Merge data
        const profilesMap = new Map(profiles?.map((p: any) => [p.id, p]));

        const formattedData = members.map((member: any) => {
            const profile = profilesMap.get(member.user_id);
            return {
                ...member,
                name: profile?.full_name || 'Unknown User',
                email: profile?.email,
                username: profile?.username,
                role: profile?.role || 'member'
            };
        });

        res.json(formattedData);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add member to team
router.post('/:id/members', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, name, role, addedBy } = req.body;

        if (!userId || !name || !addedBy) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        console.log(`Adding user ${userId} to team ${id}`);

        const { data, error } = await supabase
            .from('team_members')
            .insert({
                team_id: id,
                user_id: userId
            })
            .select()
            .single();

        if (error) {
            console.error('Error adding member:', JSON.stringify(error, null, 2));
            // Check for duplicate
            if (error.code === '23505') {
                return res.status(409).json({ error: 'User is already in the team' });
            }
            return res.status(500).json({ error: 'Failed to add member' });
        }

        res.json(data);
    } catch (error) {
        console.error('Server error adding member:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get team stats
router.get('/:id/stats', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Fetch team details first to get created_by
        const { data: teamData, error: teamError } = await supabase
            .from('teams')
            .select('name, created_by')
            .eq('id', id)
            .single();

        if (teamError) {
            return res.status(404).json({ error: 'Team not found' });
        }

        // 2. Calculate stats manually
        const [
            { count: memberCount, error: memberError },
            { count: totalTasks, error: taskError },
            { count: completedTasks },
            { count: pendingTasks }
        ] = await Promise.all([
            // Exclude the creator from the member count
            supabase.from('team_members')
                .select('*', { count: 'exact', head: true })
                .eq('team_id', id)
                .neq('user_id', teamData.created_by),
            supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('team_id', id),
            supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('team_id', id).eq('status', 'completed'),
            supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('team_id', id).eq('status', 'pending')
        ]);

        res.json({
            team_id: id,
            team_name: teamData.name,
            member_count: memberCount || 0,
            total_tasks: totalTasks || 0,
            completed_tasks: completedTasks || 0,
            pending_tasks: pendingTasks || 0,
            in_progress_tasks: (totalTasks || 0) - (completedTasks || 0) - (pendingTasks || 0)
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete a team
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.headers['x-user-id'] as string;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        console.log(`Deleting team ${id} by user ${userId}`);

        // Check if user is the creator/owner of the team
        const { data: team, error: fetchError } = await supabase
            .from('teams')
            .select('created_by')
            .eq('id', id)
            .single();

        if (fetchError) {
            return res.status(404).json({ error: 'Team not found' });
        }

        if (team.created_by !== userId) {
            return res.status(403).json({ error: 'Only the team creator can delete the team' });
        }

        // Delete the team (cascade should handle members if configured, otherwise we might need to delete members first)
        // Assuming cascade is set up or we rely on supabase to handle it. 
        // If not, we should delete from team_members first.

        // Explicitly delete members first to be safe
        await supabase.from('team_members').delete().eq('team_id', id);

        const { error: deleteError } = await supabase
            .from('teams')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('Error deleting team:', deleteError);
            return res.status(500).json({ error: 'Failed to delete team' });
        }

        res.json({ message: 'Team deleted successfully' });
    } catch (error) {
        console.error('Server error deleting team:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
