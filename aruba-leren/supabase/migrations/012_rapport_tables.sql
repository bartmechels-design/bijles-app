-- ============================================
-- Migration 012: Rapport Tables
-- Phase 11: Rapportages & PDF Deling
-- ============================================
-- Run in: Supabase Dashboard > SQL Editor
-- ============================================

-- 1. report_tokens tabel (voor gedeelde rapport-links — plan 11-03)
CREATE TABLE IF NOT EXISTS report_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id    UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  pin_hash    TEXT,
  report_data JSONB NOT NULL,
  locale      TEXT NOT NULL DEFAULT 'nl' CHECK (locale IN ('nl', 'pap', 'es', 'en')),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_tokens_token ON report_tokens(token);
CREATE INDEX IF NOT EXISTS idx_report_tokens_child ON report_tokens(child_id);

ALTER TABLE report_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can create report tokens" ON report_tokens FOR INSERT
  WITH CHECK (child_id IN (SELECT c.id FROM children c JOIN profiles p ON c.parent_id = p.id WHERE p.user_id = auth.uid()));

CREATE POLICY "Parents can delete report tokens" ON report_tokens FOR DELETE
  USING (child_id IN (SELECT c.id FROM children c JOIN profiles p ON c.parent_id = p.id WHERE p.user_id = auth.uid()));

CREATE POLICY "Parents can view report tokens" ON report_tokens FOR SELECT
  USING (child_id IN (SELECT c.id FROM children c JOIN profiles p ON c.parent_id = p.id WHERE p.user_id = auth.uid()));

-- 2. study_plans tabel (voor AI-gegenereerd studieplan — plan 11-02)
CREATE TABLE IF NOT EXISTS study_plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id    UUID NOT NULL UNIQUE REFERENCES children(id) ON DELETE CASCADE,
  plan_data   JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_plans_child ON study_plans(child_id, created_at DESC);

ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents manage study plans" ON study_plans FOR ALL
  USING (child_id IN (SELECT c.id FROM children c JOIN profiles p ON c.parent_id = p.id WHERE p.user_id = auth.uid()));
