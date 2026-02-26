-- Migration 011: Scratchpad storage bucket + RLS
-- User must run this in Supabase SQL Editor

-- Create scratchpads storage bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'scratchpads',
  'scratchpads',
  false,  -- private bucket
  5242880,  -- 5MB limit
  ARRAY['image/png']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: Parents can upload to their own child's folder
-- Path format: scratchpads/{childId}/{sessionId}/{timestamp}.png
CREATE POLICY "Parents can upload scratchpads for their children"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'scratchpads'
  AND (
    -- Allow if the child belongs to this parent
    EXISTS (
      SELECT 1 FROM children c
      JOIN profiles p ON p.id = c.parent_id
      WHERE p.user_id = auth.uid()
      AND c.id::text = split_part(name, '/', 1)
    )
  )
);

-- RLS: Parents can read their own children's scratchpads
-- (viewing UI delivered in Phase 11)
CREATE POLICY "Parents can read scratchpads for their children"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'scratchpads'
  AND (
    EXISTS (
      SELECT 1 FROM children c
      JOIN profiles p ON p.id = c.parent_id
      WHERE p.user_id = auth.uid()
      AND c.id::text = split_part(name, '/', 1)
    )
  )
);

-- RLS: Admins can read all scratchpads
CREATE POLICY "Admins can read all scratchpads"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'scratchpads'
  AND (auth.jwt() ->> 'app_metadata')::jsonb ->> 'isAdmin' = 'true'
);
