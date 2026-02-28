/**
 * Rapport Page — geauthenticeerde Server Component
 *
 * Route: /[locale]/dashboard/kind/[childId]/rapport
 * Ouder ziet een volledig voortgangsrapport voor zijn/haar kind.
 * Patroon: volgt /dashboard/kind/[childId]/page.tsx exact.
 */

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildRapportData } from '@/lib/rapport/rapport-data';
import { generateStudyPlan } from '@/lib/rapport/study-plan-generator';
import { RapportView } from '@/components/rapport/RapportView';
import { StudyPlanEditor } from '@/components/rapport/StudyPlanEditor';
import type { StudyPlanEntry } from '@/lib/rapport/study-plan-generator';

// ============================================
// Vak-labels in het Nederlands
// ============================================

const SUBJECT_LABELS: Record<string, string> = {
  taal: 'Taal',
  rekenen: 'Rekenen',
  begrijpend_lezen: 'Begrijpend lezen',
  geschiedenis: 'Geschiedenis',
  aardrijkskunde: 'Aardrijkskunde',
  kennis_der_natuur: 'Kennis der natuur',
};

interface RapportPageProps {
  params: Promise<{
    locale: string;
    childId: string;
  }>;
}

export default async function RapportPage({ params }: RapportPageProps) {
  const { locale, childId } = await params;
  const supabase = await createClient();

  // Authenticate user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect(`/${locale}/login`);
  }

  // Fetch profile via user_id (CRITICAL: use profile.id for parent_id checks)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!profile) {
    redirect(`/${locale}/dashboard`);
  }

  // Fetch child — must be owned by this parent (profile.id, NOT user.id)
  const { data: child } = await supabase
    .from('children')
    .select('id, first_name, grade, parent_id')
    .eq('id', childId)
    .eq('parent_id', profile.id)
    .single();

  if (!child) {
    redirect(`/${locale}/dashboard`);
  }

  // Build rapport data
  const rapportData = await buildRapportData(childId, supabase);

  if (!rapportData) {
    redirect(`/${locale}/dashboard`);
  }

  // Bepaal initPlan: gebruik opgeslagen plan als dat bestaat, anders genereer op basis van voortgang
  const initPlan: StudyPlanEntry[] =
    rapportData.studyPlan && rapportData.studyPlan.length > 0
      ? (rapportData.studyPlan as StudyPlanEntry[])
      : generateStudyPlan(rapportData.subjects);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-sky-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Navigatie */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <Link
            href={`/${locale}/dashboard/kind/${childId}`}
            className="inline-flex items-center gap-2 text-sky-600 hover:text-sky-800 font-semibold"
          >
            <span>&larr;</span>
            <span>Terug naar {child.first_name}</span>
          </Link>
        </div>

        {/* Rapport inhoud */}
        <RapportView data={rapportData} locale={locale} />

        {/* Studieplan — bewerkbaar weekraster */}
        <section className="mt-8">
          <StudyPlanEditor
            childId={childId}
            initPlan={initPlan}
            subjectLabels={SUBJECT_LABELS}
          />
        </section>

        {/* Placeholder: rapport delen / link genereren (wordt gevuld in plan 11-03 en 11-04) */}
        <section className="mt-4">
          <div className="bg-white rounded-2xl border-2 border-dashed border-sky-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🔗</span>
              <h2 className="text-xl font-bold text-gray-700">Rapport delen</h2>
              <span className="text-xs bg-sky-100 text-sky-700 border border-sky-300 rounded-full px-2 py-0.5 font-semibold">
                Binnenkort
              </span>
            </div>
            <p className="text-sm text-gray-400 italic">
              Genereer een deelbare link of PDF na plan 11-03 en 11-04.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
