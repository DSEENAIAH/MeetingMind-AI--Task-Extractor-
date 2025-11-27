-- MeetingMind AI - Supabase Database Schema
-- Run these queries in your Supabase SQL Editor

-- =====================================================
-- 1. USER PROFILES TABLE
-- Store additional user info with unique constraints
-- =====================================================
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for username lookups
CREATE INDEX idx_user_profiles_username ON user_profiles(username);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all profiles
CREATE POLICY "Anyone can view user profiles" ON user_profiles
  FOR SELECT
  USING (true);

-- Policy: Users can only update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Policy: Users can insert their own profile (during signup)
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);


-- =====================================================
-- 2. TEAMS TABLE
-- Store teams created by officials (managers, TLs, etc.)
-- =====================================================
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- =====================================================
-- 3. TEAM MEMBERS TABLE
-- Store members of each team
-- =====================================================
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(100) NOT NULL,
  added_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);


-- =====================================================
-- 4. ENABLE RLS AND ADD POLICIES FOR TEAMS
-- (Must be after team_members table is created)
-- =====================================================

-- Add RLS (Row Level Security) policies for teams
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view teams they created or are members of
CREATE POLICY "Users can view their teams" ON teams
  FOR SELECT
  USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = teams.id
      AND team_members.user_id = auth.uid()
    )
  );

-- Policy: Only officials can create teams (based on role in auth metadata)
CREATE POLICY "Officials can create teams" ON teams
  FOR INSERT
  WITH CHECK (
    auth.uid() = created_by AND
    (auth.jwt() -> 'user_metadata' ->> 'role') IN (
      'ceo', 'cto', 'vp_engineering', 'director', 
      'engineering_manager', 'product_manager', 'team_lead', 'hr_manager'
    )
  );

-- Policy: Team creators can update their teams
CREATE POLICY "Creators can update their teams" ON teams
  FOR UPDATE
  USING (auth.uid() = created_by);

-- Policy: Team creators can delete their teams
CREATE POLICY "Creators can delete their teams" ON teams
  FOR DELETE
  USING (auth.uid() = created_by);


-- =====================================================
-- 5. RLS POLICIES FOR TEAM MEMBERS
-- =====================================================

-- Policy: Users can view members of teams they're part of
CREATE POLICY "Users can view team members" ON team_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_members.team_id
      AND (teams.created_by = auth.uid() OR team_members.user_id = auth.uid())
    )
  );

-- Policy: Team creators can add members
CREATE POLICY "Team creators can add members" ON team_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_members.team_id
      AND teams.created_by = auth.uid()
    )
  );

-- Policy: Team creators can remove members
CREATE POLICY "Team creators can remove members" ON team_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_members.team_id
      AND teams.created_by = auth.uid()
    )
  );


-- =====================================================
-- 6. TASKS TABLE
-- Store tasks extracted from transcripts
-- =====================================================
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to_name VARCHAR(255),
  assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed')),
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  transcript_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes for better performance
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_assigned_by ON tasks(assigned_by);
CREATE INDEX idx_tasks_team_id ON tasks(team_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);

-- Add RLS policies for tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view tasks in their teams
CREATE POLICY "Users can view tasks in their teams" ON tasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = tasks.team_id
      AND (
        teams.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members
          WHERE team_members.team_id = teams.id
          AND team_members.user_id = auth.uid()
        )
      )
    )
  );

-- Policy: Officials can create tasks for their teams
CREATE POLICY "Officials can create tasks" ON tasks
  FOR INSERT
  WITH CHECK (
    auth.uid() = assigned_by AND
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = tasks.team_id
      AND teams.created_by = auth.uid()
    )
  );

-- Policy: Task assignees can update task status
CREATE POLICY "Assignees can update task status" ON tasks
  FOR UPDATE
  USING (auth.uid() = assigned_to OR auth.uid() = assigned_by);

-- Policy: Task creators can delete tasks
CREATE POLICY "Task creators can delete tasks" ON tasks
  FOR DELETE
  USING (auth.uid() = assigned_by);


-- =====================================================
-- 7. TRANSCRIPTS TABLE
-- Store meeting transcripts for reference
-- =====================================================
CREATE TABLE transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for better performance
CREATE INDEX idx_transcripts_team_id ON transcripts(team_id);
CREATE INDEX idx_transcripts_created_at ON transcripts(created_at DESC);

-- Add RLS policies for transcripts
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;

-- Policy: Team members can view transcripts
CREATE POLICY "Team members can view transcripts" ON transcripts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = transcripts.team_id
      AND (
        teams.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members
          WHERE team_members.team_id = teams.id
          AND team_members.user_id = auth.uid()
        )
      )
    )
  );

-- Policy: Officials can create transcripts
CREATE POLICY "Officials can create transcripts" ON transcripts
  FOR INSERT
  WITH CHECK (
    auth.uid() = uploaded_by AND
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = transcripts.team_id
      AND teams.created_by = auth.uid()
    )
  );


-- =====================================================
-- 8. FUNCTIONS & TRIGGERS
-- Auto-update timestamps
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for teams table
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for tasks table
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-set completed_at when task is completed
CREATE OR REPLACE FUNCTION set_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();
  ELSIF NEW.status != 'completed' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-setting completed_at
CREATE TRIGGER task_completed_trigger
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_task_completed_at();


-- =====================================================
-- 9. HELPER VIEWS
-- For easier querying
-- =====================================================

-- View: User's tasks with team and assigner info
CREATE OR REPLACE VIEW user_tasks_view AS
SELECT 
  t.id,
  t.description,
  t.status,
  t.priority,
  t.created_at,
  t.updated_at,
  t.completed_at,
  t.assigned_to_name,
  teams.name as team_name,
  auth_users.raw_user_meta_data->>'full_name' as assigned_by_name
FROM tasks t
LEFT JOIN teams ON teams.id = t.team_id
LEFT JOIN auth.users auth_users ON auth_users.id = t.assigned_by
WHERE t.assigned_to = auth.uid();

-- View: Team statistics
CREATE OR REPLACE VIEW team_stats_view AS
SELECT 
  teams.id as team_id,
  teams.name as team_name,
  COUNT(DISTINCT team_members.id) as member_count,
  COUNT(DISTINCT tasks.id) as total_tasks,
  COUNT(DISTINCT CASE WHEN tasks.status = 'completed' THEN tasks.id END) as completed_tasks,
  COUNT(DISTINCT CASE WHEN tasks.status = 'in-progress' THEN tasks.id END) as in_progress_tasks,
  COUNT(DISTINCT CASE WHEN tasks.status = 'pending' THEN tasks.id END) as pending_tasks
FROM teams
LEFT JOIN team_members ON team_members.team_id = teams.id
LEFT JOIN tasks ON tasks.team_id = teams.id
GROUP BY teams.id, teams.name;


-- =====================================================
-- 10. SAMPLE DATA (Optional - for testing)
-- =====================================================

-- You can uncomment this section to add sample data for testing
-- Replace the UUIDs with actual user IDs from your auth.users table

/*
-- Example: Insert a sample team
INSERT INTO teams (name, created_by) VALUES 
  ('Development Team', 'YOUR_USER_ID_HERE');

-- Example: Insert sample team members
INSERT INTO team_members (team_id, user_id, name, role, added_by) VALUES
  ((SELECT id FROM teams WHERE name = 'Development Team'), 'USER_ID_1', 'John Doe', 'Senior Developer', 'YOUR_USER_ID_HERE'),
  ((SELECT id FROM teams WHERE name = 'Development Team'), 'USER_ID_2', 'Jane Smith', 'QA Engineer', 'YOUR_USER_ID_HERE');

-- Example: Insert sample tasks
INSERT INTO tasks (team_id, description, assigned_to, assigned_to_name, assigned_by, priority) VALUES
  ((SELECT id FROM teams WHERE name = 'Development Team'), 'Fix login bug', 'USER_ID_1', 'John Doe', 'YOUR_USER_ID_HERE', 'high'),
  ((SELECT id FROM teams WHERE name = 'Development Team'), 'Write unit tests', 'USER_ID_2', 'Jane Smith', 'YOUR_USER_ID_HERE', 'medium');
*/


-- =====================================================
-- NOTES:
-- =====================================================
-- 1. Run these queries in order in your Supabase SQL Editor
-- 2. RLS policies ensure users can only see/modify data they have access to
-- 3. The role check in policies uses the 'role' field from user_metadata (set during signup)
-- 4. All timestamps are in UTC
-- 5. Indexes are added for better query performance
-- 6. Triggers automatically update timestamps and completed_at fields
-- 7. Views provide convenient queries for common use cases
