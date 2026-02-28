/**
 * Studieplan Generator
 *
 * Pure rule-based functions — geen DB-calls, geen AI API-calls.
 * Bepaalt hoeveel sessies per vak per week op basis van voortgangsdata.
 *
 * Allocatie-regels:
 *   - stuck_concept_count >= 2 → 3 sessies/week (ma, di, wo)
 *   - assessment_completed = true → 2 sessies/week (ma, di)
 *   - niet geassessed → 1 sessie/week (ma)
 */

import type { SubjectRapport } from './rapport-data';

export interface StudyPlanEntry {
  subject: string;
  day: 'ma' | 'di' | 'wo' | 'do' | 'vr';
  minutes: number;
  completed: boolean;
}

const DAYS: StudyPlanEntry['day'][] = ['ma', 'di', 'wo', 'do', 'vr'];

/**
 * Generates a weekly study plan based on subject rapport data.
 *
 * @param subjects - Array of SubjectRapport objects (one per vak)
 * @returns Array of StudyPlanEntry — one entry per (subject, day) slot
 */
export function generateStudyPlan(subjects: SubjectRapport[]): StudyPlanEntry[] {
  const plan: StudyPlanEntry[] = [];

  subjects.forEach((s) => {
    // Allocatie-regel: stuck=3 sessies/week, geassessed=2, niet-geassessed=1
    const sessionsPerWeek = s.stuckEpisodes >= 2 ? 3 : s.assessmentCompleted ? 2 : 1;
    const assignedDays = DAYS.slice(0, sessionsPerWeek);
    assignedDays.forEach((day) => {
      plan.push({ subject: s.subject, day, minutes: 20, completed: false });
    });
  });

  return plan;
}
