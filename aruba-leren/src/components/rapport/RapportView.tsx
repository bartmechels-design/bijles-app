/**
 * RapportView — async Server Component
 *
 * Rendert het volledige voortgangsrapport voor een kind.
 * Gebruikt door de geauthenticeerde rapportpagina en de publieke share-pagina.
 * Ondersteunt nl + pap via next-intl getTranslations.
 */

import type { RapportData, SubjectRapport } from '@/lib/rapport/rapport-data';
import ProgressLineChartWrapper from './ProgressLineChartWrapper';
import { getTranslations } from 'next-intl/server';

// ============================================
// Subject iconen (labels komen uit t('subjects.*'))
// ============================================

const SUBJECT_ICONS: Record<string, string> = {
  taal: '📖',
  rekenen: '🔢',
  begrijpend_lezen: '📚',
  geschiedenis: '🏛️',
  aardrijkskunde: '🌍',
  kennis_der_natuur: '🌱',
};

// ============================================
// Props
// ============================================

interface RapportViewProps {
  data: RapportData;
  locale: string;
  readOnly?: boolean;
}

// ============================================
// Helpers
// ============================================

function formatDate(isoString: string, locale: string): string {
  const dateLocale = locale === 'nl' ? 'nl-NL' : 'nl-AW';
  return new Date(isoString).toLocaleDateString(dateLocale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getLevelColor(level: number): { bg: string; text: string; border: string } {
  const colors: Record<number, { bg: string; text: string; border: string }> = {
    1: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
    2: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
    3: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
    4: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
    5: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
  };
  return colors[Math.max(1, Math.min(level, 5))] ?? colors[1];
}

// ============================================
// SubjectCard — receives translations as prop (server-rendered)
// ============================================

type TFunc = Awaited<ReturnType<typeof getTranslations<'rapport'>>>;

// Known subject translation keys mapped from subject slugs
const SUBJECT_TRANSLATION_KEYS: Record<string, string> = {
  rekenen: 'subjects.rekenen',
  taal: 'subjects.taal',
  begrijpend_lezen: 'subjects.begrijpend_lezen',
  geschiedenis: 'subjects.geschiedenis',
  aardrijkskunde: 'subjects.aardrijkskunde',
  kennis_der_natuur: 'subjects.kennis_der_natuur',
};

function SubjectCard({
  subject,
  t,
  locale,
}: {
  subject: SubjectRapport;
  t: TFunc;
  locale: string;
}) {
  const icon = SUBJECT_ICONS[subject.subject] ?? '📝';
  // Subject label from translations (falls back to raw key)
  const translationKey = SUBJECT_TRANSLATION_KEYS[subject.subject];
  const label = translationKey
    ? t(translationKey as Parameters<TFunc>[0])
    : subject.subject;

  const totalAnswers = subject.totalCorrect + subject.totalIncorrect;
  const errorPct =
    totalAnswers > 0 ? Math.round((subject.totalIncorrect / totalAnswers) * 100) : 0;
  const levelColors = getLevelColor(subject.currentLevel);

  return (
    <div className="bg-white rounded-2xl shadow-lg border-2 border-sky-100 p-5 flex flex-col gap-4">
      {/* Vak-header */}
      <div className="flex items-center gap-2">
        <span className="text-2xl">{icon}</span>
        <h3 className="text-lg font-bold text-gray-800">{label}</h3>
      </div>

      {/* Niveau badges rij */}
      <div className="flex flex-wrap gap-3">
        {/* Startmeting */}
        <div className="flex flex-col items-start gap-1">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
            {t('startLevel')}
          </span>
          {subject.startLevel !== null ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-sky-100 text-sky-800 border-2 border-sky-300 font-semibold text-sm">
              {subject.startLevel}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-gray-500 border-2 border-gray-200 text-sm italic">
              {t('noAssessment')}
            </span>
          )}
        </div>

        {/* Huidig niveau */}
        <div className="flex flex-col items-start gap-1">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
            {t('currentLevel')}
          </span>
          <span
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border-2 font-bold text-sm ${levelColors.bg} ${levelColors.text} ${levelColors.border}`}
          >
            {subject.currentLevel}
          </span>
        </div>
      </div>

      {/* Statistieken rij */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        {/* Effectieve leertijd */}
        <div className="bg-sky-50 rounded-xl p-3 border border-sky-100">
          <p className="text-xs text-sky-600 font-semibold uppercase tracking-wide mb-1">
            {t('effectiveTimeLabel')}
          </p>
          <p className="text-xl font-bold text-sky-800">
            {t('effectiveTime', { minutes: Math.round(subject.effectiveMinutes) })}
          </p>
        </div>

        {/* Foutanalyse */}
        <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
          <p className="text-xs text-amber-600 font-semibold uppercase tracking-wide mb-1">
            {t('errorRate')}
          </p>
          <p className="text-sm font-semibold text-amber-800">
            {t('errorCount', {
              incorrect: subject.totalIncorrect,
              total: totalAnswers,
            })}
          </p>
          <p className="text-xs text-amber-600">{errorPct}%</p>
        </div>
      </div>

      {/* Terugkerende moeilijkheid badge */}
      {subject.recurringDifficulty && (
        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-100 border-2 border-amber-300 text-amber-800 text-sm font-semibold">
          <span>⚠️</span>
          <span>
            {t('recurringDifficulty')} ({t('stuckEpisodes', { count: subject.stuckEpisodes })})
          </span>
        </div>
      )}

      {/* Lijngrafieken niveau-over-tijd */}
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">
          {locale === 'pap' ? 'Progreso' : 'Niveau-verloop'}
        </p>
        <ProgressLineChartWrapper data={subject.levelHistory} subjectLabel={label} />
      </div>
    </div>
  );
}

// ============================================
// Main RapportView component (async Server Component)
// ============================================

export async function RapportView({ data, locale, readOnly = false }: RapportViewProps) {
  const t = await getTranslations({ locale, namespace: 'rapport' });

  const subjectsWithData = data.subjects.filter(
    (s) => s.assessmentCompleted || s.totalSessions > 0
  );
  const subjectsWithoutData = data.subjects.filter(
    (s) => !s.assessmentCompleted && s.totalSessions === 0
  );

  return (
    <div className="space-y-8">
      {/* Rapport header */}
      <div className="bg-gradient-to-r from-sky-400 to-sky-600 rounded-2xl shadow-xl p-6 text-white">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              {t('title', { name: data.child.first_name })}
            </h1>
            <p className="text-sky-100 mt-1 text-lg">
              {t('subtitle', { grade: data.child.grade })}
            </p>
          </div>
          <div className="text-right text-sky-100 text-sm">
            <p className="font-semibold">ArubaLeren</p>
            <p>{t('generatedAt', { date: formatDate(data.generatedAt, locale) })}</p>
            {readOnly && (
              <p className="mt-1 text-xs bg-sky-700/50 rounded-lg px-2 py-1 inline-block">
                {locale === 'pap' ? 'Rapport parti' : 'Gedeeld rapport'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Vakken met voortgang */}
      {subjectsWithData.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            {locale === 'pap' ? 'Progreso pa materia' : 'Voortgang per vak'}
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {subjectsWithData.map((subject) => (
              <SubjectCard key={subject.subject} subject={subject} t={t} locale={locale} />
            ))}
          </div>
        </section>
      )}

      {/* Vakken zonder voortgang */}
      {subjectsWithoutData.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-gray-600 mb-3">
            {locale === 'pap' ? 'Ainda no a cuminsa' : 'Nog niet gestart'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjectsWithoutData.map((subject) => {
              const icon = SUBJECT_ICONS[subject.subject] ?? '📝';
              const subjectTransKey = SUBJECT_TRANSLATION_KEYS[subject.subject];
              const label = subjectTransKey
                ? t(subjectTransKey as Parameters<TFunc>[0])
                : subject.subject;
              return (
                <div
                  key={subject.subject}
                  className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-4 flex items-center gap-3"
                >
                  <span className="text-xl">{icon}</span>
                  <div>
                    <p className="font-semibold text-gray-600 text-sm">{label}</p>
                    <p className="text-xs text-gray-400 italic">
                      {locale === 'pap' ? 'Ainda no tin lesnan' : 'Nog geen lessen gevolgd'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Leeg rapport bericht */}
      {subjectsWithData.length === 0 && (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-sky-100 p-8 text-center">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-gray-600 font-semibold">
            {locale === 'pap'
              ? 'Ainda no tin dato di progreso'
              : 'Nog geen voortgangsdata beschikbaar'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {locale === 'pap'
              ? 'Cuminsa cu un toets pa materia pa registrá progreso.'
              : 'Start met een toets per vak om voortgang bij te houden.'}
          </p>
        </div>
      )}
    </div>
  );
}

export default RapportView;
