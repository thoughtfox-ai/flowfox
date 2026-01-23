# Run Migration 006: Personal and Organizational Boards

## What This Migration Does

This migration adds support for two types of boards:
1. **Personal Boards** - Private boards only visible to the creator
2. **Organizational Boards** - Shared boards within the ThoughtFox workspace

### Changes Made

1. **Workspaces Table**:
   - Adds `type` column ('personal' or 'organization')
   - Each user gets their own personal workspace automatically

2. **Boards Table**:
   - Adds `is_personal` boolean flag
   - Updates RLS policies to enforce privacy rules

3. **New Functions**:
   - `get_or_create_personal_workspace(user_id)` - Automatically creates personal workspace
   - `is_personal_board(board_id)` - Helper to check board type

4. **Updated RLS Policies**:
   - Personal boards only visible/editable by creator
   - Organizational boards shared with workspace members
   - Card assignments enforced based on board type

5. **New View**:
   - `user_boards` - Shows all accessible boards with metadata

## How to Run

### Option 1: Supabase Dashboard (Recommended)

1. **Go to SQL Editor**:
   ```
   https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new
   ```

2. **Copy migration content**:
   - Open `supabase/migrations/006_personal_and_org_boards.sql`
   - Copy entire contents

3. **Execute**:
   - Paste into SQL Editor
   - Click "Run"
   - Should see: "Success. No rows returned"

4. **Verify**:
   ```sql
   -- Check workspaces table has type column
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'workspaces' AND column_name = 'type';

   -- Check boards table has is_personal column
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'boards' AND column_name = 'is_personal';

   -- Test personal workspace creation
   SELECT get_or_create_personal_workspace('113058954775822825891');
   ```

### Option 2: Supabase CLI

```bash
# Navigate to project directory
cd flowfox

# Apply migration
supabase db push

# Or apply specific migration
supabase migration up --file 006_personal_and_org_boards.sql
```

## After Migration

### Test Personal Board Creation

1. **Via API**:
   ```bash
   curl -X POST http://localhost:3000/api/boards \
     -H "Content-Type: application/json" \
     -d '{
       "name": "My Personal Board",
       "description": "Private tasks",
       "is_personal": true
     }'
   ```

2. **Via UI**:
   - Go to `/boards/new`
   - Select "Personal Board" option
   - Only you can see it

### Test Organizational Board Creation

1. **Via API**:
   ```bash
   curl -X POST http://localhost:3000/api/boards \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Team Sprint Board",
       "description": "Shared with team",
       "is_personal": false
     }'
   ```

2. **Via UI**:
   - Go to `/boards/new`
   - Select "Team Board" option
   - All workspace members can see it

### Verify User Assignments

1. **Check card assignments on organizational boards**:
   ```sql
   SELECT
     c.title,
     u.full_name AS assigned_to,
     b.name AS board_name,
     b.is_personal
   FROM cards c
   JOIN card_assignments ca ON c.id = ca.card_id
   JOIN users u ON ca.user_id = u.id
   JOIN boards b ON c.board_id = b.id
   WHERE b.is_personal = FALSE;
   ```

2. **Try assigning users**:
   - On organizational board: can assign any workspace member
   - On personal board: can only assign yourself

## UI Updates Needed

After running the migration, update the UI:

1. **Board Creation Page** (`/boards/new`):
   - Add toggle: "Personal Board" vs "Team Board"
   - Show different descriptions for each type

2. **Boards List** (`/boards`):
   - Group boards by type: "My Boards" and "Team Boards"
   - Show user avatars on organizational board cards

3. **Card Detail**:
   - Show assigned users with avatars
   - Only allow assigning workspace members on org boards

## Troubleshooting

### Migration Fails: "function is_board_admin(uuid, text) does not exist"

This error occurred in the initial version of migration 006. The helper functions from migration 005 only take one parameter (the board UUID) and internally use `current_user_id()`.

**Fix**: The migration file has been updated. Re-run the migration with the corrected version where `is_board_admin(id, current_user_id())` is changed to `is_board_admin(id)`.

### Migration Fails: "column already exists"

This is safe to ignore if you've run the migration before:
```sql
-- Check if migration already applied
SELECT type FROM workspaces LIMIT 1;
-- If column exists, migration is already done
```

### Personal workspace not created

Run manually:
```sql
SELECT get_or_create_personal_workspace('YOUR_USER_ID');
```

### RLS policies blocking access

Check current user context:
```sql
SELECT current_user_id();
-- Should return your Google user ID
```

## Rollback (if needed)

```sql
-- Remove new columns
ALTER TABLE workspaces DROP COLUMN IF EXISTS type;
ALTER TABLE boards DROP COLUMN IF EXISTS is_personal;

-- Drop new functions
DROP FUNCTION IF EXISTS get_or_create_personal_workspace;
DROP FUNCTION IF EXISTS is_personal_board;

-- Drop view
DROP VIEW IF EXISTS user_boards;

-- Restore original RLS policies (would need to re-run migration 005)
```

## Next Steps

1. ✅ Run migration
2. ✅ Test board creation (both types)
3. ✅ Update UI to show board types
4. ✅ Add user assignment UI for organizational boards
5. ✅ Test card assignments
