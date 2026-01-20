-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Check if user is workspace member
CREATE OR REPLACE FUNCTION is_workspace_member(workspace_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_id = workspace_uuid AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can access board
CREATE OR REPLACE FUNCTION can_access_board(board_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM board_members
        WHERE board_id = board_uuid AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can edit board
CREATE OR REPLACE FUNCTION can_edit_board(board_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM board_members
        WHERE board_id = board_uuid
        AND user_id = auth.uid()
        AND role IN ('contributor', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is board admin
CREATE OR REPLACE FUNCTION is_board_admin(board_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM board_members
        WHERE board_id = board_uuid
        AND user_id = auth.uid()
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- USERS POLICIES
-- ============================================

CREATE POLICY "Users can view themselves" ON users
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can view workspace members" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm1
            JOIN workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
            WHERE wm1.user_id = auth.uid() AND wm2.user_id = users.id
        )
    );

CREATE POLICY "Users can update themselves" ON users
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert themselves" ON users
    FOR INSERT WITH CHECK (id = auth.uid());

-- ============================================
-- WORKSPACES POLICIES
-- ============================================

CREATE POLICY "Workspace members can view" ON workspaces
    FOR SELECT USING (is_workspace_member(id));

CREATE POLICY "Users can create workspaces" ON workspaces
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can update workspace" ON workspaces
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_id = id AND user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- ============================================
-- WORKSPACE MEMBERS POLICIES
-- ============================================

CREATE POLICY "Members can view workspace members" ON workspace_members
    FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY "Admins can add workspace members" ON workspace_members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_id = workspace_members.workspace_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Admins can update workspace members" ON workspace_members
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = workspace_members.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Admins can remove workspace members" ON workspace_members
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = workspace_members.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('owner', 'admin')
        )
        OR user_id = auth.uid() -- Users can remove themselves
    );

-- ============================================
-- BOARDS POLICIES
-- ============================================

CREATE POLICY "Board members can view" ON boards
    FOR SELECT USING (can_access_board(id));

CREATE POLICY "Workspace members can create boards" ON boards
    FOR INSERT WITH CHECK (
        is_workspace_member(workspace_id) AND created_by = auth.uid()
    );

CREATE POLICY "Board admins can update" ON boards
    FOR UPDATE USING (is_board_admin(id));

CREATE POLICY "Board admins can delete" ON boards
    FOR DELETE USING (is_board_admin(id));

-- ============================================
-- BOARD MEMBERS POLICIES
-- ============================================

CREATE POLICY "Board members can view board members" ON board_members
    FOR SELECT USING (can_access_board(board_id));

CREATE POLICY "Board admins can add members" ON board_members
    FOR INSERT WITH CHECK (is_board_admin(board_id));

CREATE POLICY "Board admins can update members" ON board_members
    FOR UPDATE USING (is_board_admin(board_id));

CREATE POLICY "Board admins can remove members" ON board_members
    FOR DELETE USING (
        is_board_admin(board_id)
        OR user_id = auth.uid() -- Users can remove themselves
    );

-- ============================================
-- COLUMNS POLICIES
-- ============================================

CREATE POLICY "Board members can view columns" ON columns
    FOR SELECT USING (can_access_board(board_id));

CREATE POLICY "Contributors can create columns" ON columns
    FOR INSERT WITH CHECK (can_edit_board(board_id));

CREATE POLICY "Contributors can update columns" ON columns
    FOR UPDATE USING (can_edit_board(board_id));

CREATE POLICY "Admins can delete columns" ON columns
    FOR DELETE USING (is_board_admin(board_id));

-- ============================================
-- LABELS POLICIES
-- ============================================

CREATE POLICY "Board members can view labels" ON labels
    FOR SELECT USING (can_access_board(board_id));

CREATE POLICY "Contributors can create labels" ON labels
    FOR INSERT WITH CHECK (can_edit_board(board_id));

CREATE POLICY "Contributors can update labels" ON labels
    FOR UPDATE USING (can_edit_board(board_id));

CREATE POLICY "Admins can delete labels" ON labels
    FOR DELETE USING (is_board_admin(board_id));

-- ============================================
-- CARDS POLICIES
-- ============================================

CREATE POLICY "Board members can view cards" ON cards
    FOR SELECT USING (can_access_board(board_id));

CREATE POLICY "Contributors can create cards" ON cards
    FOR INSERT WITH CHECK (can_edit_board(board_id) AND created_by = auth.uid());

CREATE POLICY "Contributors can update cards" ON cards
    FOR UPDATE USING (can_edit_board(board_id));

CREATE POLICY "Admins can delete cards" ON cards
    FOR DELETE USING (is_board_admin(board_id));

-- ============================================
-- CARD ASSIGNMENTS POLICIES
-- ============================================

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

-- ============================================
-- CARD LABELS POLICIES
-- ============================================

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

-- ============================================
-- SUBTASKS POLICIES
-- ============================================

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

-- ============================================
-- CARD DEPENDENCIES POLICIES
-- ============================================

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
        AND created_by = auth.uid()
    );

CREATE POLICY "Contributors can delete dependencies" ON card_dependencies
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM cards WHERE cards.id = card_dependencies.blocking_card_id AND can_edit_board(cards.board_id)
        )
    );

-- ============================================
-- TIME ENTRIES POLICIES
-- ============================================

CREATE POLICY "Users can view own time entries" ON time_entries
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Board members can view card time entries" ON time_entries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM cards WHERE cards.id = time_entries.card_id AND can_access_board(cards.board_id)
        )
    );

CREATE POLICY "Users can create own time entries" ON time_entries
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own time entries" ON time_entries
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own time entries" ON time_entries
    FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- RECURRING TASKS POLICIES
-- ============================================

CREATE POLICY "Board members can view recurring tasks" ON recurring_tasks
    FOR SELECT USING (can_access_board(board_id));

CREATE POLICY "Contributors can create recurring tasks" ON recurring_tasks
    FOR INSERT WITH CHECK (can_edit_board(board_id) AND created_by = auth.uid());

CREATE POLICY "Contributors can update recurring tasks" ON recurring_tasks
    FOR UPDATE USING (can_edit_board(board_id));

CREATE POLICY "Admins can delete recurring tasks" ON recurring_tasks
    FOR DELETE USING (is_board_admin(board_id));

-- ============================================
-- ACTIVITIES POLICIES
-- ============================================

CREATE POLICY "Board members can view activities" ON activities
    FOR SELECT USING (
        (board_id IS NULL AND is_workspace_member(workspace_id))
        OR can_access_board(board_id)
    );

CREATE POLICY "System can insert activities" ON activities
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================
-- NOTIFICATIONS POLICIES
-- ============================================

CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON notifications
    FOR INSERT WITH CHECK (true); -- Notifications are created by triggers/functions

-- ============================================
-- NOTIFICATION PREFERENCES POLICIES
-- ============================================

CREATE POLICY "Users can view own preferences" ON notification_preferences
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own preferences" ON notification_preferences
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own preferences" ON notification_preferences
    FOR UPDATE USING (user_id = auth.uid());
