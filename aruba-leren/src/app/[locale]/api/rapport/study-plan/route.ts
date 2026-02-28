/**
 * PUT /[locale]/api/rapport/study-plan
 *
 * Slaat het (aangepaste) studieplan op voor het kind van de ingelogde ouder.
 * Gebruikt upsert op child_id: overschrijft bestaand plan of maakt nieuw aan.
 *
 * Request body:
 *   { childId: string; plan: StudyPlanEntry[] }
 *
 * Response:
 *   200: { success: true }
 *   400: { error: string }
 *   401: { error: string }
 *   403: { error: string }
 *   500: { error: string }
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { StudyPlanEntry } from '@/lib/rapport/study-plan-generator';

export async function PUT(request: Request): Promise<NextResponse> {
  // 1. Authenticeer via cookie-based session
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
  }

  // 2. Valideer request body
  let body: { childId?: unknown; plan?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ongeldige request body' }, { status: 400 });
  }

  const { childId, plan } = body;

  if (!childId || typeof childId !== 'string') {
    return NextResponse.json({ error: 'childId is verplicht' }, { status: 400 });
  }

  if (!Array.isArray(plan)) {
    return NextResponse.json({ error: 'plan moet een array zijn' }, { status: 400 });
  }

  // Valideer dat plan entries de juiste structuur hebben
  const validDays = ['ma', 'di', 'wo', 'do', 'vr'];
  for (const entry of plan as StudyPlanEntry[]) {
    if (
      typeof entry.subject !== 'string' ||
      !validDays.includes(entry.day) ||
      typeof entry.minutes !== 'number' ||
      typeof entry.completed !== 'boolean'
    ) {
      return NextResponse.json({ error: 'Ongeldige plan entry structuur' }, { status: 400 });
    }
  }

  // 3. Verifieer eigenaarschap van het kind
  //    Pattern: gebruik profile.id (niet user.id) als parent_id in children
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Profiel niet gevonden' }, { status: 403 });
  }

  const { data: child } = await supabase
    .from('children')
    .select('id')
    .eq('id', childId)
    .eq('parent_id', profile.id)
    .single();

  if (!child) {
    return NextResponse.json(
      { error: 'Kind niet gevonden of geen toegang' },
      { status: 403 }
    );
  }

  // 4. Upsert naar study_plans tabel
  //    Als child_id al bestaat: update plan_data + updated_at
  //    Anders: insert nieuw record
  const { error: upsertError } = await supabase
    .from('study_plans')
    .upsert(
      {
        child_id: childId,
        plan_data: plan,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'child_id' }
    );

  if (upsertError) {
    console.error('[study-plan PUT] Upsert fout:', upsertError);
    return NextResponse.json(
      { error: 'Opslaan mislukt. Probeer het opnieuw.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
