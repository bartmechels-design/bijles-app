// Progress tracking types for Phase 5: Baseline Assessment & Progress Tracking

/**
 * Maps to the child_subject_progress table.
 * One row per child+subject pair — the current snapshot of progress.
 */
export interface ChildSubjectProgress {
  id: string;
  child_id: string;
  subject: string;
  // Level and assessment state
  current_level: number;            // 1-5
  assessment_completed: boolean;
  assessment_session_id: string | null;
  // Progress metrics
  total_sessions: number;
  total_correct: number;
  total_incorrect: number;
  total_hints_received: number;
  // Stuck detection
  is_stuck: boolean;
  stuck_since: string | null;       // ISO timestamp — when this stuck episode started
  stuck_concept_count: number;      // Total stuck episodes ever (never decremented)
  // Timestamps
  last_session_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Maps to the progress_events table.
 * Append-only ledger of meaningful progress milestones.
 */
export interface ProgressEvent {
  id: string;
  child_id: string;
  subject: string;
  session_id: string | null;
  event_type: ProgressEventType;
  level_at_event: number;           // 1-5 — snapshot of level at time of event
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/**
 * All possible progress event types.
 * Matches the CHECK constraint in the progress_events table.
 */
export type ProgressEventType =
  | 'assessment_completed'  // Baseline assessment finished — level determined
  | 'level_up'              // Level increased after consecutive correct answers
  | 'level_down'            // Level decreased after consecutive incorrect answers
  | 'stuck_flagged'         // Child stuck 3x on a concept in a session
  | 'stuck_cleared'         // Stuck flag cleared after correct answer
  | 'session_started'       // Tutoring session started
  | 'session_ended';        // Tutoring session ended

/**
 * Kid-friendly level names in all four supported languages.
 * Used by LevelBadge component and assessment completion messages.
 */
export const LEVEL_NAMES: Record<number, { nl: string; pap: string; es: string; en: string }> = {
  1: { nl: 'Kleine Ster',    pap: 'Strea Chikito',  es: 'Estrella Pequeña', en: 'Little Star'    },
  2: { nl: 'Groeiende Ster', pap: 'Strea Kresiendo', es: 'Estrella Creciente', en: 'Growing Star' },
  3: { nl: 'Heldere Ster',   pap: 'Strea Brillante', es: 'Estrella Brillante', en: 'Bright Star'  },
  4: { nl: 'Grote Ster',     pap: 'Strea Grandi',    es: 'Estrella Grande',  en: 'Big Star'       },
  5: { nl: 'Superster',      pap: 'Superster',        es: 'Superestrella',    en: 'Superstar'      },
};
