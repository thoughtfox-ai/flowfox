-- ============================================
-- CHANGE users.id FROM UUID TO TEXT
-- Required for NextAuth Google OAuth (Google IDs are strings, not UUIDs)
-- ============================================

-- Step 1: Drop all foreign key constraints that reference users(id)
ALTER TABLE workspace_members DROP CONSTRAINT IF EXISTS workspace_members_user_id_fkey;
ALTER TABLE board_members DROP CONSTRAINT IF EXISTS board_members_user_id_fkey;
ALTER TABLE workspaces DROP CONSTRAINT IF EXISTS workspaces_created_by_fkey;
ALTER TABLE boards DROP CONSTRAINT IF EXISTS boards_created_by_fkey;
ALTER TABLE cards DROP CONSTRAINT IF EXISTS cards_created_by_fkey;
ALTER TABLE google_task_list_mappings DROP CONSTRAINT IF EXISTS google_task_list_mappings_user_id_fkey;

-- Step 2: Change users.id column type from UUID to TEXT
ALTER TABLE users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE users ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- Step 3: Change all foreign key columns from UUID to TEXT
ALTER TABLE workspace_members ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE board_members ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE workspaces ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;
ALTER TABLE boards ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;
ALTER TABLE cards ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;
ALTER TABLE google_task_list_mappings ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Step 4: Re-add foreign key constraints
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

-- Note: This allows NextAuth to use Google's user IDs (strings) as primary keys
-- Example Google ID: "117492150812345678901"
