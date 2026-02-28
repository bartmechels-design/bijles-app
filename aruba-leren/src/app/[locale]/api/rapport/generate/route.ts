/**
 * POST /[locale]/api/rapport/generate
 *
 * Genereert een deelbare rapport-link (token) voor het kind van de ingelogde ouder.
 *
 * Request body:
 *   { childId: string; pin?: string; locale: string }
 *
 * Response:
 *   200: { token: string; expiresAt: string; shareUrl: string }
 *   400: { error: string }
 *   401: { error: string }
 *   403: { error: string }
 *   500: { error: string }
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildRapportData } from '@/lib/rapport/rapport-data';
import { createReportToken } from '@/lib/rapport/report-token';

export async function POST(request: Request): Promise<NextResponse> {
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
  let body: { childId?: string; pin?: string; locale?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ongeldige request body' }, { status: 400 });
  }

  const { childId, pin, locale } = body;

  if (!childId || typeof childId !== 'string') {
    return NextResponse.json({ error: 'childId is verplicht' }, { status: 400 });
  }

  if (!locale || typeof locale !== 'string') {
    return NextResponse.json({ error: 'locale is verplicht' }, { status: 400 });
  }

  // Valideer PIN als opgegeven
  if (pin !== undefined && pin !== '') {
    if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: 'PIN moet exact 4 cijfers zijn' }, { status: 400 });
    }
  }

  // 3. Verifieer eigenaarschap van het kind
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

  // 4. Bouw rapport data snapshot
  const reportData = await buildRapportData(childId, supabase);

  if (!reportData) {
    return NextResponse.json(
      { error: 'Rapport data kon niet worden opgebouwd' },
      { status: 500 }
    );
  }

  // 5. Maak token aan
  const tokenResult = await createReportToken(
    childId,
    reportData,
    locale,
    pin && pin.length > 0 ? pin : undefined,
    supabase
  );

  if (!tokenResult) {
    return NextResponse.json(
      { error: 'Token aanmaken mislukt' },
      { status: 500 }
    );
  }

  // 6. Bouw shareUrl
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const shareUrl = appUrl
    ? `${appUrl}/${locale}/rapport/${tokenResult.token}`
    : `/${locale}/rapport/${tokenResult.token}`;

  return NextResponse.json({
    token: tokenResult.token,
    expiresAt: tokenResult.expiresAt,
    shareUrl,
  });
}
