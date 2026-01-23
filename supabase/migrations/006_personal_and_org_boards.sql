-- ============================================
-- Migration 006: Personal and Organizational Boards
-- Adds support for personal boards (private to user) and organizational boards (shared)
-- ============================================

-- Step 1: Add workspace type column
ALTER TABLE workspaces
ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'organization'
CHECK (type IN ('personal', 'organization'));

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_workspaces_type ON workspaces(type);
CREATE INDEX IF NOT EXISTS idx_workspaces_created_by ON workspaces(created_by);

-- Step 2: Add board visibility flag (redundant with workspace type, but useful for queries)
ALTER TABLE boards
ADD COLUMN IF NOT EXISTS is_personal BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for filtering personal vs org boards
CREATE INDEX IF NOT EXISTS idx_boards_is_personal ON boards(is_personal);

-- Step 3: Create function to get or create a user's personal workspace
CREATE OR REPLACE FUNCTION get_or_create_personal_workspace(p_user_id TEXT)
RETURNS UUID AS $$
DECLARE
    v_workspace_id UUID;
    v_user_email TEXT;
    v_user_name TEXT;
BEGIN
    -- Try to find existing personal workspace
    SELECT id INTO v_workspace_id
    FROM workspaces
    WHERE created_by = p_user_id
    AND type = 'personal'
    LIMIT 1;

    -- If not found, create it
    IF v_workspace_id IS NULL THEN
        -- Get user details
        SELECT email, full_name INTO v_user_email, v_user_name
        FROM users
        WHERE id = p_user_id;

        -- Create personal workspace
        INSERT INTO workspaces (name, slug, type, created_by)
        VALUES (
            COALESCE(v_user_name || '''s Personal Workspace', 'Personal Workspace'),
            'personal-' || p_user_id,
            'personal',
            p_user_id
        )
        RETURNING id INTO v_workspace_id;

        -- Add user as owner of their personal workspace
        INSERT INTO workspace_members (workspace_id, user_id, role)
        VALUES (v_workspace_id, p_user_id, 'owner');
    END IF;

    RETURN v_workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Update existing workspaces
-- Mark ThoughtFox workspace as organization type (already done by default)
UPDATE workspaces SET type = 'organization' WHERE type IS NULL OR type = 'organization';

-- Step 5: Add helper function to check if board is personal
CREATE OR REPLACE FUNCTION is_personal_board(p_board_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM boards b
        JOIN workspaces w ON b.workspace_id = w.id
        WHERE b.id = p_board_id AND w.type = 'personal'
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 6: Update RLS policies for personal boards

-- Drop existing board SELECT policy and recreate with personal board logic
DROP POLICY IF EXISTS "Board members can view board" ON boards;

CREATE POLICY "Board members can view board" ON boards
    FOR SELECT USING (
        -- Can view if they're a board member
        can_access_board(id)
        OR
        -- Can view personal boards they created
        (is_personal = TRUE AND created_by = current_user_id())
    );

-- Personal boards can only be edited by creator
DROP POLICY IF EXISTS "Board admins can update board" ON boards;

CREATE POLICY "Board admins can update board" ON boards
    FOR UPDATE USING (
        -- Personal boards: only creator can edit
        (is_personal = TRUE AND created_by = current_user_id())
        OR
        -- Organizational boards: board admins can edit
        (is_personal = FALSE AND can_edit_board(id))
    );

-- Personal boards can only be deleted by creator
DROP POLICY IF EXISTS "Board admins can delete board" ON boards;

CREATE POLICY "Board admins can delete board" ON boards
    FOR DELETE USING (
        -- Personal boards: only creator can delete
        (is_personal = TRUE AND created_by = current_user_id())
        OR
        -- Organizational boards: board admins can delete
        (is_personal = FALSE AND is_board_admin(id))
    );

-- Users can create personal boards or boards in workspaces they're members of
DROP POLICY IF EXISTS "Workspace members can create boards" ON boards;

CREATE POLICY "Workspace members can create boards" ON boards
    FOR INSERT WITH CHECK (
        -- Can create in personal workspace
        (is_personal = TRUE AND workspace_id IN (
            SELECT id FROM workspaces
            WHERE type = 'personal' AND created_by = current_user_id()
        ))
        OR
        -- Can create in organizational workspace they're a member of
        (is_personal = FALSE AND is_workspace_member(workspace_id))
    );

-- Step 7: Update card assignment visibility
-- Ensure card assignments are visible for organizational boards

DROP POLICY IF EXISTS "Board members can view card assignments" ON card_assignments;

CREATE POLICY "Board members can view card assignments" ON card_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM cards c
            JOIN boards b ON c.board_id = b.id
            WHERE c.id = card_id
            AND (
                -- Can see assignments in boards they're members of
                can_access_board(b.id)
                OR
                -- Can see their own assignments
                user_id = current_user_id()
            )
        )
    );

DROP POLICY IF EXISTS "Board contributors can assign users" ON card_assignments;

CREATE POLICY "Board contributors can assign users" ON card_assignments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM cards c
            JOIN boards b ON c.board_id = b.id
            WHERE c.id = card_id
            AND can_access_board(b.id)
            AND (
                -- Personal boards: can only assign yourself
                (b.is_personal = TRUE AND user_id = current_user_id())
                OR
                -- Organizational boards: can assign board members
                (b.is_personal = FALSE AND EXISTS (
                    SELECT 1 FROM board_members
                    WHERE board_id = b.id AND board_members.user_id = card_assignments.user_id
                ))
            )
        )
    );

DROP POLICY IF EXISTS "Board contributors can remove assignments" ON card_assignments;

CREATE POLICY "Board contributors can remove assignments" ON card_assignments
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM cards c
            JOIN boards b ON c.board_id = b.id
            WHERE c.id = card_id
            AND (
                can_access_board(b.id)
                OR
                user_id = current_user_id()
            )
        )
    );

-- Step 8: Add comments for clarity
COMMENT ON COLUMN workspaces.type IS 'Workspace type: personal (private to user) or organization (shared)';
COMMENT ON COLUMN boards.is_personal IS 'Whether this board is personal (private) or organizational (shared)';
COMMENT ON FUNCTION get_or_create_personal_workspace IS 'Gets existing or creates new personal workspace for a user';

-- Step 9: Create view for user-accessible boards with metadata
CREATE OR REPLACE VIEW user_boards AS
SELECT
    b.id,
    b.workspace_id,
    b.name,
    b.description,
    b.slug,
    b.is_archived,
    b.is_personal,
    b.created_by,
    b.created_at,
    b.updated_at,
    w.name AS workspace_name,
    w.type AS workspace_type,
    bm.role AS user_role,
    -- Count of cards on board
    (SELECT COUNT(*) FROM cards WHERE board_id = b.id AND NOT is_archived) AS card_count,
    -- Count of assigned cards for current user
    (SELECT COUNT(DISTINCT c.id)
     FROM cards c
     JOIN card_assignments ca ON c.id = ca.card_id
     WHERE c.board_id = b.id
     AND ca.user_id = current_user_id()
     AND NOT c.is_archived) AS my_assigned_count
FROM boards b
JOIN workspaces w ON b.workspace_id = w.id
LEFT JOIN board_members bm ON b.id = bm.board_id AND bm.user_id = current_user_id()
WHERE
    -- Personal boards created by user
    (b.is_personal = TRUE AND b.created_by = current_user_id())
    OR
    -- Organizational boards where user is a member
    (b.is_personal = FALSE AND can_access_board(b.id));

COMMENT ON VIEW user_boards IS 'User-accessible boards with metadata including personal/org type and card counts';
