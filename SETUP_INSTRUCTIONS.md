# FlowFox Database Setup Instructions

## Prerequisites
- Supabase account (https://supabase.com)
- Supabase CLI installed: `npm install -g supabase`

## Step 1: Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in project details:
   - **Name**: flowfox-dev (or your choice)
   - **Database Password**: (generate strong password)
   - **Region**: Choose closest to your users
4. Wait for project provisioning (~2 minutes)

## Step 2: Get Your Credentials

From your Supabase project dashboard:
1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (safe for browser)
   - **service_role key** (SECRET - server only)

## Step 3: Configure Environment Variables

Create `/home/user/flowfox/.env.local`:

```bash
# Supabase (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-service-role-key

# Google OAuth (REQUIRED for auth)
AUTH_GOOGLE_ID=your-client-id.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=GOCSPX-your-secret
ALLOWED_GOOGLE_DOMAIN=thoughtfox.com  # Optional: restrict to domain

# Google Gemini AI (REQUIRED for AI features)
GEMINI_API_KEY=AIzaSy...your-gemini-key

# NextAuth (REQUIRED)
AUTH_SECRET=$(openssl rand -base64 32)  # Run this command to generate
NEXTAUTH_URL=http://localhost:3000  # Or your production URL
```

## Step 4: Run Database Migrations

### Method A: Using Supabase CLI (Recommended)

```bash
# Link to your project
cd /home/user/flowfox
supabase link --project-ref <your-project-ref>

# Run migrations
supabase db push

# Verify tables created
supabase db diff
```

### Method B: Using Supabase Dashboard

1. Go to **SQL Editor** in Supabase dashboard
2. Run each migration file in order:
   - Copy contents of `001_initial_schema.sql`
   - Paste into SQL Editor → Run
   - Repeat for migrations 002, 003, 004, 005

## Step 5: Verify Setup

Run this query in Supabase SQL Editor:

```sql
SELECT
  schemaname,
  tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

You should see 21 tables including:
- users, workspaces, boards, columns, cards
- google_task_list_mappings, google_task_sync_state
- activities, notifications, time_entries

## Step 6: Create First User

The `users` table is populated automatically when someone signs in via Google OAuth. To test:

1. Start dev server: `npm run dev`
2. Visit http://localhost:3000/auth/login
3. Sign in with Google
4. User record created in `users` table

## Integration with StratOps Platform

### If StratOps Already Has Supabase

**Use the SAME Supabase project**:
1. Run FlowFox migrations in your existing database
2. Tables will coexist with your existing schema
3. Share the same Supabase clients and auth

**Namespace Considerations**:
- All FlowFox tables are in `public` schema
- Consider prefixing tables: `flowfox_boards`, `flowfox_cards`, etc.
- Modify migration files to add prefix if needed

### If StratOps Uses Different Database

**Option A - Dual Database** (isolation):
- Keep FlowFox in separate Supabase project
- Use separate Supabase clients
- Cross-database queries not possible

**Option B - Database-Agnostic Migration** (complex):
- Convert Supabase-specific features (RLS, triggers)
- Implement auth checks in application layer
- Translate PostgreSQL-specific syntax

## Next Steps

1. Create Supabase project
2. Set environment variables
3. Run migrations
4. Test by running `npm run dev`
5. Verify Kanban board loads at http://localhost:3000

## Troubleshooting

**Issue**: "Failed to connect to Supabase"
- Check `NEXT_PUBLIC_SUPABASE_URL` is correct
- Verify anon key hasn't expired
- Ensure RLS policies are created (migration 002)

**Issue**: "User not found in database"
- Sign out and sign in again
- Check `users` table manually in Supabase dashboard
- Verify NextAuth callback is creating user

**Issue**: "Google Tasks sync not working"
- Verify Google OAuth includes Tasks API scope
- Check Google Cloud Console API is enabled
- Ensure refresh tokens are being stored
