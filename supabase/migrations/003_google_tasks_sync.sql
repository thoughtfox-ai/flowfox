-- Google Tasks Integration Tables
-- Tracks mapping between FlowFox boards and Google Task Lists

-- Table: google_task_list_mappings
-- Maps FlowFox boards to Google Task Lists
CREATE TABLE IF NOT EXISTS google_task_list_mappings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  google_task_list_id TEXT NOT NULL,
  google_task_list_title TEXT NOT NULL,
  sync_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(board_id, google_task_list_id)
);

-- Table: google_task_sync_state
-- Tracks sync status for each card
CREATE TABLE IF NOT EXISTS google_task_sync_state (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  google_task_id TEXT UNIQUE,
  google_task_list_id TEXT NOT NULL,
  last_synced_at TIMESTAMPTZ,
  last_google_updated_at TIMESTAMPTZ,
  last_flowfox_updated_at TIMESTAMPTZ,
  sync_status TEXT CHECK (sync_status IN ('synced', 'pending', 'conflict', 'error')) DEFAULT 'pending',
  sync_enabled BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(card_id)
);

-- Table: google_sync_queue
-- Queue for offline edits that need to be synced
CREATE TABLE IF NOT EXISTS google_sync_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  sync_state_id UUID REFERENCES google_task_sync_state(id) ON DELETE CASCADE,
  operation TEXT CHECK (operation IN ('create', 'update', 'delete')) NOT NULL,
  payload JSONB NOT NULL,
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- Table: google_sync_audit_log
-- Audit log for tracking conflicts and sync history
CREATE TABLE IF NOT EXISTS google_sync_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID REFERENCES cards(id) ON DELETE SET NULL,
  sync_state_id UUID REFERENCES google_task_sync_state(id) ON DELETE SET NULL,
  event_type TEXT CHECK (event_type IN ('sync_success', 'sync_conflict', 'sync_error', 'manual_override')) NOT NULL,
  google_task_id TEXT,
  flowfox_data JSONB,
  google_data JSONB,
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_list_mappings_user ON google_task_list_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_task_list_mappings_board ON google_task_list_mappings(board_id);
CREATE INDEX IF NOT EXISTS idx_sync_state_card ON google_task_sync_state(card_id);
CREATE INDEX IF NOT EXISTS idx_sync_state_google_task ON google_task_sync_state(google_task_id);
CREATE INDEX IF NOT EXISTS idx_sync_state_status ON google_task_sync_state(sync_status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON google_sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_created ON google_sync_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_card ON google_sync_audit_log(card_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON google_sync_audit_log(created_at);

-- Updated_at trigger for google_task_list_mappings
CREATE OR REPLACE FUNCTION update_google_task_list_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS google_task_list_mappings_updated_at ON google_task_list_mappings;
CREATE TRIGGER google_task_list_mappings_updated_at
  BEFORE UPDATE ON google_task_list_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_google_task_list_mappings_updated_at();

-- Updated_at trigger for google_task_sync_state
CREATE OR REPLACE FUNCTION update_google_task_sync_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS google_task_sync_state_updated_at ON google_task_sync_state;
CREATE TRIGGER google_task_sync_state_updated_at
  BEFORE UPDATE ON google_task_sync_state
  FOR EACH ROW
  EXECUTE FUNCTION update_google_task_sync_state_updated_at();

-- RLS Policies

-- google_task_list_mappings
ALTER TABLE google_task_list_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own task list mappings" ON google_task_list_mappings;
CREATE POLICY "Users can view their own task list mappings"
  ON google_task_list_mappings
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own task list mappings" ON google_task_list_mappings;
CREATE POLICY "Users can create their own task list mappings"
  ON google_task_list_mappings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own task list mappings" ON google_task_list_mappings;
CREATE POLICY "Users can update their own task list mappings"
  ON google_task_list_mappings
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own task list mappings" ON google_task_list_mappings;
CREATE POLICY "Users can delete their own task list mappings"
  ON google_task_list_mappings
  FOR DELETE
  USING (auth.uid() = user_id);

-- google_task_sync_state
ALTER TABLE google_task_sync_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view sync state for their cards" ON google_task_sync_state;
CREATE POLICY "Users can view sync state for their cards"
  ON google_task_sync_state
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cards c
      JOIN boards b ON c.board_id = b.id
      JOIN board_members bm ON b.id = bm.board_id
      WHERE c.id = card_id AND bm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create sync state for their cards" ON google_task_sync_state;
CREATE POLICY "Users can create sync state for their cards"
  ON google_task_sync_state
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cards c
      JOIN boards b ON c.board_id = b.id
      JOIN board_members bm ON b.id = bm.board_id
      WHERE c.id = card_id AND bm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update sync state for their cards" ON google_task_sync_state;
CREATE POLICY "Users can update sync state for their cards"
  ON google_task_sync_state
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM cards c
      JOIN boards b ON c.board_id = b.id
      JOIN board_members bm ON b.id = bm.board_id
      WHERE c.id = card_id AND bm.user_id = auth.uid()
    )
  );

-- google_sync_queue
ALTER TABLE google_sync_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their sync queue items" ON google_sync_queue;
CREATE POLICY "Users can view their sync queue items"
  ON google_sync_queue
  FOR SELECT
  USING (
    card_id IS NULL OR
    EXISTS (
      SELECT 1 FROM cards c
      JOIN boards b ON c.board_id = b.id
      JOIN board_members bm ON b.id = bm.board_id
      WHERE c.id = card_id AND bm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert their sync queue items" ON google_sync_queue;
CREATE POLICY "Users can insert their sync queue items"
  ON google_sync_queue
  FOR INSERT
  WITH CHECK (
    card_id IS NULL OR
    EXISTS (
      SELECT 1 FROM cards c
      JOIN boards b ON c.board_id = b.id
      JOIN board_members bm ON b.id = bm.board_id
      WHERE c.id = card_id AND bm.user_id = auth.uid()
    )
  );

-- google_sync_audit_log
ALTER TABLE google_sync_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their audit log entries" ON google_sync_audit_log;
CREATE POLICY "Users can view their audit log entries"
  ON google_sync_audit_log
  FOR SELECT
  USING (
    card_id IS NULL OR
    EXISTS (
      SELECT 1 FROM cards c
      JOIN boards b ON c.board_id = b.id
      JOIN board_members bm ON b.id = bm.board_id
      WHERE c.id = card_id AND bm.user_id = auth.uid()
    )
  );
