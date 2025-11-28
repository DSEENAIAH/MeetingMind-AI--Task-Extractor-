import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// GET /api/tasks
// List tasks with filters
router.get('/', async (req: Request, res: Response) => {
    const { userId, teamId, status, deleted } = req.query;

    console.log('[Tasks] GET / request:', { userId, teamId, status, deleted });

    try {
        // Fetch tasks without join first to avoid FK issues
        let query = supabase
            .from('tasks')
            .select(`
                *,
                team:teams(name)
            `)
            .order('created_at', { ascending: false });

        // Filter by deleted status
        if (deleted === 'true') {
            query = query.not('deleted_at', 'is', null);
        } else {
            query = query.is('deleted_at', null);
        }

        // Filter by assignee (for workers)
        if (userId) {
            console.log('[Tasks] Filtering by userId:', userId);
            query = query.eq('assigned_to', userId);
        }

        // Filter by team (for managers)
        if (teamId) {
            query = query.eq('team_id', teamId);
        }

        // Filter by status
        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        const { data: tasksData, error } = await query;

        if (error) throw error;

        console.log(`[Tasks] Found ${tasksData.length} tasks`);

        // Manually fetch user profiles for assignees
        const userIds = [...new Set(tasksData.map(t => t.assigned_to).filter(Boolean))];
        const userMap = new Map();

        if (userIds.length > 0) {
            const { data: profiles, error: profilesError } = await supabase
                .from('user_profiles')
                .select('id, full_name, username')
                .in('id', userIds);

            if (!profilesError && profiles) {
                profiles.forEach(p => {
                    userMap.set(p.id, p);
                });
            } else {
                console.error('[Tasks] Error fetching profiles:', profilesError);
            }
        }

        // Transform data to include assigner name
        const tasks = tasksData.map(task => {
            const assignee = task.assigned_to ? userMap.get(task.assigned_to) : null;
            return {
                ...task,
                teamName: task.team?.name,
                assignedByName: assignee?.full_name || assignee?.username || 'Unknown'
            };
        });

        res.json(tasks);
    } catch (error: any) {
        console.error('[Tasks] Error listing tasks:', error);
        res.status(500).json({
            error: 'Failed to list tasks',
            details: error.message || error,
            hint: error.hint || error.details
        });
    }
});

// POST /api/tasks
// Create new tasks (batch)
router.post('/', async (req: Request, res: Response) => {
    const { tasks, teamId, assignedBy } = req.body;

    if (!tasks || !Array.isArray(tasks) || !teamId || !assignedBy) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // 1. Get team members to find their user IDs
        const { data: teamMembers, error: membersError } = await supabase
            .from('team_members')
            .select('user_id')
            .eq('team_id', teamId);

        if (membersError) {
            console.error('[Tasks] Error fetching team members:', membersError);
            throw membersError;
        }

        // 2. Fetch profiles for these members to get their names
        const userIds = teamMembers?.map(m => m.user_id) || [];
        const { data: profiles, error: profilesError } = await supabase
            .from('user_profiles')
            .select('id, full_name, username')
            .in('id', userIds);

        if (profilesError) {
            console.error('[Tasks] Error fetching profiles:', profilesError);
            throw profilesError;
        }

        const memberMap = new Map(); // Name -> UUID
        const idToNameMap = new Map(); // UUID -> Name

        profiles?.forEach(p => {
            if (p.full_name) memberMap.set(p.full_name.toLowerCase(), p.id);
            if (p.username) memberMap.set(p.username.toLowerCase(), p.id);
            idToNameMap.set(p.id, p.full_name || p.username);
        });

        // Prepare tasks for insertion
        const tasksToInsert = tasks.map((task: any) => {
            let assignedTo = null;

            // Check if assignee is a UUID (simple regex, trimmed)
            const cleanAssignee = task.assignee ? task.assignee.trim() : '';
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanAssignee);

            if (isUUID) {
                assignedTo = cleanAssignee;
            } else if (task.assignee) {
                // It's a name, try to resolve to UUID
                assignedTo = memberMap.get(task.assignee.toLowerCase()) || null;
            }

            return {
                team_id: teamId,
                title: task.title || task.description?.substring(0, 50) || 'Untitled Task',
                description: task.description || task.title, // Handle both formats
                assigned_to: assignedTo,
                assigned_by: assignedBy,
                status: 'pending',
                priority: task.priority || 'medium',
                created_at: new Date().toISOString()
            };
        });

        console.log('[Tasks] Inserting tasks:', JSON.stringify(tasksToInsert, null, 2));

        const { data, error } = await supabase
            .from('tasks')
            .insert(tasksToInsert)
            .select();

        if (error) {
            console.error('[Tasks] Supabase insert error:', error);
            throw error;
        }

        res.json(data);
    } catch (error: any) {
        console.error('[Tasks] Error creating tasks:', error);
        res.status(500).json({
            error: 'Failed to create tasks',
            details: error.message || error,
            hint: error.hint || error.details
        });
    }
});

// PATCH /api/tasks/:id/status
// Update task status
router.patch('/:id/status', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'in-progress', 'completed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    console.log(`[Tasks] PATCH /${id}/status request:`, { status });

    try {
        const updateData: any = { status };

        const { data, error } = await supabase
            .from('tasks')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('[Tasks] Supabase update error:', error);
            throw error;
        }

        console.log('[Tasks] Task updated:', data);
        res.json(data);
    } catch (error: any) {
        console.error('[Tasks] Error updating task:', error);
        res.status(500).json({
            error: 'Failed to update task',
            details: error.message || error
        });
    }
});

// PUT /api/tasks/:id
// Update task details
router.put('/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { title, description, priority, assigned_to } = req.body;

    console.log(`[Tasks] PUT /${id} request:`, req.body);

    try {
        const updateData: any = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (priority !== undefined) updateData.priority = priority;
        if (assigned_to !== undefined) updateData.assigned_to = assigned_to;

        const { data, error } = await supabase
            .from('tasks')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json(data);
    } catch (error: any) {
        console.error('[Tasks] Error updating task details:', error);
        res.status(500).json({ error: 'Failed to update task details' });
    }
});

// PATCH /api/tasks/:id/restore
// Restore a soft-deleted task
router.patch('/:id/restore', async (req: Request, res: Response) => {
    const { id } = req.params;
    console.log(`[Tasks] PATCH /${id}/restore request`);

    try {
        const { data, error } = await supabase
            .from('tasks')
            .update({ deleted_at: null })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        console.log('[Tasks] Task restored:', data);
        res.json(data);
    } catch (error: any) {
        console.error('[Tasks] Error restoring task:', error);
        res.status(500).json({
            error: 'Failed to restore task',
            details: error.message || error
        });
    }
});

// DELETE /api/tasks/:id
// Delete a task (Soft by default, Hard if force=true)
router.delete('/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { force } = req.query;
    const isHardDelete = force === 'true';

    console.log(`[Tasks] DELETE /${id} request (Force: ${isHardDelete})`);

    try {
        let error;
        if (isHardDelete) {
            // Hard Delete
            const result = await supabase
                .from('tasks')
                .delete()
                .eq('id', id);
            error = result.error;
        } else {
            // Soft Delete
            const result = await supabase
                .from('tasks')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id);
            error = result.error;
        }

        if (error) throw error;

        res.json({ success: true, mode: isHardDelete ? 'hard' : 'soft' });
    } catch (error: any) {
        console.error('[Tasks] Error deleting task:', error);
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

// GET /api/tasks/stats
// Get team statistics
router.get('/stats', async (req: Request, res: Response) => {
    const { teamId } = req.query;

    if (!teamId) {
        return res.status(400).json({ error: 'Missing teamId' });
    }

    try {
        const { data, error } = await supabase
            .from('tasks')
            .select('status, assigned_to')
            .eq('team_id', teamId)
            .is('deleted_at', null); // Exclude deleted tasks from stats

        if (error) throw error;

        const stats = {
            total: data.length,
            pending: data.filter(t => t.status === 'pending').length,
            inProgress: data.filter(t => t.status === 'in-progress').length,
            completed: data.filter(t => t.status === 'completed').length,
            byAssignee: {} as Record<string, number>
        };

        data.forEach(t => {
            const name = t.assigned_to || 'Unassigned';
            stats.byAssignee[name] = (stats.byAssignee[name] || 0) + 1;
        });

        res.json(stats);
    } catch (error) {
        console.error('[Tasks] Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

export default router;
