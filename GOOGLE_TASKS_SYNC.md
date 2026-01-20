# Google Tasks Sync - Implementation Guide

## Overview

FlowFox now includes bi-directional sync with Google Tasks, allowing you to seamlessly work with tasks in both FlowFox and Google Tasks. Changes made in either system are automatically synchronized.

## Features Implemented

### ✅ Core Functionality
- **Bi-directional Sync**: Changes sync both ways (FlowFox ↔ Google Tasks)
- **Board-to-Task List Mapping**: Map any FlowFox board to a Google Task List
- **Automatic Conflict Resolution**: Last-write-wins strategy for conflicts
- **Sync Status Indicators**: Visual indicators show which cards are synced
- **Manual Sync**: Trigger sync on-demand from the settings page

### ✅ Data Mapping
- Task title ↔ Card title
- Task notes ↔ Card description (with priority metadata)
- Task status ↔ Card status (completed/pending)
- Task due date ↔ Card due date
- Priority stored in task notes with `[Priority: X]` format

### ✅ Database Schema
- `google_task_list_mappings` - Board to Task List mappings
- `google_task_sync_state` - Per-card sync status tracking
- `google_sync_queue` - Queue for offline edits (future use)
- `google_sync_audit_log` - Conflict and change audit trail

## Setup Instructions

### 1. Google Cloud Console Setup

You should have already completed this during authentication setup:

- ✅ Created OAuth 2.0 credentials
- ✅ Enabled Google Tasks API
- ✅ Configured OAuth consent screen with Tasks scope
- ✅ Added credentials to `.env.local`

If not, follow [GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md).

### 2. Database Migration

Run the Google Tasks sync migration:

```bash
# Using Supabase CLI
supabase migration up

# Or manually apply the migration
psql $DATABASE_URL < supabase/migrations/003_google_tasks_sync.sql
```

This creates all necessary tables for sync tracking.

### 3. Access the Integration Settings

1. Navigate to `/settings/integrations` in FlowFox
2. Click "Load Google Task Lists" to fetch your Google Task Lists
3. Select a FlowFox board and a Google Task List
4. Click "Create Mapping" to link them

### 4. Trigger Initial Sync

Click "Sync Now" to perform the first synchronization. This will:
- Import all tasks from the Google Task List as cards
- Export unmapped FlowFox cards to Google Tasks
- Establish sync state for all items

## How Sync Works

### Sync Flow

```
┌─────────────┐         ┌──────────────────┐         ┌────────────┐
│ Google      │ ◄─────► │ Sync Engine      │ ◄─────► │ FlowFox    │
│ Tasks       │         │ (Last-write-wins)│         │ Cards      │
└─────────────┘         └──────────────────┘         └────────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │ Sync State   │
                        │ Audit Log    │
                        └──────────────┘
```

### Sync Process

1. **Fetch Data**: Retrieve cards from FlowFox and tasks from Google
2. **Match Pairs**: Use `google_task_sync_state` to match existing pairs
3. **Create New**:
   - Unmatched Google Tasks → New FlowFox cards (in first column)
   - Unmatched FlowFox cards → New Google Tasks
4. **Sync Changes**:
   - Detect conflicts (both sides modified)
   - Resolve using last-write-wins (most recent timestamp wins)
   - Update winning side's data to losing side
5. **Update State**: Record sync timestamps and status

### Conflict Resolution

When both FlowFox and Google Tasks are modified since last sync:

1. Compare `updated_at` timestamps
2. Apply most recent changes to other side
3. Log conflict in `google_sync_audit_log`
4. Update `google_task_sync_state` with new timestamps

Example audit log entry:
```json
{
  "event_type": "sync_conflict",
  "flowfox_data": { "title": "Old Title", "updated_at": "2026-01-20T10:00:00Z" },
  "google_data": { "title": "New Title", "updated": "2026-01-20T10:05:00Z" },
  "resolution": "Last-write-wins: google"
}
```

## API Endpoints

### GET /api/google/task-lists
Fetch all Google Task Lists for authenticated user

**Response:**
```json
{
  "taskLists": [
    {
      "id": "tasklist-id-123",
      "title": "My Tasks",
      "updated": "2026-01-20T10:00:00.000Z"
    }
  ]
}
```

### GET /api/google/mappings
Fetch all board-to-tasklist mappings for current user

**Response:**
```json
{
  "mappings": [
    {
      "id": "mapping-uuid",
      "board_id": "board-uuid",
      "google_task_list_id": "tasklist-id-123",
      "google_task_list_title": "My Tasks",
      "sync_enabled": true,
      "boards": {
        "id": "board-uuid",
        "name": "Project X",
        "description": "..."
      }
    }
  ]
}
```

### POST /api/google/mappings
Create a new board-to-tasklist mapping

**Request:**
```json
{
  "boardId": "board-uuid",
  "googleTaskListId": "tasklist-id-123",
  "googleTaskListTitle": "My Tasks"
}
```

**Response:**
```json
{
  "mapping": { ... }
}
```

### DELETE /api/google/mappings
Remove a mapping

**Request:**
```json
{
  "mappingId": "mapping-uuid"
}
```

### POST /api/google/sync
Trigger manual sync for all mapped boards

**Response:**
```json
{
  "success": true,
  "results": {
    "board-uuid-1": {
      "success": true,
      "cardsCreated": 5,
      "cardsUpdated": 3,
      "tasksCreated": 2,
      "tasksUpdated": 1,
      "conflicts": 1,
      "errors": []
    }
  }
}
```

## Code Structure

```
src/
├── lib/google/
│   ├── tasks-client.ts       # Google Tasks API wrapper
│   ├── transform.ts           # Data transformation layer
│   └── sync.ts                # Bi-directional sync engine
├── app/api/google/
│   ├── task-lists/route.ts   # Fetch task lists
│   ├── mappings/route.ts     # CRUD for mappings
│   └── sync/route.ts          # Manual sync trigger
├── app/(dashboard)/settings/
│   └── integrations/page.tsx  # Settings UI
└── components/board/
    └── kanban-card.tsx        # Sync indicator

supabase/migrations/
└── 003_google_tasks_sync.sql  # Database schema
```

## Usage Examples

### Example 1: Initial Setup

```typescript
// 1. User navigates to /settings/integrations
// 2. Clicks "Load Google Task Lists"
GET /api/google/task-lists

// 3. Selects board "Website Redesign" and task list "Work Tasks"
POST /api/google/mappings
{
  "boardId": "board-123",
  "googleTaskListId": "tasklist-456",
  "googleTaskListTitle": "Work Tasks"
}

// 4. Clicks "Sync Now"
POST /api/google/sync

// Result: All tasks from "Work Tasks" appear as cards in "Website Redesign"
```

### Example 2: Daily Workflow

```typescript
// Morning: User creates tasks in Google Tasks mobile app
// - "Design hero section"
// - "Fix navigation bug"

// Afternoon: User opens FlowFox
POST /api/google/sync  // Triggered manually or via cron

// Result: New cards appear in FlowFox board
// - Card: "Design hero section" (in first column)
// - Card: "Fix navigation bug" (in first column)

// User moves cards to "In Progress" column in FlowFox
// User marks "Fix navigation bug" as complete

// Next sync:
// - Google Task "Fix navigation bug" marked as completed
// - Both tasks remain in their Google Task List positions
```

### Example 3: Conflict Scenario

```typescript
// Scenario: User edits task in both systems before sync

// Google Tasks (10:00 AM):
// - Edit task title: "Design hero section" → "Design new hero section"

// FlowFox (10:05 AM):
// - Edit same card title: "Design hero section" → "Create hero section design"

// Sync runs (10:10 AM):
POST /api/google/sync

// Result:
// - Conflict detected
// - FlowFox change is newer (10:05 > 10:00)
// - Google Task updated to "Create hero section design"
// - Audit log records the conflict and resolution
```

## Priority Mapping

FlowFox priorities are stored in Google Task notes with special formatting:

```
[Priority: High]

This is the task description.
More details here.
```

On import, the transformation layer:
1. Extracts `[Priority: X]` tag from notes
2. Sets card priority accordingly
3. Stores remaining text as description

On export:
1. Prepends `[Priority: X]` to description
2. Sends combined text as Google Task notes

Alternative hashtag format also supported:
```
This task is #high priority.
```

## Sync Status Indicators

Cards synced with Google Tasks show a cloud icon (☁️) in the card footer:

```tsx
<Cloud className="h-3 w-3 text-blue-500" />
```

Hover shows tooltip: "Synced with Google Tasks"

## Future Enhancements (Week 6+)

### Planned Features
- [ ] Automatic sync every 5 minutes (pg_cron)
- [ ] Per-card sync toggle
- [ ] Offline queue processing for failed syncs
- [ ] Retry logic with exponential backoff
- [ ] Subtasks sync (Google Tasks supports 1-level nesting)
- [ ] Position sync (maintain task order)
- [ ] Real-time sync via webhooks (if Google adds support)

### Database Ready For
- `google_sync_queue` table exists for offline edits
- `retry_count` and `max_retries` columns for exponential backoff
- `sync_enabled` flag on both mapping and sync_state tables

## Troubleshooting

### Sync Not Working

1. **Check OAuth Scopes**: Ensure `https://www.googleapis.com/auth/tasks` is in [auth.ts](src/auth.ts:5)
2. **Verify API Enabled**: Google Tasks API must be enabled in Google Cloud Console
3. **Check Logs**: Look for errors in browser console and server logs
4. **Re-authenticate**: Sign out and sign in again to refresh tokens

### Missing Tasks

- Tasks only sync if they're in a mapped task list
- Check `/settings/integrations` to verify mapping exists
- Completed tasks require `showCompleted: true` in API call (already set)

### Duplicate Cards

- Should not happen - sync state prevents duplicates
- If it occurs, delete the mapping and recreate it
- Check `google_task_sync_state` table for orphaned entries

### Conflicts Not Resolving

- Verify `updated_at` timestamps are accurate
- Check `google_sync_audit_log` for conflict records
- Last-write-wins always chooses most recent timestamp

## Security Considerations

- ✅ Access tokens stored in session (encrypted JWTs)
- ✅ Row Level Security (RLS) on all sync tables
- ✅ Users can only sync their own boards
- ✅ Sync state isolated per user via board membership
- ✅ Audit log tracks all conflict resolutions

## Performance

- Sync scales well up to ~100 cards per board
- API rate limits: 50,000 queries/day (Google Tasks)
- Batching not currently implemented (future optimization)
- Recommend syncing max 5 boards per user

## Testing Checklist

Before deploying to production:

- [ ] Run database migration successfully
- [ ] Create a board-to-tasklist mapping in UI
- [ ] Trigger manual sync and verify tasks import
- [ ] Create a card in FlowFox, sync, verify task in Google
- [ ] Edit task in Google, sync, verify card updates
- [ ] Create conflict scenario and verify resolution
- [ ] Check audit log for conflict entries
- [ ] Verify sync indicator appears on cards
- [ ] Test with multiple boards and task lists
- [ ] Verify RLS policies prevent unauthorized access

## Support

For issues or questions:
1. Check [GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md) for auth setup
2. Review this document for sync concepts
3. Check server logs for error details
4. Inspect `google_sync_audit_log` table for conflict history

---

**Implementation Status**: ✅ Complete (Week 6)
**Next Phase**: Week 7 - Time Tracking
