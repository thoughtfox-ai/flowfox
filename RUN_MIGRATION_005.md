# Run Migration 005 - Convert User IDs to TEXT

## Why This Is Needed

Google OAuth returns user IDs as strings (e.g., "117492150812345678901"), but your `users` table currently has a UUID-type `id` column. This causes authentication to fail silently when creating user records.

## Steps to Apply Migration

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your FlowFox project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy Migration SQL**
   - Open `supabase/migrations/005_users_id_to_text.sql`
   - Copy the entire contents

4. **Run Migration**
   - Paste the SQL into the editor
   - Click "Run" button
   - Wait for "Success" message

5. **Verify**
   - After running, try logging in again
   - The Google Tasks integration should now work

## What This Migration Does

This is a comprehensive migration that converts the entire user ID system from UUID to TEXT to support Google OAuth string IDs.

1. **Drops ALL RLS policies** across ALL 16 tables (~100+ policies total)
   - Users, workspaces, workspace_members, boards, board_members
   - Columns, labels, cards, card_assignments, card_labels
   - Subtasks, card_dependencies, time_entries, recurring_tasks
   - Activities, notifications, notification_preferences, Google Tasks sync tables

2. **Drops ALL 14 foreign key constraints** that reference `users(id)`

3. **Converts `users.id`** from UUID → TEXT

4. **Converts ALL 14 foreign key columns** from UUID → TEXT:
   - workspace_members.user_id, board_members.user_id
   - workspaces.created_by, boards.created_by, cards.created_by
   - google_task_list_mappings.user_id, card_assignments.user_id
   - subtasks.assignee_id, card_dependencies.created_by
   - time_entries.user_id, recurring_tasks.created_by
   - activities.user_id, notifications.user_id
   - notification_preferences.user_id

   Note: google_task_sync_state, google_sync_queue, and google_sync_audit_log tables do NOT have user_id columns. They only have card_id and use RLS policies with EXISTS subqueries to check board membership.

5. **Re-adds ALL 14 foreign key constraints**

6. **Updates `current_user_id()` function** to return TEXT instead of UUID

7. **Updates 4 helper functions** to work with TEXT user IDs:
   - is_workspace_member(), can_access_board()
   - can_edit_board(), is_board_admin()

8. **Re-creates ALL RLS policies** using `current_user_id()` instead of `auth.uid()`

## Expected Output

You should see multiple success messages for:
- DROP POLICY
- ALTER TABLE
- CREATE OR REPLACE FUNCTION
- CREATE POLICY

If you get any errors, check that:
- Migration 003 (Google Tasks sync) was already applied
- You're using the Supabase SQL Editor (not regular psql)
- You're logged in with sufficient database privileges

## After Migration

Once successful:
1. Sign out of the app
2. Sign in again with Google
3. Your user record will be created with your Google ID
4. Visit `/settings/integrations` - the "Failed to fetch mappings" error should be gone
