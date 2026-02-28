/**
 * Publieke Rapport Route — Server Component
 *
 * Route: /[locale]/rapport/[token]
 * Toegankelijk zonder login. Toont rapport-snapshot op basis van token.
 * Optionele PIN-beveiliging via GET-parameter.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { createAdminClient } from '@/lib/auth/admin';
import { hashPin } from '@/lib/rapport/report-token';
import { RapportView } from '@/components/rapport/RapportView';
import { PinGateForm } from './PinGateForm';
import type { RapportData } from '@/lib/rapport/rapport-data';

// ============================================
// Metadata
// ============================================

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Voortgangsrapport',
    description: 'Gedeeld voortgangsrapport via ArubaLeren',
  };
}

// ============================================
// Page
// ============================================

interface PublicRapportPageProps {
  params: Promise<{ locale: string; token: string }>;
  searchParams: Promise<{ pin?: string }>;
}

export default async function PublicRapportPage({
  params,
  searchParams,
}: PublicRapportPageProps) {
  const { locale, token } = await params;
  const { pin } = await searchParams;

  // 1. Gebruik admin client — geen sessie aanwezig, RLS blokkeert gewone client
  const adminClient = createAdminClient();

  // 2. Query het token (moet geldig zijn en niet verlopen)
  const { data: tokenRow } = await adminClient
    .from('report_tokens')
    .select('token, pin_hash, report_data, expires_at, locale')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single();

  // 3. Token niet gevonden of verlopen
  if (!tokenRow) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-sky-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-8 w-full max-w-sm text-center space-y-4">
          <span className="text-4xl">⏰</span>
          <h1 className="text-xl font-bold text-gray-800">Link verlopen of ongeldig</h1>
          <p className="text-sm text-gray-500">
            Deze rapport-link is verlopen of bestaat niet meer. Vraag de ouder om een nieuwe link
            te genereren.
          </p>
          <Link
            href={`/${locale}`}
            className="inline-block mt-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-xl transition-colors text-sm"
          >
            Terug naar home
          </Link>
        </div>
      </div>
    );
  }

  // 4. PIN-check
  const pinHash = tokenRow.pin_hash as string | null;

  if (pinHash) {
    // PIN vereist
    if (!pin) {
      // Geen PIN opgegeven — toon PIN-formulier
      return <PinGateForm locale={locale} token={token} hasError={false} />;
    }

    // PIN opgegeven — vergelijk hash
    const providedHash = await hashPin(pin);
    if (providedHash !== pinHash) {
      // Onjuiste PIN — toon formulier opnieuw met foutmelding
      return <PinGateForm locale={locale} token={token} hasError={true} />;
    }
  }

  // 5. Token geldig (en PIN correct indien vereist) — toon rapport
  const reportData = tokenRow.report_data as RapportData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-sky-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Teruglink naar home */}
        <div className="mb-6">
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-2 text-sky-600 hover:text-sky-800 font-semibold text-sm"
          >
            <span>&larr;</span>
            <span>ArubaLeren</span>
          </Link>
        </div>

        {/* Rapport inhoud (readOnly=true — verberg ShareLinkPanel etc.) */}
        <RapportView data={reportData} locale={locale} readOnly />
      </div>
    </div>
  );
}
