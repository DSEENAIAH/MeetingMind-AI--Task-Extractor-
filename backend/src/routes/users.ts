
import express from 'express';
import { supabase } from '../lib/supabase';

const router = express.Router();

// Search users by username or email
router.get('/search', async (req, res) => {
    try {
        const { query } = req.query;

        if (!query || typeof query !== 'string' || query.length < 2) {
            return res.status(400).json({ error: 'Query must be at least 2 characters' });
        }

        console.log(`Searching for users with query: ${query}`);

        // 1. Search in user_profiles table
        const { data: profiles, error: profileError } = await supabase
            .from('user_profiles')
            .select('id, username, full_name, role, email')
            .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
            .limit(10);

        if (profileError) {
            console.error('Error searching user_profiles:', profileError);
            return res.status(500).json({ error: 'Failed to search users' });
        }

        // 2. If no profiles found (or even if found, to be safe), check auth.users for missing profiles
        // This is a self-healing step for users who signed up but trigger failed
        if (!profiles || profiles.length === 0) {
            console.log('No profiles found, checking auth.users...');

            const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();

            if (authError) {
                console.error('Error listing auth users:', authError);
                // Return empty list if we can't check auth users
                return res.json([]);
            }

            const lowerQuery = query.toLowerCase();
            const matchedAuthUsers = users.filter(u => {
                const username = u.user_metadata?.username || '';
                const fullName = u.user_metadata?.full_name || '';
                const email = u.email || '';
                return username.toLowerCase().includes(lowerQuery) ||
                    fullName.toLowerCase().includes(lowerQuery) ||
                    email.toLowerCase().includes(lowerQuery);
            });

            if (matchedAuthUsers.length > 0) {
                console.log(`Found ${matchedAuthUsers.length} matching users in auth. Syncing profiles...`);

                const newProfiles = [];
                for (const u of matchedAuthUsers) {
                    const profile = {
                        id: u.id,
                        username: u.user_metadata?.username || `user_${u.id.substring(0, 8)}`,
                        full_name: u.user_metadata?.full_name || 'Unknown User',
                        role: u.user_metadata?.role || 'developer',
                        email: u.email
                    };

                    // Upsert into user_profiles
                    const { error: upsertError } = await supabase
                        .from('user_profiles')
                        .upsert(profile);

                    if (!upsertError) {
                        newProfiles.push(profile);
                    } else {
                        console.error(`Failed to sync profile for ${u.id}:`, upsertError);
                    }
                }

                // Return the newly synced profiles
                return res.json(newProfiles);
            }
        }

        res.json(profiles);
    } catch (error) {
        console.error('Server error searching users:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Middleware to check if user is authenticated
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'Missing authorization header' });
    }
    next();
};

// Get current user profile
router.get('/me', requireAuth, async (req, res) => {
    try {
        const userId = req.headers['x-user-id'] as string;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            return res.status(404).json({ error: 'Profile not found' });
        }
        res.json(data);
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update current user profile
router.put('/me', requireAuth, async (req, res) => {
    try {
        const userId = req.headers['x-user-id'] as string;
        const { full_name } = req.body;

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { data, error } = await supabase
            .from('user_profiles')
            .update({ full_name })
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            console.error('Error updating profile:', error);
            return res.status(500).json({ error: 'Failed to update profile' });
        }

        // Also update auth metadata
        await supabase.auth.admin.updateUserById(userId, {
            user_metadata: { full_name }
        });

        res.json(data);
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update password
router.put('/password', requireAuth, async (req, res) => {
    try {
        const userId = req.headers['x-user-id'] as string;
        const { password, currentPassword } = req.body;

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        if (!password || password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        if (!currentPassword) {
            return res.status(400).json({ error: 'Current password is required' });
        }

        // 1. Get user email to verify current password
        const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);

        if (userError || !user || !user.email) {
            return res.status(404).json({ error: 'User not found' });
        }

        // 2. Verify current password by attempting to sign in
        // We use a separate client or REST call to avoid affecting the admin client session,
        // but signInWithPassword returns a session without setting it on the client if we don't use auth.setSession
        // However, with the admin client, it's safer to use the REST API to verify credentials.

        const authResponse = await fetch(`${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': process.env.SUPABASE_SERVICE_KEY || '' // Service key can usually perform auth actions
            },
            body: JSON.stringify({
                email: user.email,
                password: currentPassword
            })
        });

        if (!authResponse.ok) {
            return res.status(400).json({ error: 'Incorrect current password' });
        }

        // 3. Update to new password
        const { error } = await supabase.auth.admin.updateUserById(userId, {
            password: password
        });

        if (error) {
            console.error('Error updating password:', error);
            return res.status(500).json({ error: error.message });
        }

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error updating password:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
