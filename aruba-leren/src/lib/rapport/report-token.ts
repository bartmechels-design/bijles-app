/**
 * Report Token Utilities
 *
 * Server-side hulpfuncties voor het aanmaken en beveiligen van deelbare rapport-links.
 * Gebruikt door: /api/rapport/generate (route) en /rapport/[token] (publieke pagina).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { buildRapportData } from '@/lib/rapport/rapport-data';
import type { RapportData } from '@/lib/rapport/rapport-data';

// ============================================
// hashPin
// ============================================

/**
 * Hash een 4-cijferige PIN via SHA-256 (ingebouwd in Node.js, geen library nodig).
 *
 * @param pin - De PIN als string (bijv. "1234")
 * @returns hex-string van SHA-256 hash
 */
export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ============================================
// createReportToken
// ============================================

export interface ReportTokenResult {
  token: string;
  expiresAt: string;
}

/**
 * Maak een nieuw report token aan voor een kind.
 *
 * - Verwijdert eerst alle bestaande tokens voor dit kind (one-token-per-child).
 * - Hasht de PIN als opgegeven.
 * - Insert in report_tokens met expires_at = NOW() + 30 days.
 *
 * @param childId    - UUID van het kind
 * @param reportData - Snapshot van het rapport op het moment van generatie
 * @param locale     - Taalcode ('nl' | 'pap' | 'es' | 'en')
 * @param pin        - Optionele 4-cijferige PIN (plaintext, wordt gehashed)
 * @param supabase   - Supabase client (service role voor admin toegang of authenticated client)
 * @returns { token, expiresAt } of null bij fout
 */
export async function createReportToken(
  childId: string,
  reportData: RapportData,
  locale: string,
  pin: string | undefined,
  supabase: SupabaseClient
): Promise<ReportTokenResult | null> {
  // 1. Verwijder bestaande tokens voor dit kind (one-token-per-child)
  const { error: deleteError } = await supabase
    .from('report_tokens')
    .delete()
    .eq('child_id', childId);

  if (deleteError) {
    console.error('[createReportToken] Fout bij verwijderen bestaande tokens:', deleteError);
    return null;
  }

  // 2. Hash de PIN als opgegeven
  const pinHash = pin && pin.length === 4 ? await hashPin(pin) : null;

  // 3. Insert nieuw token
  const { data: row, error: insertError } = await supabase
    .from('report_tokens')
    .insert({
      child_id: childId,
      report_data: reportData,
      locale,
      pin_hash: pinHash,
      // expires_at wordt automatisch ingesteld door de DB default (NOW() + 30 days)
    })
    .select('token, expires_at')
    .single();

  if (insertError || !row) {
    console.error('[createReportToken] Fout bij inserting token:', insertError);
    return null;
  }

  return {
    token: row.token as string,
    expiresAt: row.expires_at as string,
  };
}

// Re-export RapportData type voor gemak
export type { RapportData };
export { buildRapportData };
