-- ============================================
-- Migration 007: Board Drafts for Auto-Save
-- Stores draft board edits per user to prevent data loss
-- ============================================

-- Step 1: Create board_drafts table
CREATE TABLE IF NOT EXISTS flowfox_board_drafts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id UUID NOT NULL REFERENCES flowfox_boards(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    draft_data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(board_id, user_id)
);

-- Step 2: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_board_drafts_board_id ON flowfox_board_drafts(board_id);
CREATE INDEX IF NOT EXISTS idx_board_drafts_user_id ON flowfox_board_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_board_drafts_updated_at ON flowfox_board_drafts(updated_at);

-- Step 3: Enable RLS
ALTER TABLE flowfox_board_drafts ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies
-- Users can only view their own drafts
CREATE POLICY "Users can view own drafts" ON flowfox_board_drafts
    FOR SELECT USING (user_id = current_user_id());

-- Users can create drafts for boards they have access to
CREATE POLICY "Users can create own drafts" ON flowfox_board_drafts
    FOR INSERT WITH CHECK (
        user_id = current_user_id()
        AND EXISTS (
            SELECT 1 FROM flowfox_board_members
            WHERE board_id = flowfox_board_drafts.board_id
            AND user_id = current_user_id()
        )
    );

-- Users can update their own drafts
CREATE POLICY "Users can update own drafts" ON flowfox_board_drafts
    FOR UPDATE USING (user_id = current_user_id());

-- Users can delete their own drafts
CREATE POLICY "Users can delete own drafts" ON flowfox_board_drafts
    FOR DELETE USING (user_id = current_user_id());

-- Step 5: Add comment for documentation
COMMENT ON TABLE flowfox_board_drafts IS 'Stores draft board edits per user for auto-save functionality';
COMMENT ON COLUMN flowfox_board_drafts.draft_data IS 'JSON object containing draft changes: name, description, settings, etc.';

-- Step 6: Create function to clean up old drafts (optional cleanup)
CREATE OR REPLACE FUNCTION cleanup_old_board_drafts()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete drafts older than 30 days
    DELETE FROM flowfox_board_drafts
    WHERE updated_at < NOW() - INTERVAL '30 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_old_board_drafts IS 'Removes board drafts older than 30 days. Can be scheduled as a cron job.';
