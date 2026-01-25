# FlowFox Database Tables Reference

This document lists all tables created by the FlowFox migrations in Supabase.

---

## 📊 Summary

**Total Tables:** 21
**Created by:** 5 SQL migration files
**Database:** PostgreSQL (Supabase)
**Extensions Required:** `uuid-ossp`, `pg_trgm` (full-text search)

---

## Core Tables (17 tables)

Created by: `001_initial_schema.sql`

### 1. **users**
- **Purpose:** User profiles synced from Supabase Auth
- **Key Fields:** id (UUID), email, full_name, avatar_url, google_id
- **Relationships:** Referenced by boards, cards, assignments, activities
- **Notes:** ID matches Supabase auth.users(id)

### 2. **workspaces**
- **Purpose:** Organization-level grouping for boards
- **Key Fields:** id (UUID), name, slug, google_domain, created_by
- **Relationships:** Contains boards, workspace_members
- **Notes:** Supports SSO domain restriction via google_domain

### 3. **workspace_members**
- **Purpose:** Workspace access control
- **Key Fields:** workspace_id, user_id, role
- **Roles:** owner, admin, member
- **Relationships:** Links users to workspaces

### 4. **boards**
- **Purpose:** Kanban boards (projects/engagements)
- **Key Fields:** id (UUID), workspace_id, name, slug, is_archived
- **Relationships:** Contains columns, cards, labels
- **Notes:** Unique slug per workspace

### 5. **board_members**
- **Purpose:** Board-level access control
- **Key Fields:** board_id, user_id, role
- **Roles:** viewer, contributor, admin
- **Relationships:** Links users to boards
- **Notes:** Used by RLS policies for permission checks

### 6. **columns**
- **Purpose:** Kanban columns within boards
- **Key Fields:** id (UUID), board_id, name, position, wip_limit, is_done_column
- **Relationships:** Contains cards
- **Notes:**
  - `wip_limit`: Work-in-progress limit (NULL = no limit)
  - `is_done_column`: Marks column as completion state

### 7. **labels**
- **Purpose:** Color-coded labels for categorization
- **Key Fields:** id (UUID), board_id, name, color
- **Relationships:** Applied to cards via card_labels
- **Notes:** Board-scoped, unique name per board

### 8. **cards**
- **Purpose:** Tasks/work items on the Kanban board
- **Key Fields:**
  - id (UUID), board_id, column_id, title, description
  - priority, due_date, position
  - time_estimate_minutes, time_logged_minutes
  - is_archived, sync_to_google
  - completed_at
- **Relationships:**
  - Belongs to column
  - Has subtasks, assignments, labels, dependencies
- **Notes:**
  - Auto-sets `completed_at` when moved to done column (trigger)
  - Full-text search enabled on title + description

### 9. **card_assignments**
- **Purpose:** Many-to-many relationship for card assignees
- **Key Fields:** card_id, user_id
- **Relationships:** Links cards to assigned users
- **Notes:** Unique constraint prevents duplicate assignments

### 10. **card_labels**
- **Purpose:** Many-to-many relationship for card labels
- **Key Fields:** card_id, label_id
- **Relationships:** Links cards to labels
- **Notes:** Unique constraint prevents duplicate labels

### 11. **subtasks**
- **Purpose:** Hierarchical sub-tasks (2 levels max)
- **Key Fields:**
  - id (UUID), card_id, parent_subtask_id
  - title, is_completed, assignee_id, due_date
  - position, is_checklist_item
  - completed_at
- **Relationships:**
  - Belongs to card
  - Can have parent subtask (for nesting)
- **Notes:** Max nesting: task → subtask → sub-subtask

### 12. **card_dependencies**
- **Purpose:** Track blocking relationships between cards
- **Key Fields:** blocking_card_id, blocked_card_id, created_by
- **Relationships:** Links two cards (blocker and blocked)
- **Notes:**
  - Prevents circular dependencies (CHECK constraint)
  - Used for task unblocking notifications

### 13. **time_entries**
- **Purpose:** Time tracking for cards
- **Key Fields:**
  - card_id, user_id, duration_minutes
  - description, started_at, ended_at
  - is_running
- **Relationships:** Links cards to user time logs
- **Notes:**
  - Trigger auto-updates `cards.time_logged_minutes`
  - Only one running timer per user (enforced by index)

### 14. **recurring_tasks**
- **Purpose:** Templates for automatically creating recurring tasks
- **Key Fields:**
  - board_id, column_id, template_title
  - recurrence_pattern, recurrence_days
  - next_occurrence, is_paused
- **Patterns:** daily, weekly, fortnightly, monthly_date, monthly_relative, quarterly
- **Notes:**
  - `lead_time_days`: How many days before due date to create task
  - Stores template for labels/assignees as UUID arrays

### 15. **activities**
- **Purpose:** Activity/audit log for workspace events
- **Key Fields:**
  - workspace_id, board_id, card_id, user_id
  - activity_type, metadata (JSONB)
- **Activity Types:**
  - card_created, card_updated, card_moved, card_archived
  - card_assigned, card_unassigned
  - subtask_created, subtask_completed
  - label_added, label_removed
  - due_date_changed, priority_changed
  - dependency_added, dependency_removed
  - time_logged, board_created
  - member_added, member_removed
- **Notes:** Queryable by board/card/user with timestamp ordering

### 16. **notifications**
- **Purpose:** In-app notifications for users
- **Key Fields:**
  - user_id, type, title, body, link
  - is_read, metadata (JSONB)
- **Notification Types:**
  - card_assigned, card_mentioned
  - card_due_soon, card_overdue
  - task_unblocked, comment_reply
  - board_invite
- **Notes:** Indexed for efficient unread queries

### 17. **notification_preferences**
- **Purpose:** User notification settings
- **Key Fields:**
  - user_id, email_frequency
  - slack_enabled, slack_webhook_url
  - due_reminder_hours (array)
- **Email Frequencies:** immediate, daily, weekly, none
- **Notes:** Default reminders at 24h and 2h before due

---

## Google Tasks Sync Tables (4 tables)

Created by: `003_google_tasks_sync.sql`

### 18. **google_task_list_mappings**
- **Purpose:** Maps FlowFox boards to Google Task Lists
- **Key Fields:**
  - user_id, board_id
  - google_task_list_id, google_task_list_title
  - sync_enabled
- **Relationships:** Links boards to external Google Task Lists
- **Notes:**
  - Per-user mappings (different users can map same board differently)
  - Unique constraint: one mapping per board+task_list combo

### 19. **google_task_sync_state**
- **Purpose:** Tracks sync status for each card
- **Key Fields:**
  - card_id, google_task_id, google_task_list_id
  - last_synced_at, last_google_updated_at, last_flowfox_updated_at
  - sync_status, sync_enabled, error_message
- **Sync Statuses:** synced, pending, conflict, error
- **Relationships:** One-to-one with cards (when synced)
- **Notes:**
  - Stores last updated timestamps for conflict resolution
  - Unique google_task_id (prevents duplicate Google Tasks)

### 20. **google_sync_queue**
- **Purpose:** Queue for offline edits that need to be synced
- **Key Fields:**
  - card_id, sync_state_id
  - operation, payload (JSONB)
  - status, retry_count, max_retries
  - error_message
- **Operations:** create, update, delete
- **Queue Statuses:** pending, processing, completed, failed
- **Notes:**
  - Retry logic with max 3 retries (configurable)
  - Processed timestamp for completed items

### 21. **google_sync_audit_log**
- **Purpose:** Audit trail for sync conflicts and debugging
- **Key Fields:**
  - card_id, sync_state_id
  - event_type, google_task_id
  - flowfox_data (JSONB), google_data (JSONB)
  - resolution
- **Event Types:** sync_success, sync_conflict, sync_error, manual_override
- **Notes:**
  - Stores both data versions for conflict analysis
  - SET NULL on delete (preserves history even after card deletion)

---

## Table Relationships Diagram

```
workspaces
├── workspace_members → users
├── boards
│   ├── board_members → users
│   ├── columns
│   │   └── cards
│   │       ├── card_assignments → users
│   │       ├── card_labels → labels
│   │       ├── subtasks
│   │       │   └── subtasks (self-referencing)
│   │       ├── card_dependencies (self-referencing)
│   │       ├── time_entries → users
│   │       ├── google_task_sync_state
│   │       │   └── google_sync_queue
│   │       └── activities → users
│   ├── labels
│   ├── recurring_tasks
│   └── google_task_list_mappings → users
├── activities → users, boards, cards
└── notifications → users
    └── notification_preferences
```

---

## Row Level Security (RLS)

**ALL tables have RLS enabled** via migration `002_rls_policies.sql`

### Policy Pattern:
- Users can only access data in boards they're members of
- Uses `current_user_id()` function to check permissions
- Enforced via `board_members` table lookups

### Key RLS Helper Function:
```sql
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN (auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Triggers & Automation

### Auto-updating Timestamps
- Triggers on: users, workspaces, boards, cards, subtasks, columns, recurring_tasks
- Function: `update_updated_at()` sets `updated_at = NOW()` on UPDATE

### Card Completion
- Trigger: `card_completed_trigger` on cards
- Auto-sets `completed_at` when card moved to done column
- Auto-clears `completed_at` when moved out of done column

### Time Tracking Aggregation
- Trigger: `time_entry_update_card` on time_entries
- Auto-updates `cards.time_logged_minutes` when time entry added/updated

---

## Performance Indexes

### Critical Indexes (High Traffic):
- `idx_cards_board_column` - Board + column queries
- `idx_cards_search` - Full-text search (GIN index)
- `idx_cards_not_archived` - Active card filtering
- `idx_cards_incomplete_with_due` - Overdue task queries
- `idx_activities_board_created` - Activity feed pagination

### Relationship Indexes:
- All foreign key columns have indexes for join performance
- Many-to-many tables have composite indexes

---

## Data Types Reference

| Column Pattern | Type | Notes |
|----------------|------|-------|
| `id` | UUID | Primary keys (auto-generated) |
| `*_id` | UUID | Foreign keys |
| `created_at` | TIMESTAMPTZ | Always NOT NULL, DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | Auto-updated by trigger |
| `is_*` | BOOLEAN | Status flags |
| `*_url` | TEXT | URLs and webhook endpoints |
| `metadata` / `payload` | JSONB | Flexible structured data |
| `due_date` | DATE | Date-only (no time) |
| `started_at`, `ended_at` | TIMESTAMPTZ | Time tracking |
| `role` | TEXT | Enum-like with CHECK constraint |

---

## Schema Versions

| Migration | Version | Tables Added | Purpose |
|-----------|---------|--------------|---------|
| 001 | 1.0 | 17 tables | Core schema |
| 002 | 1.1 | - | RLS policies |
| 003 | 1.2 | 4 tables | Google Tasks sync |
| 004 | 1.3 | - | NextAuth compatibility |
| 005 | 1.4 | - | User ID text conversion |

---

## Database Size Estimates

**Per Board (200 active cards):**
- Core data: ~50-100 KB
- With activities: ~150-200 KB
- With time tracking: ~200-300 KB
- With Google sync: ~250-350 KB

**Expected Growth:**
- 50 concurrent users
- 20 active boards
- 4,000 total cards
- **Total database size:** ~20-50 MB

---

## Migration Order (IMPORTANT)

When creating the database, run migrations in this exact order:

1. `001_initial_schema.sql` - Core tables
2. `002_rls_policies.sql` - Security policies
3. `003_google_tasks_sync.sql` - Google Tasks integration
4. `004_nextauth_compatibility.sql` - Auth compatibility
5. `005_users_id_to_text.sql` - Schema updates

**Do NOT skip migrations or change order** - later migrations depend on earlier ones.

---

## Quick Reference: Table Names Only

Copy-paste ready for SQL queries:

```
users
workspaces
workspace_members
boards
board_members
columns
labels
cards
card_assignments
card_labels
subtasks
card_dependencies
time_entries
recurring_tasks
activities
notifications
notification_preferences
google_task_list_mappings
google_task_sync_state
google_sync_queue
google_sync_audit_log
```

---

## Testing Queries

### Check all tables exist:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

### Count records across all tables:
```sql
SELECT
  schemaname,
  tablename,
  (SELECT COUNT(*) FROM pg_catalog.pg_class WHERE relname = tablename) as row_count
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

### Check RLS is enabled:
```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

---

**Last Updated:** 2026-01-22
**Schema Version:** 1.4
**Total Tables:** 21
