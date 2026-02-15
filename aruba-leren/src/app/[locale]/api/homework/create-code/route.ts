/**
 * Create Upload Code API
 *
 * POST /[locale]/api/homework/create-code
 *
 * Creates a 6-character upload code that a child can use to upload
 * a homework photo from their phone to the PC tutoring session.
 *
 * Requires authentication (parent must be logged in on PC).
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createUploadCode } from '@/lib/tutoring/homework-upload';

export async function POST(request: NextRequest) {
  try {
    const { childId, sessionId } = await request.json();

    if (!childId) {
      return Response.json({ error: 'childId is required' }, { status: 400 });
    }

    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify child belongs to this parent
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return Response.json({ error: 'Profile not found' }, { status: 401 });
    }

    const { data: child } = await supabase
      .from('children')
      .select('id, parent_id')
      .eq('id', childId)
      .single();

    if (!child || child.parent_id !== profile.id) {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    // Create upload code
    const result = await createUploadCode(childId, sessionId);

    if (!result) {
      return Response.json({ error: 'Failed to create upload code' }, { status: 500 });
    }

    return Response.json({
      code: result.code,
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    console.error('Create code API error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
