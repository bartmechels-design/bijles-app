/**
 * Rapport Data Aggregation
 *
 * Aggregates progress data from multiple tables into a structured RapportData object.
 * Used by: rapportpagina (/dashboard/kind/[childId]/rapport) and public share route.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================
// Types
// ============================================

export interface LevelPoint {
  date: string;
  level: number;
}

export interface SubjectRapport {
  subject: string;
  startLevel: number | null;      // niveau bij assessment_completed event
  currentLevel: number;           // uit child_subject_progress.current_level
  levelHistory: LevelPoint[];     // assessment_completed + level_up/level_down events
  totalSessions: number;
  totalCorrect: number;
  totalIncorrect: number;
  totalHintsReceived: number;
  stuckEpisodes: number;          // uit child_subject_progress.stuck_concept_count
  effectiveMinutes: number;       // gecapped op 45 min/sessie
  recurringDifficulty: boolean;   // true als stuck_concept_count >= 2
  assessmentCompleted: boolean;
}

export interface RapportData {
  child: { id: string; first_name: string; grade: number };
  generatedAt: string;
  subjects: SubjectRapport[];
  studyPlan: unknown[] | null;
}

// ============================================
// Internal helpers
// ============================================

/** Calculate effective session minutes for a subject.
 *  Caps each session at 45 minutes. Guards against negative durations.
 */
function calcEffectiveMinutes(
  sessions: Array<{ subject: string; started_at: string; ended_at: string | null }>,
  subject: string
): number {
  const MAX = 45;
  return sessions
    .filter((s) => s.subject === subject && s.ended_at !== null)
    .reduce((total, s) => {
      const durationMin =
        (new Date(s.ended_at!).getTime() - new Date(s.started_at).getTime()) / 60000;
      return total + Math.min(Math.max(0, durationMin), MAX);
    }, 0);
}

// Internal row type for child_subject_progress query result
interface ProgressRow {
  subject: string;
  current_level: number;
  assessment_completed: boolean;
  total_sessions: number;
  total_correct: number;
  total_incorrect: number;
  total_hints_received: number;
  stuck_concept_count: number;
}

// All supported subjects
const ALL_SUBJECTS = [
  'taal',
  'rekenen',
  'begrijpend_lezen',
  'geschiedenis',
  'aardrijkskunde',
  'kennis_der_natuur',
] as const;

// ============================================
// Main function
// ============================================

/**
 * Build a complete RapportData object for a given child.
 *
 * @param childId - UUID of the child
 * @param supabase - Supabase client (server client for authenticated routes,
 *                   admin client for public share routes)
 * @returns RapportData or null if child not found
 */
export async function buildRapportData(
  childId: string,
  supabase: SupabaseClient
): Promise<RapportData | null> {
  // 1. Fetch child
  const { data: child } = await supabase
    .from('children')
    .select('id, first_name, grade')
    .eq('id', childId)
    .single();

  if (!child) {
    return null;
  }

  // 2. Fetch subject progress (one row per child+subject)
  const { data: progressRows } = await supabase
    .from('child_subject_progress')
    .select(
      'subject, current_level, assessment_completed, total_sessions, total_correct, total_incorrect, total_hints_received, stuck_concept_count'
    )
    .eq('child_id', childId);

  // 3. Fetch progress events relevant for level history
  const { data: eventRows } = await supabase
    .from('progress_events')
    .select('subject, event_type, level_at_event, created_at')
    .eq('child_id', childId)
    .in('event_type', ['assessment_completed', 'level_up', 'level_down'])
    .order('created_at', { ascending: true });

  // 4. Fetch tutoring sessions for effective time calculation
  const { data: sessionRows } = await supabase
    .from('tutoring_sessions')
    .select('subject, started_at, ended_at')
    .eq('child_id', childId);

  // 5. Fetch most recent study plan
  const { data: studyPlanRows } = await supabase
    .from('study_plans')
    .select('plan_data')
    .eq('child_id', childId)
    .order('created_at', { ascending: false })
    .limit(1);

  // Build lookup maps
  const progressBySubject: Record<string, ProgressRow> = {};
  for (const row of progressRows ?? []) {
    progressBySubject[row.subject] = row;
  }

  const eventsBySubject: Record<string, Array<{ event_type: string; level_at_event: number; created_at: string }>> = {};
  for (const event of eventRows ?? []) {
    if (!eventsBySubject[event.subject]) {
      eventsBySubject[event.subject] = [];
    }
    eventsBySubject[event.subject].push(event);
  }

  const sessions = sessionRows ?? [];
  const studyPlan = studyPlanRows?.[0]?.plan_data ?? null;

  // 6. Assemble per-subject SubjectRapport
  const subjects: SubjectRapport[] = ALL_SUBJECTS.map((subject) => {
    const progress = progressBySubject[subject];
    const subjectEvents = eventsBySubject[subject] ?? [];

    // Level history: all assessment_completed + level_up/level_down events sorted by created_at
    const levelHistory: LevelPoint[] = subjectEvents.map((e) => ({
      date: e.created_at,
      level: e.level_at_event,
    }));

    // Start level: first assessment_completed event for this subject
    const assessmentEvent = subjectEvents.find((e) => e.event_type === 'assessment_completed');
    const startLevel = assessmentEvent ? assessmentEvent.level_at_event : null;

    const effectiveMinutes = calcEffectiveMinutes(sessions, subject);

    return {
      subject,
      startLevel,
      currentLevel: progress?.current_level ?? 1,
      levelHistory,
      totalSessions: progress?.total_sessions ?? 0,
      totalCorrect: progress?.total_correct ?? 0,
      totalIncorrect: progress?.total_incorrect ?? 0,
      totalHintsReceived: progress?.total_hints_received ?? 0,
      stuckEpisodes: progress?.stuck_concept_count ?? 0,
      effectiveMinutes,
      recurringDifficulty: (progress?.stuck_concept_count ?? 0) >= 2,
      assessmentCompleted: progress?.assessment_completed ?? false,
    };
  });

  return {
    child: {
      id: child.id as string,
      first_name: child.first_name as string,
      grade: child.grade as number,
    },
    generatedAt: new Date().toISOString(),
    subjects,
    studyPlan: Array.isArray(studyPlan) ? studyPlan : null,
  };
}
