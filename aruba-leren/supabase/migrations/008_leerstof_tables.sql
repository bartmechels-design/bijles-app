-- ============================================
-- Migration 008: Leerstof Items Table
-- Phase 6: Advanced Tutor Features
-- ============================================
-- Run in: Supabase Dashboard > SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS leerstof_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Which subject this leerstof belongs to (zaakvakken only)
  subject TEXT NOT NULL CHECK (subject IN (
    'geschiedenis', 'aardrijkskunde', 'kennis_der_natuur'
  )),
  title TEXT NOT NULL,
  -- Extracted plain text content (from PDF or direct text upload)
  content TEXT NOT NULL,
  -- Source info
  source_filename TEXT,       -- Original uploaded filename
  source_type TEXT NOT NULL CHECK (source_type IN ('pdf', 'text')),
  -- State
  is_active BOOLEAN NOT NULL DEFAULT true,
  -- Who uploaded (admin user id)
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by subject + active state
CREATE INDEX IF NOT EXISTS idx_leerstof_subject_active
  ON leerstof_items(subject, is_active)
  WHERE is_active = true;

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE leerstof_items ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
DROP POLICY IF EXISTS "Admins can manage leerstof" ON leerstof_items;
CREATE POLICY "Admins can manage leerstof"
  ON leerstof_items
  FOR ALL
  USING (
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'admin'
  );

-- Authenticated users can read active leerstof (for system prompt injection)
DROP POLICY IF EXISTS "Authenticated users can read active leerstof" ON leerstof_items;
CREATE POLICY "Authenticated users can read active leerstof"
  ON leerstof_items
  FOR SELECT
  USING (is_active = true AND auth.role() = 'authenticated');
