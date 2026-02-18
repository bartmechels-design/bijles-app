/**
 * Assessment Manager
 *
 * Manages the lifecycle of baseline assessment sessions.
 * An assessment session is a tutoring_sessions row with session_type = 'assessment'.
 *
 * The assessment uses a simple binary-search CAT algorithm:
 * - Start at difficulty level 3 (medium)
 * - Koko asks 5-7 questions, adjusting ±1 per answer
 * - Koko emits [ASSESSMENT_DONE:level=X] when complete
 * - finishAssessment() writes the result to child_subject_progress
 *
 * See 05-RESEARCH.md for full design rationale.
 */

import { createClient } from '@/lib/supabase/server';
import type { Subject, TutoringSession } from '@/types/tutoring';
import type { ChildSubjectProgress } from '@/types/progress';

/**
 * Get the current progress row for a child+subject pair.
 * Returns null if no progress record exists yet (assessment not started).
 */
export async function getChildSubjectProgress(
  childId: string,
  subject: Subject
): Promise<ChildSubjectProgress | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('child_subject_progress')
    .select('*')
    .eq('child_id', childId)
    .eq('subject', subject)
    .maybeSingle();

  if (error) {
    console.error('Error fetching child subject progress:', error);
    return null;
  }

  return data as ChildSubjectProgress | null;
}

/**
 * Get progress rows for all subjects for a given child.
 * Used by SubjectSelector to show assessment status and current level for all vakken.
 * Returns an empty array if no progress records exist yet.
 */
export async function getAllSubjectProgress(
  childId: string
): Promise<ChildSubjectProgress[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('child_subject_progress')
    .select('*')
    .eq('child_id', childId);

  if (error) {
    console.error('Error fetching all subject progress:', error);
    return [];
  }

  return (data || []) as ChildSubjectProgress[];
}

/**
 * Create a new assessment session for a child+subject.
 * Sets session_type = 'assessment' and starts at difficulty level 3 (CAT standard).
 * The session is distinguished from normal tutoring sessions by session_type.
 *
 * Used by the assessment entry page (/assessment/[childId]/[subject]).
 */
export async function createAssessmentSession(
  childId: string,
  subject: Subject
): Promise<TutoringSession | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('tutoring_sessions')
    .insert({
      child_id: childId,
      subject,
      session_type: 'assessment',
      difficulty_level: 3, // Start at medium — standard CAT starting point
      metadata: {
        consecutive_correct: 0,
        consecutive_incorrect: 0,
        total_hints_given: 0,
        total_messages: 0,
        tokens_used: 0,
        igdi_phase: 'diagnostische_toets',
        assessment_questions_asked: 0,
      },
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating assessment session:', error);
    return null;
  }

  return data as TutoringSession;
}

/**
 * Finalize an assessment: persist the determined level to child_subject_progress.
 *
 * Called from the chat API route's onFinish callback when [ASSESSMENT_DONE:level=X]
 * is detected in Koko's response text.
 *
 * Idempotent: if the session already has ended_at set, the function returns early
 * without writing duplicate records. This handles the case where onFinish fires
 * multiple times (e.g., network retry) or the assessment signal appears twice.
 *
 * Writes:
 *   1. Upsert child_subject_progress with current_level + assessment_completed = true
 *   2. Insert progress_event with event_type = 'assessment_completed'
 *   3. Set tutoring_sessions.ended_at = now()
 */
export async function finishAssessment(
  childId: string,
  subject: Subject,
  determinedLevel: number,
  sessionId: string
): Promise<void> {
  const supabase = await createClient();

  // Idempotency check: skip if session is already ended
  const { data: session, error: sessionCheckError } = await supabase
    .from('tutoring_sessions')
    .select('ended_at')
    .eq('id', sessionId)
    .single();

  if (sessionCheckError) {
    console.error('Error checking session state in finishAssessment:', sessionCheckError);
    throw new Error('Failed to verify session state');
  }

  if (session?.ended_at) {
    // Already finalized — safe to return without re-writing
    return;
  }

  // 1. Upsert child_subject_progress (handles both first assessment and re-assessment)
  const { error: progressError } = await supabase
    .from('child_subject_progress')
    .upsert(
      {
        child_id: childId,
        subject,
        current_level: determinedLevel,
        assessment_completed: true,
        assessment_session_id: sessionId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'child_id,subject', ignoreDuplicates: false }
    );

  if (progressError) {
    console.error('Error writing assessment result to child_subject_progress:', progressError);
    throw new Error('Failed to persist assessment result');
  }

  // 2. Insert progress event (append-only ledger)
  const { error: eventError } = await supabase.from('progress_events').insert({
    child_id: childId,
    subject,
    session_id: sessionId,
    event_type: 'assessment_completed',
    level_at_event: determinedLevel,
    metadata: { determined_by: 'koko_assessment' },
  });

  if (eventError) {
    // Non-fatal: log but do not throw — progress row already written
    console.error('Error inserting assessment_completed progress event:', eventError);
  }

  // 3. End the assessment session
  const { error: endError } = await supabase
    .from('tutoring_sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', sessionId);

  if (endError) {
    // Non-fatal: log but do not throw — level is already persisted
    console.error('Error setting ended_at on assessment session:', endError);
  }
}
