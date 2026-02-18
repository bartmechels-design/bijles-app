-- ============================================
-- Migration 007: Assessment & Progress Tables
-- Phase 5: Baseline Assessment & Progress Tracking
-- ============================================
-- Run in: Supabase Dashboard > SQL Editor
-- ============================================

-- 1. Add session_type to existing tutoring_sessions table
ALTER TABLE tutoring_sessions
  ADD COLUMN IF NOT EXISTS session_type TEXT NOT NULL DEFAULT 'tutoring'
    CHECK (session_type IN ('assessment', 'tutoring'));

-- Index for filtering by session_type
CREATE INDEX IF NOT EXISTS idx_tutoring_sessions_type
  ON tutoring_sessions(child_id, subject, session_type);

-- 2. Child Subject Progress (current state — one row per child+subject)
CREATE TABLE IF NOT EXISTS child_subject_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  subject TEXT NOT NULL CHECK (subject IN (
    'taal', 'rekenen', 'begrijpend_lezen',
    'geschiedenis', 'aardrijkskunde', 'kennis_der_natuur'
  )),
  -- Level and assessment state
  current_level INT NOT NULL DEFAULT 1 CHECK (current_level BETWEEN 1 AND 5),
  assessment_completed BOOLEAN NOT NULL DEFAULT false,
  assessment_session_id UUID REFERENCES tutoring_sessions(id) ON DELETE SET NULL,
  -- Progress metrics
  total_sessions INT NOT NULL DEFAULT 0,
  total_correct INT NOT NULL DEFAULT 0,
  total_incorrect INT NOT NULL DEFAULT 0,
  total_hints_received INT NOT NULL DEFAULT 0,
  -- Stuck detection
  is_stuck BOOLEAN NOT NULL DEFAULT false,
  stuck_since TIMESTAMPTZ,              -- When the current stuck episode started
  stuck_concept_count INT NOT NULL DEFAULT 0, -- Total stuck episodes ever
  -- Timestamps
  last_session_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Unique constraint: one row per child+subject
  UNIQUE (child_id, subject)
);

-- Indexes for child_subject_progress
CREATE INDEX IF NOT EXISTS idx_child_subject_progress_child
  ON child_subject_progress(child_id);
CREATE INDEX IF NOT EXISTS idx_child_subject_progress_child_subject
  ON child_subject_progress(child_id, subject);
CREATE INDEX IF NOT EXISTS idx_child_subject_progress_stuck
  ON child_subject_progress(is_stuck) WHERE is_stuck = true;

-- 3. Progress Events (append-only ledger — many rows per child+subject)
CREATE TABLE IF NOT EXISTS progress_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  subject TEXT NOT NULL CHECK (subject IN (
    'taal', 'rekenen', 'begrijpend_lezen',
    'geschiedenis', 'aardrijkskunde', 'kennis_der_natuur'
  )),
  session_id UUID REFERENCES tutoring_sessions(id) ON DELETE SET NULL,
  -- Event type and data
  event_type TEXT NOT NULL CHECK (event_type IN (
    'assessment_completed',  -- Baseline assessment finished
    'level_up',              -- Level increased after correct streak
    'level_down',            -- Level decreased after incorrect streak
    'stuck_flagged',         -- Child stuck 3x on a concept
    'stuck_cleared',         -- Stuck flag cleared (correct answer)
    'session_started',       -- Tutoring session started
    'session_ended'          -- Tutoring session ended
  )),
  -- Snapshot of state at event time
  level_at_event INT NOT NULL CHECK (level_at_event BETWEEN 1 AND 5),
  metadata JSONB,            -- Extra context (e.g., {reason: 'consecutive_correct'})
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for progress_events
CREATE INDEX IF NOT EXISTS idx_progress_events_child
  ON progress_events(child_id);
CREATE INDEX IF NOT EXISTS idx_progress_events_child_subject
  ON progress_events(child_id, subject, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_progress_events_session
  ON progress_events(session_id);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

ALTER TABLE child_subject_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_events ENABLE ROW LEVEL SECURITY;

-- Parents can manage their children's progress data
DROP POLICY IF EXISTS "Parents can manage their children's progress" ON child_subject_progress;
CREATE POLICY "Parents can manage their children's progress"
  ON child_subject_progress
  FOR ALL
  USING (
    child_id IN (
      SELECT c.id FROM children c
      JOIN profiles p ON c.parent_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Parents can view their children's progress events" ON progress_events;
CREATE POLICY "Parents can view their children's progress events"
  ON progress_events
  FOR ALL
  USING (
    child_id IN (
      SELECT c.id FROM children c
      JOIN profiles p ON c.parent_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );
