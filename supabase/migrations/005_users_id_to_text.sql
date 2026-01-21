-- ============================================
-- CHANGE users.id FROM UUID TO TEXT
-- Required for NextAuth Google OAuth (Google IDs are strings, not UUIDs)
-- ============================================

-- Step 1: Drop ALL RLS policies on ALL tables
-- (Policies reference user_id/created_by columns we're about to alter)

-- Users policies
DROP POLICY IF EXISTS "Users can view themselves" ON users;
DROP POLICY IF EXISTS "Users can view workspace members" ON users;
DROP POLICY IF EXISTS "Users can update themselves" ON users;
DROP POLICY IF EXISTS "Users can insert themselves" ON users;

-- Workspaces policies
DROP POLICY IF EXISTS "Workspace members can view" ON workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
DROP POLICY IF EXISTS "Admins can update workspace" ON workspaces;

-- Workspace members policies
DROP POLICY IF EXISTS "Members can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Admins can add workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Admins can update workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Admins can remove workspace members" ON workspace_members;

-- Boards policies
DROP POLICY IF EXISTS "Board members can view" ON boards;
DROP POLICY IF EXISTS "Workspace members can create boards" ON boards;
DROP POLICY IF EXISTS "Board admins can update" ON boards;
DROP POLICY IF EXISTS "Board admins can delete" ON boards;

-- Board members policies
DROP POLICY IF EXISTS "Board members can view board members" ON board_members;
DROP POLICY IF EXISTS "Board admins can add members" ON board_members;
DROP POLICY IF EXISTS "Board admins can update members" ON board_members;
DROP POLICY IF EXISTS "Board admins can remove members" ON board_members;

-- Columns policies
DROP POLICY IF EXISTS "Board members can view columns" ON columns;
DROP POLICY IF EXISTS "Contributors can create columns" ON columns;
DROP POLICY IF EXISTS "Contributors can update columns" ON columns;
DROP POLICY IF EXISTS "Admins can delete columns" ON columns;

-- Labels policies
DROP POLICY IF EXISTS "Board members can view labels" ON labels;
DROP POLICY IF EXISTS "Contributors can create labels" ON labels;
DROP POLICY IF EXISTS "Contributors can update labels" ON labels;
DROP POLICY IF EXISTS "Admins can delete labels" ON labels;

-- Cards policies
DROP POLICY IF EXISTS "Board members can view cards" ON cards;
DROP POLICY IF EXISTS "Contributors can create cards" ON cards;
DROP POLICY IF EXISTS "Contributors can update cards" ON cards;
DROP POLICY IF EXISTS "Admins can delete cards" ON cards;

-- Card assignments policies
DROP POLICY IF EXISTS "Board members can view assignments" ON card_assignments;
DROP POLICY IF EXISTS "Contributors can create assignments" ON card_assignments;
DROP POLICY IF EXISTS "Contributors can delete assignments" ON card_assignments;

-- Card labels policies
DROP POLICY IF EXISTS "Board members can view card labels" ON card_labels;
DROP POLICY IF EXISTS "Contributors can manage card labels" ON card_labels;

-- Subtasks policies
DROP POLICY IF EXISTS "Board members can view subtasks" ON subtasks;
DROP POLICY IF EXISTS "Contributors can manage subtasks" ON subtasks;

-- Card dependencies policies
DROP POLICY IF EXISTS "Board members can view dependencies" ON card_dependencies;
DROP POLICY IF EXISTS "Contributors can create dependencies" ON card_dependencies;
DROP POLICY IF EXISTS "Contributors can delete dependencies" ON card_dependencies;

-- Time entries policies
DROP POLICY IF EXISTS "Users can view own time entries" ON time_entries;
DROP POLICY IF EXISTS "Board members can view card time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can create own time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can update own time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can delete own time entries" ON time_entries;

-- Recurring tasks policies
DROP POLICY IF EXISTS "Board members can view recurring tasks" ON recurring_tasks;
DROP POLICY IF EXISTS "Contributors can create recurring tasks" ON recurring_tasks;
DROP POLICY IF EXISTS "Contributors can update recurring tasks" ON recurring_tasks;
DROP POLICY IF EXISTS "Admins can delete recurring tasks" ON recurring_tasks;

-- Activities policies
DROP POLICY IF EXISTS "Board members can view activities" ON activities;
DROP POLICY IF EXISTS "System can insert activities" ON activities;

-- Notifications policies
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;

-- Notification preferences policies
DROP POLICY IF EXISTS "Users can view own preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can create own preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON notification_preferences;

-- Google Tasks sync policies (from migration 003) - EXACT NAMES
DROP POLICY IF EXISTS "Users can view their own task list mappings" ON google_task_list_mappings;
DROP POLICY IF EXISTS "Users can create their own task list mappings" ON google_task_list_mappings;
DROP POLICY IF EXISTS "Users can update their own task list mappings" ON google_task_list_mappings;
DROP POLICY IF EXISTS "Users can delete their own task list mappings" ON google_task_list_mappings;
DROP POLICY IF EXISTS "Users can view sync state for their cards" ON google_task_sync_state;
DROP POLICY IF EXISTS "Users can create sync state for their cards" ON google_task_sync_state;
DROP POLICY IF EXISTS "Users can update sync state for their cards" ON google_task_sync_state;
DROP POLICY IF EXISTS "Users can view their sync queue items" ON google_sync_queue;
DROP POLICY IF EXISTS "Users can insert their sync queue items" ON google_sync_queue;
DROP POLICY IF EXISTS "Users can view their audit log entries" ON google_sync_audit_log;

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
-- Note: google_task_sync_state, google_sync_queue, google_sync_audit_log do NOT have user_id columns

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
-- Note: google_task_sync_state, google_sync_queue, google_sync_audit_log do NOT have user_id columns

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

-- Note: google_task_sync_state, google_sync_queue, google_sync_audit_log do NOT have user_id columns
-- These tables only have card_id and use RLS policies with EXISTS subqueries to check board membership

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

CREATE OR REPLACE FUNCTION is_board_admin(board_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM board_members
        WHERE board_id = board_uuid
        AND user_id = current_user_id()
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Re-create ALL RLS policies (using current_user_id() instead of auth.uid())

-- Users policies
CREATE POLICY "Users can view themselves" ON users
    FOR SELECT USING (id = current_user_id());

CREATE POLICY "Users can view workspace members" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm1
            JOIN workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
            WHERE wm1.user_id = current_user_id() AND wm2.user_id = users.id
        )
    );

CREATE POLICY "Users can update themselves" ON users
    FOR UPDATE USING (id = current_user_id());

CREATE POLICY "Users can insert themselves" ON users
    FOR INSERT WITH CHECK (id = current_user_id());

-- Workspaces policies
CREATE POLICY "Workspace members can view" ON workspaces
    FOR SELECT USING (is_workspace_member(id));

CREATE POLICY "Users can create workspaces" ON workspaces
    FOR INSERT WITH CHECK (created_by = current_user_id());

CREATE POLICY "Admins can update workspace" ON workspaces
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_id = id AND user_id = current_user_id() AND role IN ('owner', 'admin')
        )
    );

-- Workspace members policies
CREATE POLICY "Members can view workspace members" ON workspace_members
    FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY "Admins can add workspace members" ON workspace_members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_id = workspace_members.workspace_id
            AND user_id = current_user_id()
            AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Admins can update workspace members" ON workspace_members
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = workspace_members.workspace_id
            AND wm.user_id = current_user_id()
            AND wm.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Admins can remove workspace members" ON workspace_members
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = workspace_members.workspace_id
            AND wm.user_id = current_user_id()
            AND wm.role IN ('owner', 'admin')
        )
        OR user_id = current_user_id() -- Users can remove themselves
    );

-- Boards policies
CREATE POLICY "Board members can view" ON boards
    FOR SELECT USING (can_access_board(id));

CREATE POLICY "Workspace members can create boards" ON boards
    FOR INSERT WITH CHECK (
        is_workspace_member(workspace_id) AND created_by = current_user_id()
    );

CREATE POLICY "Board admins can update" ON boards
    FOR UPDATE USING (is_board_admin(id));

CREATE POLICY "Board admins can delete" ON boards
    FOR DELETE USING (is_board_admin(id));

-- Board members policies
CREATE POLICY "Board members can view board members" ON board_members
    FOR SELECT USING (can_access_board(board_id));

CREATE POLICY "Board admins can add members" ON board_members
    FOR INSERT WITH CHECK (is_board_admin(board_id));

CREATE POLICY "Board admins can update members" ON board_members
    FOR UPDATE USING (is_board_admin(board_id));

CREATE POLICY "Board admins can remove members" ON board_members
    FOR DELETE USING (
        is_board_admin(board_id)
        OR user_id = current_user_id() -- Users can remove themselves
    );

-- Columns policies
CREATE POLICY "Board members can view columns" ON columns
    FOR SELECT USING (can_access_board(board_id));

CREATE POLICY "Contributors can create columns" ON columns
    FOR INSERT WITH CHECK (can_edit_board(board_id));

CREATE POLICY "Contributors can update columns" ON columns
    FOR UPDATE USING (can_edit_board(board_id));

CREATE POLICY "Admins can delete columns" ON columns
    FOR DELETE USING (is_board_admin(board_id));

-- Labels policies
CREATE POLICY "Board members can view labels" ON labels
    FOR SELECT USING (can_access_board(board_id));

CREATE POLICY "Contributors can create labels" ON labels
    FOR INSERT WITH CHECK (can_edit_board(board_id));

CREATE POLICY "Contributors can update labels" ON labels
    FOR UPDATE USING (can_edit_board(board_id));

CREATE POLICY "Admins can delete labels" ON labels
    FOR DELETE USING (is_board_admin(board_id));

-- Cards policies
CREATE POLICY "Board members can view cards" ON cards
    FOR SELECT USING (can_access_board(board_id));

CREATE POLICY "Contributors can create cards" ON cards
    FOR INSERT WITH CHECK (can_edit_board(board_id) AND created_by = current_user_id());

CREATE POLICY "Contributors can update cards" ON cards
    FOR UPDATE USING (can_edit_board(board_id));

CREATE POLICY "Admins can delete cards" ON cards
    FOR DELETE USING (is_board_admin(board_id));

-- Card assignments policies
CREATE POLICY "Board members can view assignments" ON card_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM cards WHERE cards.id = card_assignments.card_id AND can_access_board(cards.board_id)
        )
    );

CREATE POLICY "Contributors can create assignments" ON card_assignments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM cards WHERE cards.id = card_assignments.card_id AND can_edit_board(cards.board_id)
        )
    );

CREATE POLICY "Contributors can delete assignments" ON card_assignments
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM cards WHERE cards.id = card_assignments.card_id AND can_edit_board(cards.board_id)
        )
    );

-- Card labels policies
CREATE POLICY "Board members can view card labels" ON card_labels
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM cards WHERE cards.id = card_labels.card_id AND can_access_board(cards.board_id)
        )
    );

CREATE POLICY "Contributors can manage card labels" ON card_labels
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM cards WHERE cards.id = card_labels.card_id AND can_edit_board(cards.board_id)
        )
    );

-- Subtasks policies
CREATE POLICY "Board members can view subtasks" ON subtasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM cards WHERE cards.id = subtasks.card_id AND can_access_board(cards.board_id)
        )
    );

CREATE POLICY "Contributors can manage subtasks" ON subtasks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM cards WHERE cards.id = subtasks.card_id AND can_edit_board(cards.board_id)
        )
    );

-- Card dependencies policies
CREATE POLICY "Board members can view dependencies" ON card_dependencies
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM cards WHERE cards.id = card_dependencies.blocking_card_id AND can_access_board(cards.board_id)
        )
        OR EXISTS (
            SELECT 1 FROM cards WHERE cards.id = card_dependencies.blocked_card_id AND can_access_board(cards.board_id)
        )
    );

CREATE POLICY "Contributors can create dependencies" ON card_dependencies
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM cards WHERE cards.id = card_dependencies.blocking_card_id AND can_edit_board(cards.board_id)
        )
        AND created_by = current_user_id()
    );

CREATE POLICY "Contributors can delete dependencies" ON card_dependencies
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM cards WHERE cards.id = card_dependencies.blocking_card_id AND can_edit_board(cards.board_id)
        )
    );

-- Time entries policies
CREATE POLICY "Users can view own time entries" ON time_entries
    FOR SELECT USING (user_id = current_user_id());

CREATE POLICY "Board members can view card time entries" ON time_entries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM cards WHERE cards.id = time_entries.card_id AND can_access_board(cards.board_id)
        )
    );

CREATE POLICY "Users can create own time entries" ON time_entries
    FOR INSERT WITH CHECK (user_id = current_user_id());

CREATE POLICY "Users can update own time entries" ON time_entries
    FOR UPDATE USING (user_id = current_user_id());

CREATE POLICY "Users can delete own time entries" ON time_entries
    FOR DELETE USING (user_id = current_user_id());

-- Recurring tasks policies
CREATE POLICY "Board members can view recurring tasks" ON recurring_tasks
    FOR SELECT USING (can_access_board(board_id));

CREATE POLICY "Contributors can create recurring tasks" ON recurring_tasks
    FOR INSERT WITH CHECK (can_edit_board(board_id) AND created_by = current_user_id());

CREATE POLICY "Contributors can update recurring tasks" ON recurring_tasks
    FOR UPDATE USING (can_edit_board(board_id));

CREATE POLICY "Admins can delete recurring tasks" ON recurring_tasks
    FOR DELETE USING (is_board_admin(board_id));

-- Activities policies
CREATE POLICY "Board members can view activities" ON activities
    FOR SELECT USING (
        (board_id IS NULL AND is_workspace_member(workspace_id))
        OR can_access_board(board_id)
    );

CREATE POLICY "System can insert activities" ON activities
    FOR INSERT WITH CHECK (user_id = current_user_id());

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (user_id = current_user_id());

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (user_id = current_user_id());

CREATE POLICY "System can create notifications" ON notifications
    FOR INSERT WITH CHECK (true); -- Notifications are created by triggers/functions

-- Notification preferences policies
CREATE POLICY "Users can view own preferences" ON notification_preferences
    FOR SELECT USING (user_id = current_user_id());

CREATE POLICY "Users can create own preferences" ON notification_preferences
    FOR INSERT WITH CHECK (user_id = current_user_id());

CREATE POLICY "Users can update own preferences" ON notification_preferences
    FOR UPDATE USING (user_id = current_user_id());

-- Google Tasks sync policies (matching migration 003 exactly)
CREATE POLICY "Users can view their own task list mappings" ON google_task_list_mappings
    FOR SELECT USING (user_id = current_user_id());

CREATE POLICY "Users can create their own task list mappings" ON google_task_list_mappings
    FOR INSERT WITH CHECK (user_id = current_user_id());

CREATE POLICY "Users can update their own task list mappings" ON google_task_list_mappings
    FOR UPDATE USING (user_id = current_user_id());

CREATE POLICY "Users can delete their own task list mappings" ON google_task_list_mappings
    FOR DELETE USING (user_id = current_user_id());

CREATE POLICY "Users can view sync state for their cards" ON google_task_sync_state
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM cards c
            JOIN boards b ON c.board_id = b.id
            JOIN board_members bm ON b.id = bm.board_id
            WHERE c.id = card_id AND bm.user_id = current_user_id()
        )
    );

CREATE POLICY "Users can create sync state for their cards" ON google_task_sync_state
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM cards c
            JOIN boards b ON c.board_id = b.id
            JOIN board_members bm ON b.id = bm.board_id
            WHERE c.id = card_id AND bm.user_id = current_user_id()
        )
    );

CREATE POLICY "Users can update sync state for their cards" ON google_task_sync_state
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM cards c
            JOIN boards b ON c.board_id = b.id
            JOIN board_members bm ON b.id = bm.board_id
            WHERE c.id = card_id AND bm.user_id = current_user_id()
        )
    );

CREATE POLICY "Users can view their sync queue items" ON google_sync_queue
    FOR SELECT USING (
        card_id IS NULL OR
        EXISTS (
            SELECT 1 FROM cards c
            JOIN boards b ON c.board_id = b.id
            JOIN board_members bm ON b.id = bm.board_id
            WHERE c.id = card_id AND bm.user_id = current_user_id()
        )
    );

CREATE POLICY "Users can insert their sync queue items" ON google_sync_queue
    FOR INSERT WITH CHECK (
        card_id IS NULL OR
        EXISTS (
            SELECT 1 FROM cards c
            JOIN boards b ON c.board_id = b.id
            JOIN board_members bm ON b.id = bm.board_id
            WHERE c.id = card_id AND bm.user_id = current_user_id()
        )
    );

CREATE POLICY "Users can view their audit log entries" ON google_sync_audit_log
    FOR SELECT USING (
        card_id IS NULL OR
        EXISTS (
            SELECT 1 FROM cards c
            JOIN boards b ON c.board_id = b.id
            JOIN board_members bm ON b.id = bm.board_id
            WHERE c.id = card_id AND bm.user_id = current_user_id()
        )
    );

-- Note: This allows NextAuth to use Google's user IDs (strings) as primary keys
-- Example Google ID: "117492150812345678901"
