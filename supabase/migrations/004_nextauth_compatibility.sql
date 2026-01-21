-- ============================================
-- NEXTAUTH COMPATIBILITY
-- Makes schema work with NextAuth instead of Supabase Auth
-- ============================================

-- Step 1: Make users table standalone (remove auth.users dependency)
-- Drop the foreign key constraint that links to Supabase Auth
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Make id a regular UUID primary key with default value
ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Step 2: Create helper function to get current user ID
-- This replaces auth.uid() for NextAuth compatibility
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
BEGIN
  -- Try to get from request context (set by API routes with service role)
  -- Falls back to auth.uid() for backwards compatibility
  RETURN COALESCE(
    current_setting('request.jwt.claims.sub', true)::uuid,
    auth.uid()
  );
EXCEPTION
  WHEN OTHERS THEN
    -- If all else fails, return NULL (same as auth.uid() when not authenticated)
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 3: Update existing RLS helper functions to use current_user_id()
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

-- Note: Migration 003 will create Google Tasks sync tables with current_user_id() policies
-- API routes use service role client which bypasses RLS entirely
