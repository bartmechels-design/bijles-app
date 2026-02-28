'use client';

/**
 * StudyPlanEditor — bewerkbaar weekraster voor het studieplan.
 *
 * Rijen  = Ma / Di / Wo / Do / Vr
 * Kolommen = vakken die in het studieplan voorkomen
 * Per cel: minuten-invoerveld + "Gedaan"-checkbox (alleen als de dag/vak-combinatie in het plan zit)
 *
 * Slaat het plan op via PUT /[locale]/api/rapport/study-plan.
 */

import { useState } from 'react';
import { useParams } from 'next/navigation';
import type { StudyPlanEntry } from '@/lib/rapport/study-plan-generator';

// ============================================
// Types
// ============================================

interface StudyPlanEditorProps {
  childId: string;
  initPlan: StudyPlanEntry[];
  subjectLabels: Record<string, string>;
}

// ============================================
// Constants
// ============================================

const DAYS: StudyPlanEntry['day'][] = ['ma', 'di', 'wo', 'do', 'vr'];

const DAY_LABELS: Record<StudyPlanEntry['day'], string> = {
  ma: 'Maandag',
  di: 'Dinsdag',
  wo: 'Woensdag',
  do: 'Donderdag',
  vr: 'Vrijdag',
};

// ============================================
// Component
// ============================================

export function StudyPlanEditor({ childId, initPlan, subjectLabels }: StudyPlanEditorProps) {
  const params = useParams();
  const locale = typeof params.locale === 'string' ? params.locale : 'nl';

  const [plan, setPlan] = useState<StudyPlanEntry[]>(() =>
    initPlan.map((entry) => ({ ...entry }))
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derive ordered list of subjects present in the plan (preserving insertion order)
  const subjects = Array.from(new Set(plan.map((e) => e.subject)));

  // Lookup helper: find entry for a (day, subject) pair
  function findEntry(day: StudyPlanEntry['day'], subject: string): StudyPlanEntry | undefined {
    return plan.find((e) => e.day === day && e.subject === subject);
  }

  // Update a specific entry
  function updateEntry(
    day: StudyPlanEntry['day'],
    subject: string,
    patch: Partial<Pick<StudyPlanEntry, 'minutes' | 'completed'>>
  ) {
    setPlan((prev) =>
      prev.map((e) =>
        e.day === day && e.subject === subject ? { ...e, ...patch } : e
      )
    );
    setSaved(false);
  }

  // Save plan to API
  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/${locale}/api/rapport/study-plan`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId, plan }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? 'Er ging iets mis bij opslaan.');
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      setError('Netwerkfout. Probeer het opnieuw.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-sky-100 p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">📋</span>
        <h2 className="text-xl font-bold text-gray-800">Weekstudieplan</h2>
        <span className="text-xs bg-sky-100 text-sky-700 border border-sky-300 rounded-full px-2 py-0.5 font-semibold">
          Bewerkbaar
        </span>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Pas het aantal minuten per sessie aan of vink vakken af als ze gedaan zijn.
        Vakken met <span className="font-semibold text-amber-600">oranje koptekst</span> hebben extra aandacht nodig.
      </p>

      {/* Weekraster */}
      <div className="overflow-x-auto">
        <table
          className="w-full text-sm border-collapse"
          style={{ borderCollapse: 'collapse' }}
        >
          <thead>
            <tr>
              {/* Lege hoekcel */}
              <th className="p-2 text-left text-gray-400 font-medium border border-gray-200 bg-gray-50 min-w-[100px]">
                Dag
              </th>
              {subjects.map((subject) => {
                // Bepaal of dit vak stuck is (3+ sessies in het plan = komt 3x voor)
                const sessionCount = plan.filter((e) => e.subject === subject).length;
                const isStuck = sessionCount >= 3;
                return (
                  <th
                    key={subject}
                    className={`p-2 text-center font-semibold border border-gray-200 min-w-[120px] ${
                      isStuck
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-sky-50 text-sky-700'
                    }`}
                  >
                    {subjectLabels[subject] ?? subject}
                    {isStuck && (
                      <span className="block text-xs font-normal text-amber-500 mt-0.5">
                        Extra aandacht
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((day) => (
              <tr key={day} className="hover:bg-gray-50 transition-colors">
                <td className="p-2 font-medium text-gray-700 border border-gray-200 bg-gray-50">
                  {DAY_LABELS[day]}
                </td>
                {subjects.map((subject) => {
                  const entry = findEntry(day, subject);
                  if (!entry) {
                    return (
                      <td
                        key={subject}
                        className="p-2 border border-gray-200 text-center text-gray-300"
                      >
                        —
                      </td>
                    );
                  }
                  return (
                    <td key={subject} className="p-2 border border-gray-200">
                      <div className="flex flex-col items-center gap-1.5">
                        {/* Minuten invoer */}
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={5}
                            max={60}
                            step={5}
                            value={entry.minutes}
                            onChange={(e) =>
                              updateEntry(day, subject, {
                                minutes: Math.min(60, Math.max(5, Number(e.target.value))),
                              })
                            }
                            className="w-14 text-center border border-sky-200 rounded-lg px-1 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                          />
                          <span className="text-xs text-gray-400">min</span>
                        </div>
                        {/* Gedaan checkbox */}
                        <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={entry.completed}
                            onChange={(e) =>
                              updateEntry(day, subject, { completed: e.target.checked })
                            }
                            className="accent-sky-500 w-3.5 h-3.5"
                          />
                          Gedaan
                        </label>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Acties */}
      <div className="mt-5 flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white font-semibold rounded-xl transition-colors shadow-sm"
        >
          {saving ? 'Opslaan...' : 'Plan opslaan'}
        </button>

        {saved && (
          <span className="text-green-600 font-semibold text-sm animate-pulse">
            Opgeslagen!
          </span>
        )}

        {error && (
          <span className="text-red-500 text-sm">{error}</span>
        )}
      </div>
    </div>
  );
}
