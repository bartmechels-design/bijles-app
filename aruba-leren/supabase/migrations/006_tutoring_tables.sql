-- ============================================
-- Migration 006: Tutoring Tables
-- Phase 4: AI Tutor Core Foundations
-- ============================================
-- Maakt tabellen voor tutoring sessies, berichten en huiswerk-uploads.
-- Voer dit uit in Supabase Dashboard > SQL Editor.
-- ============================================

-- 1. Tutoring Sessions
-- Slaat bijlessessies op per kind per vak
CREATE TABLE IF NOT EXISTS tutoring_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  subject TEXT NOT NULL CHECK (subject IN ('taal', 'rekenen', 'begrijpend_lezen', 'geschiedenis', 'aardrijkskunde', 'kennis_der_natuur')),
  difficulty_level INT NOT NULL DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{"consecutive_correct": 0, "consecutive_incorrect": 0, "total_hints_given": 0, "total_messages": 0, "tokens_used": 0, "igdi_phase": "instructie"}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tutoring Messages
-- Slaat individuele berichten op per sessie
CREATE TABLE IF NOT EXISTS tutoring_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES tutoring_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Homework Uploads
-- Telefoon-naar-PC huiswerk foto-overdracht via 6-karakter codes
CREATE TABLE IF NOT EXISTS homework_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_code TEXT NOT NULL UNIQUE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  session_id UUID REFERENCES tutoring_sessions(id) ON DELETE SET NULL,
  image_data TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'uploaded', 'picked_up', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes')
);

-- ============================================
-- Indexes
-- ============================================

-- Sessie-indexes
CREATE INDEX IF NOT EXISTS idx_tutoring_sessions_child_id ON tutoring_sessions(child_id);
CREATE INDEX IF NOT EXISTS idx_tutoring_sessions_child_subject ON tutoring_sessions(child_id, subject);

-- Bericht-indexes
CREATE INDEX IF NOT EXISTS idx_tutoring_messages_session_id ON tutoring_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_tutoring_messages_session_created ON tutoring_messages(session_id, created_at);

-- Upload-indexes
CREATE INDEX IF NOT EXISTS idx_homework_uploads_code ON homework_uploads(upload_code);
CREATE INDEX IF NOT EXISTS idx_homework_uploads_status ON homework_uploads(status, expires_at);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

ALTER TABLE tutoring_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutoring_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_uploads ENABLE ROW LEVEL SECURITY;

-- Ouders kunnen sessies van hun eigen kinderen beheren
DROP POLICY IF EXISTS "Parents can manage their children's sessions" ON tutoring_sessions;
CREATE POLICY "Parents can manage their children's sessions"
  ON tutoring_sessions
  FOR ALL
  USING (
    child_id IN (
      SELECT c.id FROM children c
      JOIN profiles p ON c.parent_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Ouders kunnen berichten van hun kinderen's sessies beheren
DROP POLICY IF EXISTS "Parents can manage their children's messages" ON tutoring_messages;
CREATE POLICY "Parents can manage their children's messages"
  ON tutoring_messages
  FOR ALL
  USING (
    session_id IN (
      SELECT ts.id FROM tutoring_sessions ts
      JOIN children c ON ts.child_id = c.id
      JOIN profiles p ON c.parent_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Ouders kunnen uploads van hun kinderen beheren
DROP POLICY IF EXISTS "Parents can manage their children's uploads" ON homework_uploads;
CREATE POLICY "Parents can manage their children's uploads"
  ON homework_uploads
  FOR ALL
  USING (
    child_id IN (
      SELECT c.id FROM children c
      JOIN profiles p ON c.parent_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );
