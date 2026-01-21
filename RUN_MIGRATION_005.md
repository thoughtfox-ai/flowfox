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

1. Drops RLS policies on `users` table (prevents type alteration errors)
2. Drops all foreign key constraints that reference `users(id)`
3. Converts `users.id` from UUID → TEXT
4. Converts all related foreign key columns (user_id, created_by) from UUID → TEXT
5. Re-adds all foreign key constraints
6. Updates `current_user_id()` function to return TEXT instead of UUID
7. Updates helper functions to work with TEXT user IDs
8. Re-creates RLS policies with TEXT comparisons

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
