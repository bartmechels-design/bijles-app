/**
 * RapportView — Server Component
 *
 * Rendert het volledige voortgangsrapport voor een kind.
 * Gebruikt door de geauthenticeerde rapportpagina en (in plan 11-03) de publieke share-pagina.
 */

import type { RapportData, SubjectRapport } from '@/lib/rapport/rapport-data';
import ProgressLineChartWrapper from './ProgressLineChartWrapper';

// ============================================
// Subject labels en iconen
// ============================================

const SUBJECT_LABELS: Record<string, { label: string; icon: string }> = {
  taal: { label: 'Nederlandse Taal', icon: '📖' },
  rekenen: { label: 'Rekenen', icon: '🔢' },
  begrijpend_lezen: { label: 'Begrijpend Lezen', icon: '📚' },
  geschiedenis: { label: 'Geschiedenis', icon: '🏛️' },
  aardrijkskunde: { label: 'Aardrijkskunde', icon: '🌍' },
  kennis_der_natuur: { label: 'Kennis der Natuur', icon: '🌱' },
};

// ============================================
// Props
// ============================================

interface RapportViewProps {
  data: RapportData;
  locale?: string;
  readOnly?: boolean;
}

// ============================================
// Helpers
// ============================================

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('nl-NL', {
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
// SubjectCard subcomponent
// ============================================

function SubjectCard({ subject }: { subject: SubjectRapport }) {
  const info = SUBJECT_LABELS[subject.subject] ?? { label: subject.subject, icon: '📝' };
  const totalAnswers = subject.totalCorrect + subject.totalIncorrect;
  const errorPct =
    totalAnswers > 0 ? Math.round((subject.totalIncorrect / totalAnswers) * 100) : 0;
  const levelColors = getLevelColor(subject.currentLevel);

  return (
    <div className="bg-white rounded-2xl shadow-lg border-2 border-sky-100 p-5 flex flex-col gap-4">
      {/* Vak-header */}
      <div className="flex items-center gap-2">
        <span className="text-2xl">{info.icon}</span>
        <h3 className="text-lg font-bold text-gray-800">{info.label}</h3>
      </div>

      {/* Niveau badges rij */}
      <div className="flex flex-wrap gap-3">
        {/* Startmeting */}
        <div className="flex flex-col items-start gap-1">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
            Startmeting
          </span>
          {subject.startLevel !== null ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-sky-100 text-sky-800 border-2 border-sky-300 font-semibold text-sm">
              Niveau {subject.startLevel}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-gray-500 border-2 border-gray-200 text-sm italic">
              Nog geen toets
            </span>
          )}
        </div>

        {/* Huidig niveau */}
        <div className="flex flex-col items-start gap-1">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
            Huidig niveau
          </span>
          <span
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border-2 font-bold text-sm ${levelColors.bg} ${levelColors.text} ${levelColors.border}`}
          >
            Niveau {subject.currentLevel}
          </span>
        </div>
      </div>

      {/* Statistieken rij */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        {/* Effectieve leertijd */}
        <div className="bg-sky-50 rounded-xl p-3 border border-sky-100">
          <p className="text-xs text-sky-600 font-semibold uppercase tracking-wide mb-1">
            Effectieve leertijd
          </p>
          <p className="text-xl font-bold text-sky-800">
            {Math.round(subject.effectiveMinutes)} min
          </p>
        </div>

        {/* Foutanalyse */}
        <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
          <p className="text-xs text-amber-600 font-semibold uppercase tracking-wide mb-1">
            Foutanalyse
          </p>
          <p className="text-sm font-semibold text-amber-800">
            {subject.totalIncorrect}/{totalAnswers} fouten
          </p>
          <p className="text-xs text-amber-600">{errorPct}% foutpercentage</p>
        </div>
      </div>

      {/* Terugkerende moeilijkheid badge */}
      {subject.recurringDifficulty && (
        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-100 border-2 border-amber-300 text-amber-800 text-sm font-semibold">
          <span>⚠️</span>
          <span>Terugkerende moeilijkheid ({subject.stuckEpisodes}x vastgelopen)</span>
        </div>
      )}

      {/* Lijngrafieken niveau-over-tijd */}
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">
          Niveau-verloop
        </p>
        <ProgressLineChartWrapper data={subject.levelHistory} subjectLabel={info.label} />
      </div>
    </div>
  );
}

// ============================================
// Main RapportView component
// ============================================

export function RapportView({ data, readOnly = false }: RapportViewProps) {
  const subjectsWithData = data.subjects.filter((s) => s.assessmentCompleted || s.totalSessions > 0);
  const subjectsWithoutData = data.subjects.filter(
    (s) => !s.assessmentCompleted && s.totalSessions === 0
  );

  return (
    <div className="space-y-8">
      {/* Rapport header */}
      <div className="bg-gradient-to-r from-sky-400 to-sky-600 rounded-2xl shadow-xl p-6 text-white">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">{data.child.first_name}</h1>
            <p className="text-sky-100 mt-1 text-lg">Klas {data.child.grade}</p>
          </div>
          <div className="text-right text-sky-100 text-sm">
            <p className="font-semibold">Voortgangsrapport</p>
            <p>{formatDate(data.generatedAt)}</p>
            {readOnly && (
              <p className="mt-1 text-xs bg-sky-700/50 rounded-lg px-2 py-1 inline-block">
                Gedeeld rapport
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Vakken met voortgang */}
      {subjectsWithData.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Voortgang per vak</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {subjectsWithData.map((subject) => (
              <SubjectCard key={subject.subject} subject={subject} />
            ))}
          </div>
        </section>
      )}

      {/* Vakken zonder voortgang */}
      {subjectsWithoutData.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-gray-600 mb-3">Nog niet gestart</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjectsWithoutData.map((subject) => {
              const info = SUBJECT_LABELS[subject.subject] ?? {
                label: subject.subject,
                icon: '📝',
              };
              return (
                <div
                  key={subject.subject}
                  className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-4 flex items-center gap-3"
                >
                  <span className="text-xl">{info.icon}</span>
                  <div>
                    <p className="font-semibold text-gray-600 text-sm">{info.label}</p>
                    <p className="text-xs text-gray-400 italic">Nog geen lessen gevolgd</p>
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
          <p className="text-gray-600 font-semibold">Nog geen voortgangsdata beschikbaar</p>
          <p className="text-sm text-gray-400 mt-1">
            Start met een toets per vak om voortgang bij te houden.
          </p>
        </div>
      )}
    </div>
  );
}

export default RapportView;
