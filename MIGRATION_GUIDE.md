# Database Migration Guide

## Issue: NextAuth + Supabase Schema Compatibility

The database schema was originally designed for Supabase Auth but we implemented NextAuth.js for authentication. This guide helps you migrate the schema to work with NextAuth.

## Current State

- ✅ NextAuth.js configured and working for Google OAuth
- ❌ Database tables reference `auth.users` which is empty (using NextAuth instead)
- ❌ RLS policies use `auth.uid()` which returns NULL for NextAuth sessions
- ❌ Google Tasks sync tables don't exist yet

## Solution

Run migrations in this specific order through Supabase SQL Editor.

### Step 1: Navigate to Supabase SQL Editor

1. Go to: https://supabase.com/dashboard/project/niwaqgryfxcvtixwgwyb
2. Click **SQL Editor** in left sidebar
3. Click **New Query**

### Step 2: Apply Migration 004 (NextAuth Compatibility)

This removes the dependency on Supabase Auth and makes RLS work with NextAuth.

Copy and paste the **entire contents** of:
```
supabase/migrations/004_nextauth_compatibility.sql
```

Click **Run** or press Ctrl/Cmd + Enter.

**Expected output:** Success messages for function creation and policy updates.

### Step 3: Apply Migration 003 (Google Tasks Sync)

Now create the Google Tasks sync tables.

Copy and paste the **entire contents** of:
```
supabase/migrations/003_google_tasks_sync.sql
```

Click **Run** or press Ctrl/Cmd + Enter.

**Expected output:**
- ✅ Created table google_task_list_mappings
- ✅ Created table google_task_sync_state
- ✅ Created table google_sync_queue
- ✅ Created table google_sync_audit_log
- ✅ Created 9 indexes
- ✅ Created 2 triggers
- ✅ Created 11 RLS policies

### Step 4: Verify Tables Exist

1. Go to **Table Editor** in Supabase dashboard
2. Confirm you see these new tables:
   - `google_task_list_mappings`
   - `google_task_sync_state`
   - `google_sync_queue`
   - `google_sync_audit_log`

### Step 5: Test the Integration

1. Start your dev server: `npm run dev`
2. Navigate to: http://localhost:3000/settings/integrations
3. The "Failed to fetch mappings" error should be **gone**
4. You should see: "No boards mapped to Google Tasks yet"
5. Click **Load Google Task Lists** to fetch your lists
6. Create a mapping between a board and a task list

## How It Works

### API Routes (Service Role)
Our API routes (`/api/google/*`) use Supabase's service role client which **bypasses RLS**. This means:
- No need for JWT tokens or session context
- Direct database access with full permissions
- RLS policies don't apply to service role operations

### RLS Policies (Future-Proofing)
The RLS policies are updated to use `current_user_id()` instead of `auth.uid()` for when we need client-side access:
- `current_user_id()` tries to get user from request context first
- Falls back to `auth.uid()` for Supabase Auth compatibility
- Enables future direct database access from client components

### Users Table
The `users` table is now **standalone** (no longer depends on `auth.users`):
- User records are created by API routes when users sign in with NextAuth
- No dependency on Supabase Auth infrastructure
- Works seamlessly with NextAuth sessions

## Troubleshooting

### Error: "relation auth.users does not exist"
- You're trying to run migration 003 before 004
- Run migration 004 first, then 003

### Error: "Failed to fetch mappings"
- Migrations haven't been run yet
- Follow Steps 2-3 above

### Error: "Users can view their own task list mappings" policy exists
- This is expected - the policies are being recreated
- The `DROP POLICY IF EXISTS` handles this gracefully

### Still seeing errors?
Check:
1. Service role key is set in `.env.local` as `SUPABASE_SERVICE_ROLE_KEY`
2. You're signed in to the app with Google OAuth
3. Your session is active (not expired)

## What's Next

After successful migration, you can:
1. **Map boards to Google Task Lists** at /settings/integrations
2. **Sync manually** using the "Sync Now" button
3. **See sync status** - cards with Google Tasks show a cloud icon ☁️
4. **Auto-sync** - Coming soon (5-minute polling via Edge Functions)
