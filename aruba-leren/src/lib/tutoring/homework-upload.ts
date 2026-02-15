/**
 * Homework Upload Manager
 *
 * Manages phone-to-PC homework photo transfers.
 * A child can scan a QR code on the PC with their phone,
 * take a photo, and it appears in the tutoring session on PC.
 *
 * IMPORTANT: Run the following SQL in Supabase Dashboard > SQL Editor:
 *
 * CREATE TABLE IF NOT EXISTS homework_uploads (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   upload_code TEXT NOT NULL UNIQUE,
 *   child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
 *   session_id UUID REFERENCES tutoring_sessions(id) ON DELETE SET NULL,
 *   image_data TEXT,
 *   status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'uploaded', 'picked_up', 'expired')),
 *   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *   uploaded_at TIMESTAMPTZ,
 *   expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes')
 * );
 *
 * CREATE INDEX IF NOT EXISTS idx_homework_uploads_code ON homework_uploads(upload_code);
 * CREATE INDEX IF NOT EXISTS idx_homework_uploads_status ON homework_uploads(status, expires_at);
 *
 * -- RLS: Parents can manage uploads for their children
 * ALTER TABLE homework_uploads ENABLE ROW LEVEL SECURITY;
 *
 * CREATE POLICY "Parents can manage their children's uploads"
 *   ON homework_uploads
 *   FOR ALL
 *   USING (
 *     child_id IN (
 *       SELECT c.id FROM children c
 *       JOIN profiles p ON c.parent_id = p.id
 *       WHERE p.user_id = auth.uid()
 *     )
 *   );
 *
 * -- Allow anonymous insert/update via upload code (for phone upload without auth)
 * -- This is handled via service role in API routes, so no additional policy needed.
 */

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/auth/admin';

/**
 * Generate a random 6-character alphanumeric upload code.
 * Avoids ambiguous characters (0/O, 1/I/l).
 */
function generateUploadCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Create a new upload code for a child's tutoring session.
 * The code expires after 10 minutes.
 * Called from the PC side (authenticated).
 */
export async function createUploadCode(
  childId: string,
  sessionId?: string
): Promise<{ code: string; expiresAt: string } | null> {
  const supabase = await createClient();

  // Generate a unique code (retry up to 3 times if collision)
  let code = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    code = generateUploadCode();

    const { error } = await supabase
      .from('homework_uploads')
      .insert({
        upload_code: code,
        child_id: childId,
        session_id: sessionId || null,
        status: 'pending',
      });

    if (!error) {
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      return { code, expiresAt };
    }

    // If unique constraint violation, retry with new code
    if (error.code === '23505') continue;

    console.error('Error creating upload code:', error);
    return null;
  }

  return null;
}

/**
 * Upload an image using an upload code.
 * Called from the phone side (NO auth required — uses admin client).
 * Validates that the code exists, is pending, and hasn't expired.
 */
export async function uploadImageByCode(
  code: string,
  imageData: string
): Promise<{ success: boolean; error?: string }> {
  const adminClient = createAdminClient();

  // Find the pending upload with this code
  const { data: upload, error: findError } = await adminClient
    .from('homework_uploads')
    .select('id, status, expires_at')
    .eq('upload_code', code.toUpperCase())
    .eq('status', 'pending')
    .single();

  if (findError || !upload) {
    return { success: false, error: 'Code ongeldig of verlopen' };
  }

  // Check expiry
  if (new Date(upload.expires_at) < new Date()) {
    // Mark as expired
    await adminClient
      .from('homework_uploads')
      .update({ status: 'expired' })
      .eq('id', upload.id);
    return { success: false, error: 'Code is verlopen. Vraag een nieuwe code aan op de computer.' };
  }

  // Store the image
  const { error: updateError } = await adminClient
    .from('homework_uploads')
    .update({
      image_data: imageData,
      status: 'uploaded',
      uploaded_at: new Date().toISOString(),
    })
    .eq('id', upload.id);

  if (updateError) {
    console.error('Error uploading image:', updateError);
    return { success: false, error: 'Upload mislukt. Probeer opnieuw.' };
  }

  return { success: true };
}

/**
 * Check if an image has been uploaded for a given code.
 * Called from the PC side (authenticated) for polling.
 * Returns the base64 image data if uploaded, null if still pending.
 */
export async function checkUploadStatus(
  code: string
): Promise<{ status: 'pending' | 'uploaded' | 'expired'; imageData?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('homework_uploads')
    .select('status, image_data, expires_at')
    .eq('upload_code', code.toUpperCase())
    .single();

  if (error || !data) {
    return { status: 'expired' };
  }

  // Check if expired
  if (data.status === 'pending' && new Date(data.expires_at) < new Date()) {
    return { status: 'expired' };
  }

  if (data.status === 'uploaded' && data.image_data) {
    return { status: 'uploaded', imageData: data.image_data };
  }

  return { status: data.status as 'pending' | 'uploaded' | 'expired' };
}

/**
 * Mark an upload as picked up (PC has received the image).
 * Clears the image data to free storage.
 */
export async function markUploadPickedUp(code: string): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('homework_uploads')
    .update({
      status: 'picked_up',
      image_data: null,
    })
    .eq('upload_code', code.toUpperCase());
}
