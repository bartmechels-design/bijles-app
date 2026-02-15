/**
 * Difficulty Adjustment Algorithm
 *
 * Implements adaptive difficulty per TUTOR-06:
 * - Increase difficulty after 3 consecutive correct answers
 * - Decrease difficulty after 3 consecutive incorrect answers OR 3+ hints on same problem
 *
 * All functions are pure (no side effects, no DB calls).
 * Callers are responsible for persisting the changes to Supabase.
 */

import type {
  TutoringSession,
  DifficultyAdjustment,
  SessionMetadata
} from '@/types/tutoring';

/**
 * Determine if difficulty should be adjusted based on session performance
 * Returns adjustment with Dutch instruction for AI prompt
 */
export function adjustDifficulty(session: TutoringSession): DifficultyAdjustment {
  const { difficulty_level, metadata } = session;
  const { consecutive_correct, consecutive_incorrect, total_hints_given } = metadata;

  // Increase difficulty: 3 consecutive correct AND not already at max
  if (consecutive_correct >= 3 && difficulty_level < 5) {
    return {
      newDifficulty: difficulty_level + 1,
      instruction: `Het kind doet het heel goed! Maak de volgende vraag iets moeilijker (niveau ${difficulty_level + 1} van 5). Geef wat meer uitdaging.`,
      reason: 'consecutive_correct'
    };
  }

  // Decrease difficulty: 3 consecutive incorrect AND not already at min
  if (consecutive_incorrect >= 3 && difficulty_level > 1) {
    return {
      newDifficulty: difficulty_level - 1,
      instruction: `Het kind vindt dit niveau te moeilijk. Maak de volgende vraag makkelijker (niveau ${difficulty_level - 1} van 5). Gebruik eenvoudiger voorbeelden.`,
      reason: 'needs_easier'
    };
  }

  // Decrease difficulty: Too many hints given (indicates struggle)
  if (total_hints_given >= 3 && difficulty_level > 1) {
    return {
      newDifficulty: difficulty_level - 1,
      instruction: `Het kind heeft veel hulp nodig gehad. Maak de volgende vraag makkelijker (niveau ${difficulty_level - 1} van 5). Begin opnieuw met de basis.`,
      reason: 'needs_easier'
    };
  }

  // No change needed
  return {
    newDifficulty: difficulty_level,
    instruction: '',
    reason: 'no_change'
  };
}

/**
 * Record an answer (correct or incorrect) and update performance counters
 * Returns partial metadata to merge with session
 */
export function recordAnswer(
  session: TutoringSession,
  wasCorrect: boolean
): Partial<SessionMetadata> {
  const { metadata } = session;

  if (wasCorrect) {
    // Correct answer: increment consecutive_correct, reset consecutive_incorrect
    return {
      consecutive_correct: metadata.consecutive_correct + 1,
      consecutive_incorrect: 0,
      total_hints_given: 0  // Reset hints counter for new problem
    };
  } else {
    // Incorrect answer: increment consecutive_incorrect, reset consecutive_correct
    return {
      consecutive_correct: 0,
      consecutive_incorrect: metadata.consecutive_incorrect + 1
    };
  }
}
