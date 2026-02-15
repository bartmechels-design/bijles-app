/**
 * Check Upload Status API
 *
 * GET /[locale]/api/homework/check/[code]
 *
 * Polls for uploaded homework photo.
 * Requires authentication (PC side).
 * Returns image data when available, marks as picked up.
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkUploadStatus, markUploadPickedUp } from '@/lib/tutoring/homework-upload';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { code } = await context.params;

    if (!code) {
      return Response.json({ error: 'Code is required' }, { status: 400 });
    }

    const result = await checkUploadStatus(code);

    if (result.status === 'uploaded' && result.imageData) {
      // Mark as picked up (async, don't wait)
      markUploadPickedUp(code).catch(err =>
        console.error('Error marking upload as picked up:', err)
      );

      return Response.json({
        status: 'uploaded',
        imageData: result.imageData,
      });
    }

    return Response.json({ status: result.status });
  } catch (error) {
    console.error('Check upload API error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
