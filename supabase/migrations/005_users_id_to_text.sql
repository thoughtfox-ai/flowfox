-- ============================================
-- CHANGE users.id FROM UUID TO TEXT
-- Required for NextAuth Google OAuth (Google IDs are strings, not UUIDs)
-- ============================================

-- Step 1: Drop ALL RLS policies on users table that reference id column
DROP POLICY IF EXISTS "Users can view themselves" ON users;
DROP POLICY IF EXISTS "Users can view workspace members" ON users;
DROP POLICY IF EXISTS "Users can update themselves" ON users;
DROP POLICY IF EXISTS "Users can insert themselves" ON users;

-- Step 2: Drop ALL foreign key constraints that reference users(id)
ALTER TABLE workspace_members DROP CONSTRAINT IF EXISTS workspace_members_user_id_fkey;
ALTER TABLE board_members DROP CONSTRAINT IF EXISTS board_members_user_id_fkey;
ALTER TABLE workspaces DROP CONSTRAINT IF EXISTS workspaces_created_by_fkey;
ALTER TABLE boards DROP CONSTRAINT IF EXISTS boards_created_by_fkey;
ALTER TABLE cards DROP CONSTRAINT IF EXISTS cards_created_by_fkey;
ALTER TABLE google_task_list_mappings DROP CONSTRAINT IF EXISTS google_task_list_mappings_user_id_fkey;
ALTER TABLE card_assignments DROP CONSTRAINT IF EXISTS card_assignments_user_id_fkey;
ALTER TABLE subtasks DROP CONSTRAINT IF EXISTS subtasks_assignee_id_fkey;
ALTER TABLE card_dependencies DROP CONSTRAINT IF EXISTS card_dependencies_created_by_fkey;
ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS time_entries_user_id_fkey;
ALTER TABLE recurring_tasks DROP CONSTRAINT IF EXISTS recurring_tasks_created_by_fkey;
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_user_id_fkey;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE notification_preferences DROP CONSTRAINT IF EXISTS notification_preferences_user_id_fkey;

-- Step 3: Change users.id column type from UUID to TEXT
ALTER TABLE users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE users ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- Step 4: Change ALL foreign key columns from UUID to TEXT
ALTER TABLE workspace_members ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE board_members ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE workspaces ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;
ALTER TABLE boards ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;
ALTER TABLE cards ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;
ALTER TABLE google_task_list_mappings ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE card_assignments ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE subtasks ALTER COLUMN assignee_id TYPE TEXT USING assignee_id::TEXT;
ALTER TABLE card_dependencies ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;
ALTER TABLE time_entries ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE recurring_tasks ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;
ALTER TABLE activities ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE notifications ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE notification_preferences ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Step 5: Re-add ALL foreign key constraints
ALTER TABLE workspace_members
  ADD CONSTRAINT workspace_members_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE board_members
  ADD CONSTRAINT board_members_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE workspaces
  ADD CONSTRAINT workspaces_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id);

ALTER TABLE boards
  ADD CONSTRAINT boards_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id);

ALTER TABLE cards
  ADD CONSTRAINT cards_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id);

ALTER TABLE google_task_list_mappings
  ADD CONSTRAINT google_task_list_mappings_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE card_assignments
  ADD CONSTRAINT card_assignments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE subtasks
  ADD CONSTRAINT subtasks_assignee_id_fkey
  FOREIGN KEY (assignee_id) REFERENCES users(id);

ALTER TABLE card_dependencies
  ADD CONSTRAINT card_dependencies_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id);

ALTER TABLE time_entries
  ADD CONSTRAINT time_entries_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE recurring_tasks
  ADD CONSTRAINT recurring_tasks_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id);

ALTER TABLE activities
  ADD CONSTRAINT activities_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE notifications
  ADD CONSTRAINT notifications_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE notification_preferences
  ADD CONSTRAINT notification_preferences_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Step 6: Update current_user_id() function to return TEXT instead of UUID
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS TEXT AS $$
BEGIN
  -- Try to get from request context (set by API routes with service role)
  -- Falls back to auth.uid() for backwards compatibility
  RETURN COALESCE(
    current_setting('request.jwt.claims.sub', true),
    auth.uid()::TEXT
  );
EXCEPTION
  WHEN OTHERS THEN
    -- If all else fails, return NULL (same as auth.uid() when not authenticated)
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 7: Update helper functions to work with TEXT user IDs
CREATE OR REPLACE FUNCTION is_workspace_member(workspace_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_id = workspace_uuid AND user_id = current_user_id()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_access_board(board_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM board_members
        WHERE board_id = board_uuid AND user_id = current_user_id()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_edit_board(board_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM board_members
        WHERE board_id = board_uuid
        AND user_id = current_user_id()
        AND role IN ('admin', 'contributor')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Re-create ALL RLS policies on users table with TEXT type
CREATE POLICY "Users can view themselves"
  ON users
  FOR SELECT
  USING (id = current_user_id());

CREATE POLICY "Users can view workspace members"
  ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm1
      JOIN workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
      WHERE wm1.user_id = current_user_id() AND wm2.user_id = users.id
    )
  );

CREATE POLICY "Users can update themselves"
  ON users
  FOR UPDATE
  USING (id = current_user_id());

CREATE POLICY "Users can insert themselves"
  ON users
  FOR INSERT
  WITH CHECK (id = current_user_id());

-- Note: This allows NextAuth to use Google's user IDs (strings) as primary keys
-- Example Google ID: "117492150812345678901"
