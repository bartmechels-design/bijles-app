-- ============================================
-- Migration 009: School Vacations Table
-- Phase 7: Parent Portal & Admin Monitoring
-- ============================================
-- Run in: Supabase Dashboard > SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS school_vacations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  school_year TEXT NOT NULL,
  is_public_holiday BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Index for fast lookup by school year and date ordering
CREATE INDEX IF NOT EXISTS idx_school_vacations_year
  ON school_vacations(school_year, start_date ASC);

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE school_vacations ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view all school vacations (read-only)
CREATE POLICY "Authenticated users can view school vacations"
  ON school_vacations
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================
-- Updated_at trigger
-- ============================================

-- Note: update_updated_at_column() function already exists from migration 20260213_initial_schema.sql
CREATE TRIGGER update_school_vacations_updated_at
  BEFORE UPDATE ON school_vacations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
