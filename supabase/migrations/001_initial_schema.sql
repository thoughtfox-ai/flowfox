-- ============================================
-- FOXFLOW DATABASE SCHEMA
-- Version: 1.0
-- Initial migration for core tables
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For full-text search

-- ============================================
-- CORE TABLES
-- ============================================

-- Users (synced from Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    google_id TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Workspaces (organisation level)
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    google_domain TEXT,  -- For SSO domain restriction
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Workspace members
CREATE TABLE IF NOT EXISTS workspace_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

-- Boards
CREATE TABLE IF NOT EXISTS boards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    slug TEXT NOT NULL,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_boards_workspace ON boards(workspace_id);

-- Board members (access control)
CREATE TABLE IF NOT EXISTS board_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'contributor' CHECK (role IN ('viewer', 'contributor', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(board_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_board_members_user ON board_members(user_id);
CREATE INDEX IF NOT EXISTS idx_board_members_board ON board_members(board_id);

-- Columns (within boards)
CREATE TABLE IF NOT EXISTS columns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position INTEGER NOT NULL,
    wip_limit INTEGER,  -- Work in progress limit (NULL = no limit)
    is_done_column BOOLEAN NOT NULL DEFAULT FALSE,  -- Marks completion
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_columns_board ON columns(board_id);

-- Labels (board-scoped)
CREATE TABLE IF NOT EXISTS labels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL,  -- Hex color code
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(board_id, name)
);

-- Cards (tasks)
CREATE TABLE IF NOT EXISTS cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    column_id UUID NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    position INTEGER NOT NULL,
    priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    due_date DATE,
    time_estimate_minutes INTEGER,
    time_logged_minutes INTEGER NOT NULL DEFAULT 0,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    sync_to_google BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cards_board ON cards(board_id);
CREATE INDEX IF NOT EXISTS idx_cards_column ON cards(column_id);
CREATE INDEX IF NOT EXISTS idx_cards_due_date ON cards(due_date);
CREATE INDEX IF NOT EXISTS idx_cards_created_by ON cards(created_by);
CREATE INDEX IF NOT EXISTS idx_cards_search ON cards USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Card assignments (many-to-many)
CREATE TABLE IF NOT EXISTS card_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(card_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_card_assignments_user ON card_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_card_assignments_card ON card_assignments(card_id);

-- Card labels (many-to-many)
CREATE TABLE IF NOT EXISTS card_labels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(card_id, label_id)
);

-- Subtasks
CREATE TABLE IF NOT EXISTS subtasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    parent_subtask_id UUID REFERENCES subtasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    assignee_id UUID REFERENCES users(id),
    due_date DATE,
    position INTEGER NOT NULL,
    is_checklist_item BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_subtasks_card ON subtasks(card_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_parent ON subtasks(parent_subtask_id);

-- Card dependencies
CREATE TABLE IF NOT EXISTS card_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocking_card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    blocked_card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(blocking_card_id, blocked_card_id),
    CHECK (blocking_card_id != blocked_card_id)
);

CREATE INDEX IF NOT EXISTS idx_dependencies_blocking ON card_dependencies(blocking_card_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_blocked ON card_dependencies(blocked_card_id);

-- ============================================
-- TIME TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS time_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    duration_minutes INTEGER NOT NULL,
    description TEXT,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    is_running BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_time_entries_card ON time_entries(card_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_running ON time_entries(user_id, is_running) WHERE is_running = TRUE;

-- ============================================
-- RECURRING TASKS
-- ============================================

CREATE TABLE IF NOT EXISTS recurring_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    column_id UUID NOT NULL REFERENCES columns(id),
    template_title TEXT NOT NULL,
    template_description TEXT,
    template_priority TEXT CHECK (template_priority IN ('low', 'medium', 'high', 'critical')),
    template_time_estimate_minutes INTEGER,
    template_labels UUID[],
    template_assignees UUID[],
    recurrence_pattern TEXT NOT NULL CHECK (recurrence_pattern IN (
        'daily', 'weekly', 'fortnightly', 'monthly_date', 'monthly_relative', 'quarterly'
    )),
    recurrence_days INTEGER[],
    recurrence_relative TEXT,
    lead_time_days INTEGER NOT NULL DEFAULT 0,
    next_occurrence DATE,
    is_paused BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_board ON recurring_tasks(board_id);
CREATE INDEX IF NOT EXISTS idx_recurring_next ON recurring_tasks(next_occurrence) WHERE is_paused = FALSE;

-- ============================================
-- ACTIVITY LOG
-- ============================================

CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
    card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'card_created', 'card_updated', 'card_moved', 'card_archived',
        'card_assigned', 'card_unassigned',
        'subtask_created', 'subtask_completed', 'subtask_deleted',
        'comment_added', 'label_added', 'label_removed',
        'due_date_changed', 'priority_changed',
        'dependency_added', 'dependency_removed',
        'time_logged', 'board_created', 'board_updated',
        'member_added', 'member_removed'
    )),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_board ON activities(board_id);
CREATE INDEX IF NOT EXISTS idx_activities_card ON activities(card_id);
CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_created ON activities(created_at DESC);

-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'card_assigned', 'card_mentioned', 'card_due_soon', 'card_overdue',
        'task_unblocked', 'comment_reply', 'board_invite'
    )),
    title TEXT NOT NULL,
    body TEXT,
    link TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

-- Notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    email_frequency TEXT NOT NULL DEFAULT 'daily' CHECK (email_frequency IN ('immediate', 'daily', 'weekly', 'none')),
    slack_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    slack_webhook_url TEXT,
    due_reminder_hours INTEGER[] NOT NULL DEFAULT ARRAY[24, 2],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- COMPOSITE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_cards_board_column ON cards(board_id, column_id);
CREATE INDEX IF NOT EXISTS idx_cards_assignee_due ON card_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_board_created ON activities(board_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cards_not_archived ON cards(board_id) WHERE is_archived = FALSE;
-- Note: Overdue filtering (due_date < CURRENT_DATE) done at query time, not in index
CREATE INDEX IF NOT EXISTS idx_cards_incomplete_with_due ON cards(due_date) WHERE due_date IS NOT NULL AND completed_at IS NULL;

-- ============================================
-- TRIGGERS
-- ============================================

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_boards_updated_at BEFORE UPDATE ON boards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_subtasks_updated_at BEFORE UPDATE ON subtasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_columns_updated_at BEFORE UPDATE ON columns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_recurring_tasks_updated_at BEFORE UPDATE ON recurring_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Set completed_at when card moves to done column
CREATE OR REPLACE FUNCTION set_card_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.column_id != OLD.column_id THEN
        IF EXISTS (SELECT 1 FROM columns WHERE id = NEW.column_id AND is_done_column = TRUE) THEN
            NEW.completed_at = NOW();
        ELSE
            NEW.completed_at = NULL;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER card_completed_trigger BEFORE UPDATE ON cards
    FOR EACH ROW EXECUTE FUNCTION set_card_completed_at();

-- Update card time_logged_minutes when time entry added
CREATE OR REPLACE FUNCTION update_card_time_logged()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE cards SET time_logged_minutes = (
            SELECT COALESCE(SUM(duration_minutes), 0)
            FROM time_entries WHERE card_id = NEW.card_id AND is_running = FALSE
        )
        WHERE id = NEW.card_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER time_entry_update_card AFTER INSERT OR UPDATE ON time_entries
    FOR EACH ROW EXECUTE FUNCTION update_card_time_logged();
