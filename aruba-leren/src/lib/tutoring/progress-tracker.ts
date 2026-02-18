/**
 * Progress Tracker
 *
 * Functions for updating stuck flags and recording level-change events.
 * Both functions use upsert on child_subject_progress (child_id, subject)
 * which guarantees exactly one row per child+subject pair.
 *
 * stuck_concept_count uses a read-then-write pattern rather than an RPC call
 * to keep the implementation simple and avoid requiring a Supabase function.
 * The race-condition window is negligible for this educational use case.
 *
 * Called from: chat API route's onFinish callback (src/app/[locale]/api/tutor/chat/route.ts)
 */

import { createClient } from '@/lib/supabase/server';
import type { Subject } from '@/types/tutoring';
import type { ProgressEventType } from '@/types/progress';

/**
 * Update the stuck flag for a child+subject.
 *
 * When isStuck = true:
 *   - Sets is_stuck = true and stuck_since = now()
 *   - Increments stuck_concept_count by 1 (read-then-write)
 *
 * When isStuck = false:
 *   - Clears is_stuck = false and stuck_since = null
 *   - Does NOT decrement stuck_concept_count (it counts total episodes ever)
 *
 * Called from onFinish when:
 *   - consecutive_incorrect >= 3  → updateStuckFlag(childId, subject, true)
 *   - wasCorrect === true          → updateStuckFlag(childId, subject, false)
 */
export async function updateStuckFlag(
  childId: string,
  subject: Subject,
  isStuck: boolean
): Promise<void> {
  const supabase = await createClient();

  if (isStuck) {
    // Read current stuck_concept_count before incrementing
    const { data: existing } = await supabase
      .from('child_subject_progress')
      .select('stuck_concept_count')
      .eq('child_id', childId)
      .eq('subject', subject)
      .maybeSingle();

    const currentCount = (existing?.stuck_concept_count ?? 0) as number;

    const { error } = await supabase
      .from('child_subject_progress')
      .upsert(
        {
          child_id: childId,
          subject,
          is_stuck: true,
          stuck_since: new Date().toISOString(),
          stuck_concept_count: currentCount + 1,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'child_id,subject', ignoreDuplicates: false }
      );

    if (error) {
      console.error('Error setting stuck flag:', error);
    }
  } else {
    // Clear stuck flag — new session or correct answer
    const { error } = await supabase
      .from('child_subject_progress')
      .update({
        is_stuck: false,
        stuck_since: null,
        updated_at: new Date().toISOString(),
      })
      .eq('child_id', childId)
      .eq('subject', subject);

    if (error) {
      // Non-fatal: row may not exist yet (first session, child not stuck before)
      console.error('Error clearing stuck flag:', error);
    }
  }
}

/**
 * Record a level-change progress event (level_up or level_down).
 *
 * Updates child_subject_progress.current_level to the new level,
 * then inserts an append-only progress_event record with the reason.
 *
 * Called from onFinish when adjustDifficulty() returns reason !== 'no_change'.
 *
 * @param childId   - UUID of the child
 * @param subject   - Which subject changed level
 * @param sessionId - Current tutoring session ID
 * @param eventType - 'level_up' or 'level_down'
 * @param newLevel  - The new difficulty level (1-5)
 * @param reason    - Human-readable reason ('consecutive_correct' | 'needs_easier')
 */
export async function recordProgressEvent(
  childId: string,
  subject: Subject,
  sessionId: string,
  eventType: Extract<ProgressEventType, 'level_up' | 'level_down'>,
  newLevel: number,
  reason: string
): Promise<void> {
  const supabase = await createClient();

  // Update current_level in child_subject_progress snapshot
  const { error: progressError } = await supabase
    .from('child_subject_progress')
    .upsert(
      {
        child_id: childId,
        subject,
        current_level: newLevel,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'child_id,subject', ignoreDuplicates: false }
    );

  if (progressError) {
    console.error('Error updating current_level in child_subject_progress:', progressError);
    // Continue to insert event even if snapshot update fails
  }

  // Append event to progress_events ledger
  const { error: eventError } = await supabase.from('progress_events').insert({
    child_id: childId,
    subject,
    session_id: sessionId,
    event_type: eventType,
    level_at_event: newLevel,
    metadata: { reason },
  });

  if (eventError) {
    console.error('Error inserting progress event:', eventError);
  }
}
