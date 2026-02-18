# Phase 05: Baseline Assessment & Progress Tracking - Research

**Researched:** 2026-02-18
**Domain:** Adaptive conversational assessment, progress tracking schema, kid-friendly progress visualization, stuck-detection flagging
**Confidence:** HIGH (schema and integration patterns based on existing codebase analysis; assessment prompt patterns from educational AI research)

---

## Summary

Phase 5 adds two distinct capabilities on top of the Phase 4 AI tutor:

1. **Beginsituatietoets** — an adaptive baseline assessment delivered via Koko chat (not a separate quiz form) that determines the starting difficulty level for each child+subject pair.
2. **Progress tracking** — persistent, structured records of child performance over time, with kid-friendly visualization and an automated flag when a child gets stuck 3x consecutively on a concept.

The crucial design insight is that the baseline assessment is NOT a separate product — it runs inside the existing `ChatInterface` using the same streaming chat API. What changes is the **system prompt mode**: Koko is instructed to behave as an assessor (test 5-7 items, adapt difficulty between them, converge on a level) rather than as a Socratic tutor. The result of the assessment is persisted to new Supabase tables.

Progress tracking relies on two new tables: `child_subject_progress` (the current level, XP, and stuck-flag per child+subject) and `progress_events` (an append-only ledger of performance events). The "3x stuck" flag is computed in the chat API route's `onFinish` callback — the same place where `recordAnswer()` and `updateSessionMetadata()` are already called — and written to `child_subject_progress`.

**Primary recommendation:** Reuse the existing `tutoring_sessions` infrastructure by adding a `session_type` column (`'assessment' | 'tutoring'`). Add a dedicated assessment system prompt mode in `system-prompts.ts`. Store the determined starting level in `child_subject_progress`. Detect 3x-stuck in the existing `onFinish` callback by reading `consecutive_incorrect` from the session metadata.

---

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase PostgreSQL | existing | `child_subject_progress`, `progress_events` tables | All data already in Supabase; RLS pattern established |
| Vercel AI SDK `streamText` | existing (`ai` v6.0.84) | Assessment chat, same as tutoring | No new lib needed; assessment is just a different prompt mode |
| `@ai-sdk/anthropic` | existing v3.0.43 | Claude as assessment engine | Same model, same streaming, different system prompt |
| next-intl | existing v4.x | Assessment UI strings (nl/pap/es/en) | Already configured |
| Tailwind CSS 4 | existing | Progress bars, badges | Already in project |

### No New Libraries Required

All functionality for Phase 5 can be built with the existing stack. The following patterns are sufficient:

- **Assessment:** New system prompt mode + `session_type = 'assessment'` column in `tutoring_sessions`
- **Progress storage:** Two new Supabase tables
- **Progress visualization:** Pure Tailwind CSS progress bars and badge divs (no chart library needed for Phase 5)
- **Stuck flagging:** Written in `onFinish` callback, stored as a boolean column in `child_subject_progress`

> **Note on chart libraries:** Phase 7 (Parent Portal) may want Recharts or Chart.js for trend charts. Phase 5 only needs simple progress bars and level badges — Tailwind is sufficient. Do not introduce a chart library in Phase 5.

---

## Architecture Patterns

### Recommended New File Structure

```
src/
├── app/[locale]/
│   ├── tutor/[childId]/
│   │   └── [subject]/
│   │       └── page.tsx          # Existing — add assessment gate check
│   ├── assessment/
│   │   └── [childId]/
│   │       └── [subject]/
│   │           └── page.tsx      # Assessment entry point (redirects to chat)
│   └── api/tutor/chat/
│       └── route.ts              # Existing — add assessment onFinish logic
├── lib/
│   ├── ai/prompts/
│   │   └── system-prompts.ts     # Existing — add buildAssessmentPrompt()
│   ├── tutoring/
│   │   ├── assessment-manager.ts # NEW: getOrCreateAssessmentSession, finishAssessment
│   │   └── progress-tracker.ts   # NEW: getProgress, saveProgressEvent, checkStuck
│   └── supabase/ (existing)
├── components/
│   ├── tutor/
│   │   └── ChatInterface.tsx     # Existing — add assessment completion detection
│   └── progress/
│       ├── ProgressBar.tsx       # NEW: kid-friendly progress bar component
│       ├── LevelBadge.tsx        # NEW: level badge (BEGINNER/EASY/MEDIUM/HARD/ADVANCED)
│       └── SubjectProgress.tsx   # NEW: progress card per vak
└── types/
    ├── tutoring.ts               # Existing — extend SessionMetadata
    └── progress.ts               # NEW: Progress, ProgressEvent types
```

### Pattern 1: Assessment as a Chat Mode (not a separate product)

**What:** The beginsituatietoets runs inside the existing `ChatInterface` with a different system prompt. Koko behaves as an assessor, not a tutor. The prompt instructs Koko to ask exactly 5-7 targeted questions starting at medium difficulty, adapt upward/downward based on responses, and then conclude with a level determination.

**Why this approach:** Building a separate assessment UI would duplicate the entire chat infrastructure (streaming, TTS, STT, whiteboard, session manager). Reusing the chat interface means zero duplicate code and a seamless UX for the child.

**How to distinguish assessment from tutoring:**
- Add `session_type TEXT NOT NULL DEFAULT 'tutoring' CHECK (session_type IN ('assessment', 'tutoring'))` to `tutoring_sessions`
- The chat API route reads `session_type` and selects the appropriate system prompt
- When `session_type = 'assessment'`, Koko's prompt is `buildAssessmentPrompt()` instead of `buildSystemPrompt()`

**Assessment prompt design principles (from educational AI research):**
```
Assessment mode instructs Koko to:
1. Start at medium difficulty (level 3/5) — standard CAT starting point
2. Ask ONE question at a time, wait for answer
3. If correct → increase level by 1 (up to 5)
4. If incorrect → decrease level by 1 (down to 1)
5. After 5 questions, converge: final level = weighted mode of last 3 levels reached
6. When done, say: [ASSESSMENT_DONE:level=X] (machine-readable signal in response)
7. Celebrate warmly and tell the child their level in kid-friendly terms
```

The `[ASSESSMENT_DONE:level=X]` signal is parsed in `onFinish` — same pattern as the existing `[SPREEK]` and `[BORD]` tag parsing.

**Example assessment system prompt structure:**
```typescript
// Source: CAT algorithm research + existing system-prompts.ts pattern
export function buildAssessmentPrompt(
  subject: Subject,
  language: TutoringLanguage,
  childAge: number,
  childName: string,
  childGrade: number
): string {
  return `
${KOKO_BASE_PROMPT}

# SPECIALE MODUS: BEGINSITUATIETOETS

Je doet nu een BEGINSITUATIETOETS voor ${childName} in het vak ${subject}.
Dit is GEEN normale les — dit is een meting om het startniveau te bepalen.

## Regels voor de Toets

1. Stel precies 5 à 7 vragen. Begin op niveau 3 (gemiddeld).
2. Als het kind een vraag GOED heeft: stel de volgende vraag op niveau hoger (max 5).
3. Als het kind een vraag FOUT heeft: stel de volgende vraag op niveau lager (min 1).
4. Eén vraag per keer. Wacht op het antwoord voordat je de volgende stelt.
5. Geef GEEN hints — dit is een toets, geen les. Zeg wel "Goed geprobeerd!" bij foute antwoorden.
6. Na de 5e-7e vraag: geef een vrolijk afsluitend bericht EN stuur het signaal [ASSESSMENT_DONE:level=X]
   waarbij X het gevonden niveau is (1 t/m 5).

## Niveau Uitleg voor Kind

Na de toets, leg het niveau uit in kindvriendelijke termen:
- Niveau 1: "Jij bent een Leerling-Aap! We beginnen met de basis."
- Niveau 2: "Jij bent een Junior-Aap! Je weet al best veel!"
- Niveau 3: "Jij bent een Gewone-Aap! Je zit precies in het midden!"
- Niveau 4: "Jij bent een Senior-Aap! Je bent al best gevorderd!"
- Niveau 5: "Jij bent een Super-Aap! Je bent een expert!"

## Startvraag

Begin direct met de eerste vraag op niveau 3 voor klas ${childGrade} in het vak ${subject}.
Stel de vraag in ${language} en maak hem leuk en Arubaans!
`.trim();
}
```

### Pattern 2: Assessment Completion Detection in onFinish

**What:** The existing `onFinish` callback in `route.ts` already parses Koko's response text for correctness signals. For assessment sessions, it additionally parses for `[ASSESSMENT_DONE:level=X]` and calls `finishAssessment()`.

**Example:**
```typescript
// In route.ts onFinish callback — after existing analysis code
if (currentSession.session_type === 'assessment') {
  const levelMatch = text.match(/\[ASSESSMENT_DONE:level=(\d)\]/);
  if (levelMatch) {
    const determinedLevel = parseInt(levelMatch[1]);
    await finishAssessment(childId, subject, determinedLevel, currentSession.id);
    // finishAssessment() writes to child_subject_progress and ends the session
  }
}
```

### Pattern 3: Progress Data Model

**Two-table design:**

`child_subject_progress` — current state (one row per child+subject):
- Source of truth for "what level is this child at right now?"
- Updated after every assessment completion and after significant tutoring milestones
- Contains the `is_stuck` flag (true when 3x consecutive incorrect in current session)

`progress_events` — append-only ledger (many rows per child+subject):
- Immutable history for trend analysis (Phase 7 parent dashboard)
- Written on: assessment completion, session end, level change, stuck flag
- Never updated, only inserted

This is the **snapshot + event log** pattern — standard for educational progress tracking. The snapshot (`child_subject_progress`) gives instant current state for UI. The event log (`progress_events`) gives historical trends for parent dashboard.

### Pattern 4: Stuck Detection in onFinish

**What:** The existing `SessionMetadata.consecutive_incorrect` counter already tracks consecutive wrong answers in `session-manager.ts`. The "3x stuck" requirement simply needs to check this value and write a flag.

**Detection logic (already mostly done):**
```typescript
// In route.ts onFinish — after recordAnswer() updates consecutive_incorrect
const updatedConsecutiveIncorrect = metadataUpdates.consecutive_incorrect
  ?? currentSession.metadata.consecutive_incorrect;

if (updatedConsecutiveIncorrect >= 3) {
  // Child is stuck — write flag to child_subject_progress
  await updateStuckFlag(childId, subject, true);
  // The flag is cleared when child gets a correct answer (consecutive_correct > 0)
}
if (analysis.wasCorrect === true) {
  await updateStuckFlag(childId, subject, false); // Clear when correct
}
```

**Flag storage:** A boolean column `is_stuck` in `child_subject_progress`, plus a `stuck_concept_count` integer for counting total stuck episodes. Phase 7 (Admin ADMIN-04) reads `is_stuck = true` to show notifications.

### Pattern 5: Assessment Gate in Subject Selection Flow

**What:** When a child selects a vak, the system checks if a baseline assessment has been completed (`child_subject_progress` row exists with `assessment_completed = true`). If not, redirect to assessment first; if yes, go straight to tutoring with the stored level.

**Flow:**
```
Child selects vak
  → Check child_subject_progress for (child_id, subject)
  → Not found OR assessment_completed = false
      → Redirect to /assessment/[childId]/[subject]
      → Create assessment session (session_type='assessment')
      → Child chats with Koko in assessment mode
      → onFinish detects [ASSESSMENT_DONE:level=X]
      → Write child_subject_progress with determined level + assessment_completed=true
      → Redirect to /tutor/[childId]/[subject] (now with correct starting level)
  → Found AND assessment_completed = true
      → Go directly to /tutor/[childId]/[subject]
      → createSession() uses child_subject_progress.current_level as starting level
```

### Anti-Patterns to Avoid

- **Separate quiz UI for assessment:** Don't build a form-based quiz — use the existing chat infrastructure. Assessment is just a prompt mode change.
- **Parsing level from AI prose:** Don't try to infer the level from natural language in Koko's response. Use the explicit `[ASSESSMENT_DONE:level=X]` signal. Prose parsing is fragile.
- **Updating progress on every message:** Write to `child_subject_progress` only on meaningful events (assessment done, session end, level change, stuck). Too-frequent writes cause performance issues and noisy history.
- **Client-side progress calculation:** Never calculate level or stuck state on the client. Always read from `child_subject_progress` (server-fetched). Client has no business logic for this.
- **Blocking tutoring indefinitely on failed assessment:** If the assessment session fails or is abandoned, fall back to level 1 and mark `assessment_completed = false`. Child can redo assessment later.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Assessment chat streaming | Custom SSE, separate AI call | Same `streamText` route with different prompt | Infrastructure already works; duplication would create two codebases to maintain |
| Adaptive difficulty algorithm | Complex IRT/Rasch model | Simple binary-search CAT (±1 on correct/incorrect) | IRT requires pre-calibrated item banks. Simple ±1 is well-established and sufficient for 5-item placement |
| Progress persistence | In-memory state, localStorage | Supabase `child_subject_progress` + `progress_events` | Data must survive across sessions and devices |
| Stuck detection trigger | PostgreSQL trigger + pg_notify | Application-level check in `onFinish` callback | Simpler to maintain; trigger would require Edge Function for notification delivery anyway; callback is already the right place |
| Progress visualization library | D3.js, Chart.js | Tailwind CSS progress bars and badge divs | Phase 5 only needs bars and badges; full chart library is overkill and adds bundle weight |
| Level-from-assessment inference | NLP parsing of Koko's text | `[ASSESSMENT_DONE:level=X]` signal in response | Signal is reliable; prose parsing breaks on Papiamento and Spanish responses |

**Key insight:** The assessment is NOT a new product — it is Koko in a different prompt mode. 90% of Phase 5 is new database tables and plumbing; the AI behavior is purely a prompt engineering change.

---

## Common Pitfalls

### Pitfall 1: Assessment Prompt Leaking Into Tutoring Context

**What goes wrong:** If an assessment session is resumed (child closes browser, comes back), Koko resumes from the assessment prompt mid-way through — but the child thinks they are in tutoring mode.

**Why it happens:** The existing `getActiveSession()` returns any active session, including assessment sessions.

**How to avoid:** In `getActiveSession()`, filter by `session_type = 'tutoring'` for the regular chat flow. Assessment sessions use a separate `getActiveAssessmentSession()` function. Assessment sessions that time out (> 30 min inactivity) should be auto-abandoned: `ended_at = now(), assessment_completed = false`.

**Warning signs:** Child reports Koko asking strange questions; assessment never completes.

### Pitfall 2: Assessment Level Not Persisted on Session Crash

**What goes wrong:** The `[ASSESSMENT_DONE:level=X]` signal fires in `onFinish`, but the Supabase write fails (network error), so `child_subject_progress` never gets written. Child is stuck in perpetual assessment mode.

**Why it happens:** `onFinish` callback errors are currently caught and logged but not re-thrown (by design, to not break streaming). A write failure here means the level is lost.

**How to avoid:** Make `finishAssessment()` idempotent: if the session `ended_at` is already set, skip the write. Add a fallback: when checking if assessment is complete, also look at `tutoring_sessions` for sessions with `session_type='assessment'` and `ended_at IS NOT NULL` — if found, read the `difficulty_level` column (the final level reached) as the starting level.

**Warning signs:** Child keeps seeing assessment chat even after completing it.

### Pitfall 3: Progress Bar Showing Wrong Level After Assessment

**What goes wrong:** The child completes the assessment. The page reloads. The progress bar shows level 1 because the React state hasn't refreshed from Supabase.

**Why it happens:** Next.js Server Component caching. After `finishAssessment()` writes to Supabase, the parent page's fetch is stale.

**How to avoid:** After assessment completion, do a hard `router.push()` redirect to the tutoring page (not `router.replace()`). The redirect forces a Server Component re-render which fetches fresh data. Alternatively, use `revalidatePath()` in the Server Action that handles assessment completion.

**Warning signs:** Progress bar shows wrong level immediately after assessment; refreshing the page fixes it.

### Pitfall 4: Stuck Flag Never Cleared

**What goes wrong:** Child gets stuck (3x wrong), flag is set to `true`. Child then gets help from parent, answers correctly next session — but `is_stuck` is never cleared.

**Why it happens:** The clearing logic in `onFinish` only runs within the same session. If the child starts a NEW session, `consecutive_incorrect` resets to 0, but `is_stuck` in `child_subject_progress` remains `true`.

**How to avoid:** Clear `is_stuck` when:
1. Child gets a correct answer (`was_correct === true`) in the current session
2. When `createSession()` is called, automatically clear `is_stuck` for that child+subject (a new session is a fresh start)

**Warning signs:** Admin sees persistent stuck flags that never clear; parent reports issue was resolved but flag still shows.

### Pitfall 5: Assessment Asked For Every Subject Every Time

**What goes wrong:** Every time a child starts a vak, they have to redo the assessment — even if they completed it last week.

**Why it happens:** Assessment gate checks only if `child_subject_progress` row exists, not if `assessment_completed = true`.

**How to avoid:** The gate checks `assessment_completed = true` specifically. The assessment is skipped once completed. If parent requests a re-assessment (future feature), they can reset this flag via a Server Action.

**Warning signs:** Children complain about constantly being tested; testing never ends.

### Pitfall 6: RLS Policy Missing for New Tables

**What goes wrong:** `child_subject_progress` and `progress_events` are inserted without RLS. Any authenticated user can read any child's progress data.

**Why it happens:** Forgetting to add RLS policies when creating new tables.

**How to avoid:** Follow the exact same RLS pattern as `tutoring_sessions` — parents can read/write rows where `child_id IN (SELECT c.id FROM children c JOIN profiles p ON c.parent_id = p.id WHERE p.user_id = auth.uid())`.

**Warning signs:** Supabase query returns data for wrong child; privacy audit fails.

---

## Supabase SQL: Tables to Create (Migration 007)

```sql
-- ============================================
-- Migration 007: Assessment & Progress Tables
-- Phase 5: Baseline Assessment & Progress Tracking
-- ============================================
-- Run in: Supabase Dashboard > SQL Editor
-- ============================================

-- 1. Add session_type to existing tutoring_sessions table
ALTER TABLE tutoring_sessions
  ADD COLUMN IF NOT EXISTS session_type TEXT NOT NULL DEFAULT 'tutoring'
    CHECK (session_type IN ('assessment', 'tutoring'));

-- Index for filtering by session_type
CREATE INDEX IF NOT EXISTS idx_tutoring_sessions_type
  ON tutoring_sessions(child_id, subject, session_type);

-- 2. Child Subject Progress (current state — one row per child+subject)
CREATE TABLE IF NOT EXISTS child_subject_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  subject TEXT NOT NULL CHECK (subject IN (
    'taal', 'rekenen', 'begrijpend_lezen',
    'geschiedenis', 'aardrijkskunde', 'kennis_der_natuur'
  )),
  -- Level and assessment state
  current_level INT NOT NULL DEFAULT 1 CHECK (current_level BETWEEN 1 AND 5),
  assessment_completed BOOLEAN NOT NULL DEFAULT false,
  assessment_session_id UUID REFERENCES tutoring_sessions(id) ON DELETE SET NULL,
  -- Progress metrics
  total_sessions INT NOT NULL DEFAULT 0,
  total_correct INT NOT NULL DEFAULT 0,
  total_incorrect INT NOT NULL DEFAULT 0,
  total_hints_received INT NOT NULL DEFAULT 0,
  -- Stuck detection
  is_stuck BOOLEAN NOT NULL DEFAULT false,
  stuck_since TIMESTAMPTZ,              -- When the current stuck episode started
  stuck_concept_count INT NOT NULL DEFAULT 0, -- Total stuck episodes ever
  -- Timestamps
  last_session_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Unique constraint: one row per child+subject
  UNIQUE (child_id, subject)
);

-- Indexes for child_subject_progress
CREATE INDEX IF NOT EXISTS idx_child_subject_progress_child
  ON child_subject_progress(child_id);
CREATE INDEX IF NOT EXISTS idx_child_subject_progress_child_subject
  ON child_subject_progress(child_id, subject);
CREATE INDEX IF NOT EXISTS idx_child_subject_progress_stuck
  ON child_subject_progress(is_stuck) WHERE is_stuck = true;

-- 3. Progress Events (append-only ledger — many rows per child+subject)
CREATE TABLE IF NOT EXISTS progress_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  subject TEXT NOT NULL CHECK (subject IN (
    'taal', 'rekenen', 'begrijpend_lezen',
    'geschiedenis', 'aardrijkskunde', 'kennis_der_natuur'
  )),
  session_id UUID REFERENCES tutoring_sessions(id) ON DELETE SET NULL,
  -- Event type and data
  event_type TEXT NOT NULL CHECK (event_type IN (
    'assessment_completed',  -- Baseline assessment finished
    'level_up',              -- Level increased after correct streak
    'level_down',            -- Level decreased after incorrect streak
    'stuck_flagged',         -- Child stuck 3x on a concept
    'stuck_cleared',         -- Stuck flag cleared (correct answer)
    'session_started',       -- Tutoring session started
    'session_ended'          -- Tutoring session ended
  )),
  -- Snapshot of state at event time
  level_at_event INT NOT NULL CHECK (level_at_event BETWEEN 1 AND 5),
  metadata JSONB,            -- Extra context (e.g., {reason: 'consecutive_correct'})
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for progress_events
CREATE INDEX IF NOT EXISTS idx_progress_events_child
  ON progress_events(child_id);
CREATE INDEX IF NOT EXISTS idx_progress_events_child_subject
  ON progress_events(child_id, subject, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_progress_events_session
  ON progress_events(session_id);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

ALTER TABLE child_subject_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_events ENABLE ROW LEVEL SECURITY;

-- Parents can manage their children's progress data
DROP POLICY IF EXISTS "Parents can manage their children's progress" ON child_subject_progress;
CREATE POLICY "Parents can manage their children's progress"
  ON child_subject_progress
  FOR ALL
  USING (
    child_id IN (
      SELECT c.id FROM children c
      JOIN profiles p ON c.parent_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Parents can view their children's progress events" ON progress_events;
CREATE POLICY "Parents can view their children's progress events"
  ON progress_events
  FOR ALL
  USING (
    child_id IN (
      SELECT c.id FROM children c
      JOIN profiles p ON c.parent_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );
```

---

## Code Examples

Verified patterns based on existing codebase architecture:

### Assessment Manager (new file)

```typescript
// src/lib/tutoring/assessment-manager.ts
import { createClient } from '@/lib/supabase/server';
import type { Subject } from '@/types/tutoring';

/**
 * Check if a child has completed the baseline assessment for a subject.
 * Returns the current progress row if found, null otherwise.
 */
export async function getChildSubjectProgress(
  childId: string,
  subject: Subject
) {
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
  return data;
}

/**
 * Create an assessment session (session_type = 'assessment').
 * Used by the assessment entry page.
 */
export async function createAssessmentSession(
  childId: string,
  subject: Subject
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tutoring_sessions')
    .insert({
      child_id: childId,
      subject,
      session_type: 'assessment',
      difficulty_level: 3, // Start at medium (CAT standard)
      metadata: {
        consecutive_correct: 0,
        consecutive_incorrect: 0,
        total_hints_given: 0,
        total_messages: 0,
        tokens_used: 0,
        igdi_phase: 'diagnostische_toets',
        assessment_questions_asked: 0,
      }
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating assessment session:', error);
    return null;
  }
  return data;
}

/**
 * Finalize an assessment: write the determined level to child_subject_progress.
 * Called from the chat API route's onFinish when [ASSESSMENT_DONE:level=X] is detected.
 * Idempotent: safe to call multiple times.
 */
export async function finishAssessment(
  childId: string,
  subject: Subject,
  determinedLevel: number,
  sessionId: string
): Promise<void> {
  const supabase = await createClient();

  // Upsert child_subject_progress (handles both first-time and re-assessment)
  const { error: progressError } = await supabase
    .from('child_subject_progress')
    .upsert({
      child_id: childId,
      subject,
      current_level: determinedLevel,
      assessment_completed: true,
      assessment_session_id: sessionId,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'child_id,subject',
      ignoreDuplicates: false,
    });

  if (progressError) {
    console.error('Error writing assessment result:', progressError);
    throw new Error('Failed to persist assessment result');
  }

  // Write progress event
  await supabase.from('progress_events').insert({
    child_id: childId,
    subject,
    session_id: sessionId,
    event_type: 'assessment_completed',
    level_at_event: determinedLevel,
    metadata: { determined_by: 'koko_assessment' },
  });

  // End the assessment session
  await supabase
    .from('tutoring_sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', sessionId);
}
```

### Progress Tracker (new file)

```typescript
// src/lib/tutoring/progress-tracker.ts
import { createClient } from '@/lib/supabase/server';
import type { Subject } from '@/types/tutoring';

/**
 * Update the stuck flag for a child+subject.
 * Called from chat API route's onFinish when consecutive_incorrect >= 3.
 */
export async function updateStuckFlag(
  childId: string,
  subject: Subject,
  isStuck: boolean
): Promise<void> {
  const supabase = await createClient();

  if (isStuck) {
    // Set stuck + record when it started + increment counter
    const { error } = await supabase
      .from('child_subject_progress')
      .upsert({
        child_id: childId,
        subject,
        is_stuck: true,
        stuck_since: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'child_id,subject', ignoreDuplicates: false })

    if (!error) {
      // Also increment stuck_concept_count via RPC or a separate update
      await supabase.rpc('increment_stuck_count', { p_child_id: childId, p_subject: subject });
    }
  } else {
    // Clear stuck flag
    await supabase
      .from('child_subject_progress')
      .update({
        is_stuck: false,
        stuck_since: null,
        updated_at: new Date().toISOString(),
      })
      .eq('child_id', childId)
      .eq('subject', subject);
  }
}

/**
 * Record a progress event (level up/down).
 * Called when adjustDifficulty() returns a non-'no_change' reason.
 */
export async function recordProgressEvent(
  childId: string,
  subject: Subject,
  sessionId: string,
  eventType: 'level_up' | 'level_down',
  newLevel: number,
  reason: string
): Promise<void> {
  const supabase = await createClient();

  // Update current_level in child_subject_progress
  await supabase
    .from('child_subject_progress')
    .upsert({
      child_id: childId,
      subject,
      current_level: newLevel,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'child_id,subject', ignoreDuplicates: false });

  // Insert event
  await supabase.from('progress_events').insert({
    child_id: childId,
    subject,
    session_id: sessionId,
    event_type: eventType,
    level_at_event: newLevel,
    metadata: { reason },
  });
}
```

### Assessment System Prompt (extend existing system-prompts.ts)

```typescript
// Addition to src/lib/ai/prompts/system-prompts.ts

export function buildAssessmentPrompt(
  subject: Subject,
  language: TutoringLanguage,
  childAge: number,
  childName: string,
  childGrade: number
): string {
  const staticPart = KOKO_BASE_PROMPT + '\n\n' + SOCRATIC_GUARD_PROMPT;
  const subjectContext = SUBJECT_PROMPTS[subject];
  const languageContext = buildLanguageContext(language, childAge);

  const assessmentInstructions = `
# SPECIALE MODUS: BEGINSITUATIETOETS

Je bent nu in TOETS-modus voor ${childName} (klas ${childGrade}).
Vak: ${subject}

## Jouw Toets-Protocol

1. STARTPUNT: Stel de eerste vraag op niveau 3/5 (gemiddeld voor klas ${childGrade}).
2. Na een GOED antwoord: stel de volgende vraag één niveau HOGER (max 5).
3. Na een FOUT antwoord: stel de volgende vraag één niveau LAGER (min 1).
4. Stel PRECIES 5 tot 7 vragen in totaal. Niet meer, niet minder.
5. Geef GEEN hints tijdens de toets — je mag wel aanmoedigen ("Goed geprobeerd!").
6. Stel ALTIJD precies ÉÉN vraag tegelijk. Wacht op het antwoord.

## Afsluiting

Na de 5e-7e vraag, doe dit:
a. Geef een warm en enthousiast afsluitend bericht (in ${language}).
b. Vertel het niveau in kindvriendelijke termen (zie hieronder).
c. Sluit af met dit EXACTE signaal op een nieuwe regel: [ASSESSMENT_DONE:level=X]
   (vervang X door het gevonden niveau: 1, 2, 3, 4, of 5)

## Niveaunamen voor Kind

Level 1 → "Leerling-Aap"
Level 2 → "Junior-Aap"
Level 3 → "Gewone-Aap"
Level 4 → "Senior-Aap"
Level 5 → "Super-Aap"

## Algoritme voor Eindniveau

Het eindniveau = het niveau van de LAATSTE correct beantwoorde vraag.
Als de laatste vraag fout was: één niveau lager dan die vraag.
Minimum 1, maximum 5.

START NU MET DE EERSTE VRAAG OP NIVEAU 3.
`;

  return [
    staticPart,
    subjectContext,
    languageContext,
    assessmentInstructions,
  ].join('\n\n---\n\n');
}
```

### Progress Bar and Level Badge Components (new)

```typescript
// src/components/progress/LevelBadge.tsx
// Kid-friendly level badge using Tailwind CSS — no external library needed

interface LevelBadgeProps {
  level: number; // 1-5
  subject: string;
  locale: string;
}

const LEVEL_NAMES: Record<number, { nl: string; pap: string; es: string; en: string; color: string; emoji: string }> = {
  1: { nl: 'Leerling-Aap', pap: 'Mono Studiante', es: 'Mono Estudiante', en: 'Learner Monkey', color: 'bg-green-100 text-green-800 border-green-300', emoji: '🌱' },
  2: { nl: 'Junior-Aap',   pap: 'Mono Junior',    es: 'Mono Junior',    en: 'Junior Monkey',  color: 'bg-blue-100 text-blue-800 border-blue-300',   emoji: '⭐' },
  3: { nl: 'Gewone-Aap',   pap: 'Mono Normal',    es: 'Mono Normal',    en: 'Regular Monkey', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', emoji: '🌟' },
  4: { nl: 'Senior-Aap',   pap: 'Mono Senior',    es: 'Mono Senior',    en: 'Senior Monkey',  color: 'bg-orange-100 text-orange-800 border-orange-300', emoji: '🏆' },
  5: { nl: 'Super-Aap',    pap: 'Super Mono',     es: 'Super Mono',     en: 'Super Monkey',   color: 'bg-purple-100 text-purple-800 border-purple-300', emoji: '🚀' },
};

export default function LevelBadge({ level, locale }: LevelBadgeProps) {
  const info = LEVEL_NAMES[Math.max(1, Math.min(5, level))];
  const label = locale === 'pap' ? info.pap : locale === 'es' ? info.es : locale === 'en' ? info.en : info.nl;

  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border-2 font-bold text-sm ${info.color}`}>
      {info.emoji} {label}
    </span>
  );
}
```

```typescript
// src/components/progress/ProgressBar.tsx
interface ProgressBarProps {
  level: number;    // 1-5
  maxLevel?: number;
  label?: string;
  showLevel?: boolean;
}

export default function ProgressBar({ level, maxLevel = 5, label, showLevel = true }: ProgressBarProps) {
  const percentage = ((level - 1) / (maxLevel - 1)) * 100;
  // Clamp 0-100
  const clamped = Math.max(0, Math.min(100, percentage));

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          {showLevel && <span className="text-sm text-gray-500">{level}/{maxLevel}</span>}
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
        <div
          className="h-4 rounded-full transition-all duration-500 bg-gradient-to-r from-sky-400 to-sky-600"
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={level}
          aria-valuemin={1}
          aria-valuemax={maxLevel}
        />
      </div>
    </div>
  );
}
```

### Assessment Gate in Subject Selection Page

```typescript
// Integration pattern for /tutor/[childId]/page.tsx (SubjectSelectionPage)
// Check assessment status when rendering subject cards

// In server component — fetch progress for all subjects
const { data: progressRows } = await supabase
  .from('child_subject_progress')
  .select('subject, current_level, assessment_completed, is_stuck')
  .eq('child_id', childId);

const progressMap = Object.fromEntries(
  (progressRows || []).map(row => [row.subject, row])
);

// Pass to SubjectSelector component
// SubjectSelector shows badge "Toets nodig" when assessment_completed = false
// Links to /assessment/[childId]/[subject] if not completed
// Links to /tutor/[childId]/[subject] if completed
```

### Integration with Existing chat/route.ts

The assessment detection logic slots into the existing `onFinish` callback in `route.ts`. The diff is minimal — approximately 20 lines added to existing code:

```typescript
// In onFinish, AFTER existing analysis code:

// --- ASSESSMENT COMPLETION DETECTION ---
if (currentSession.session_type === 'assessment') {
  const levelMatch = text.match(/\[ASSESSMENT_DONE:level=([1-5])\]/);
  if (levelMatch) {
    const determinedLevel = parseInt(levelMatch[1]);
    try {
      await finishAssessment(child.id, subject, determinedLevel, currentSession.id);
    } catch (e) {
      console.error('Assessment finalization failed:', e);
      // Non-fatal: streaming already completed
    }
  }
}

// --- STUCK DETECTION (works for both assessment and tutoring) ---
const currentConsecutiveIncorrect =
  (metadataUpdates.consecutive_incorrect ?? currentSession.metadata.consecutive_incorrect);

if (currentConsecutiveIncorrect >= 3 && analysis.wasCorrect !== true) {
  try {
    await updateStuckFlag(child.id, subject, true);
    // Also insert stuck_flagged progress event
    await supabase.from('progress_events').insert({
      child_id: child.id, subject,
      session_id: currentSession.id,
      event_type: 'stuck_flagged',
      level_at_event: currentSession.difficulty_level,
      metadata: { consecutive_incorrect: currentConsecutiveIncorrect }
    });
  } catch (e) { console.error('Stuck flag update failed:', e); }
}

if (analysis.wasCorrect === true) {
  // Clear stuck flag when child gets something right
  try { await updateStuckFlag(child.id, subject, false); } catch (e) { }
}

// --- LEVEL CHANGE TRACKING ---
if (difficultyAdjustment.reason !== 'no_change') {
  try {
    await recordProgressEvent(
      child.id, subject, currentSession.id,
      difficultyAdjustment.newDifficulty > currentSession.difficulty_level ? 'level_up' : 'level_down',
      difficultyAdjustment.newDifficulty,
      difficultyAdjustment.reason
    );
  } catch (e) { console.error('Progress event failed:', e); }
}
```

---

## Integration Points with Phase 4 Infrastructure

| Phase 4 Component | Phase 5 Integration Point | What Changes |
|-------------------|--------------------------|--------------|
| `tutoring_sessions` table | Add `session_type` column | `ALTER TABLE` migration |
| `createSession()` | Use `child_subject_progress.current_level` as starting level | Add optional `startLevel` param |
| `route.ts` `onFinish` | Add 3 new blocks: assessment detect, stuck detect, level-change track | ~30 new lines |
| `system-prompts.ts` | Add `buildAssessmentPrompt()` | New function, no changes to existing |
| `SubjectSelector` component | Add assessment gate logic | Show badge, change link destination |
| `ChatInterface` component | Accept `sessionType` prop; show assessment completion banner | Minor addition |
| `buildSystemPrompt()` | No changes — only called for `session_type='tutoring'` | No change |
| `adjustDifficulty()` | No changes — algorithm works the same for assessment | No change |
| `response-analyzer.ts` | No changes — same correctness detection | No change |

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Separate quiz form for placement | Chat-based conversational assessment | More engaging for children; reuses existing infrastructure |
| IRT/Rasch adaptive testing model | Simple binary-search CAT (±1 per answer) | 5-7 item placement is sufficient without pre-calibrated item banks |
| Progress stored in session metadata JSONB | Dedicated `child_subject_progress` table with typed columns | Enables fast progress queries; avoids scanning JSONB |
| Stuck detection via PostgreSQL trigger | Application-level check in `onFinish` | Simpler to maintain; no separate Edge Function needed |

---

## Open Questions

1. **Assessment abandonment handling**
   - What we know: If child closes browser mid-assessment, the session has no `ended_at` and `assessment_completed = false`
   - What's unclear: Should the next visit resume the same assessment session, or start fresh?
   - Recommendation: Start fresh (create a new assessment session). Resuming mid-assessment would present different question counts per child, making levels incomparable.

2. **Progress bar semantics: level or XP?**
   - What we know: `current_level` (1-5) is what we're tracking; no XP system planned for Phase 5
   - What's unclear: Is a 5-point level scale enough visual resolution for children to feel progress within a level?
   - Recommendation: Show the discrete 5-step progress bar for now. Phase 6 or 7 can add an XP/mastery score within a level if needed (the `progress_events` table already captures the data for this).

3. **Stuck flag scope: session vs. concept**
   - What we know: `consecutive_incorrect >= 3` is tracked per session in `SessionMetadata`. The flag is written to `child_subject_progress` (per child+subject).
   - What's unclear: The requirement says "3x achtereen on a concept" — but we don't track concepts, only subjects.
   - Recommendation: Track stuck at subject level for Phase 5 (sufficient for ADMIN-04 notification). Concept-level tracking would require Koko to tag which concept is being practiced — a Phase 6 feature.

4. **Clearing assessment_completed for re-assessment**
   - What we know: Once `assessment_completed = true`, the child skips the assessment
   - What's unclear: Who can trigger a re-assessment (parent, admin, child)?
   - Recommendation: Allow parent to request re-assessment via a Server Action that sets `assessment_completed = false`. Out of scope for Phase 5; add in Phase 7 when building the parent portal.

---

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis: `session-manager.ts`, `difficulty-adjuster.ts`, `response-analyzer.ts`, `system-prompts.ts`, `route.ts`, `tutoring.ts` — all read directly from project files
- Existing migration `006_tutoring_tables.sql` — confirms schema conventions (RLS pattern, JSONB metadata, CASCADE deletes)
- [Supabase Postgres Triggers docs](https://supabase.com/docs/guides/database/postgres/triggers) — confirmed trigger pattern for conditional flagging

### Secondary (MEDIUM confidence)
- [Computerized Adaptive Testing overview](https://assess.com/computerized-adaptive-testing/) — confirmed binary-search ±1 CAT algorithm for short placement tests
- [Wikipedia: Computerized adaptive testing](https://en.wikipedia.org/wiki/Computerized_adaptive_testing) — confirmed "start at medium difficulty" is standard CAT practice
- [AI-driven formative assessment — arXiv 2025](https://arxiv.org/html/2509.20369v1) — confirms LLM-powered conversational assessment is viable and effective
- [Tailwind CSS Progress components](https://flowbite.com/docs/components/progress/) — confirmed Tailwind sufficient for progress bar visualization without additional library

### Tertiary (LOW confidence — verify in implementation)
- Educational AI research on "assessment mode vs tutoring mode" prompt patterns — no single authoritative source found; pattern extrapolated from LPITutor and similar systems. The `[ASSESSMENT_DONE:level=X]` signal approach is a design decision, not a documented standard.
- The exact number of questions (5-7) for reliable placement — based on general CAT research. With only 5 difficulty levels, 5-7 questions gives sufficient discrimination but is not formally validated for this specific use case.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all existing in project
- Schema design: HIGH — directly extrapolated from existing Phase 4 schema conventions
- Assessment prompt pattern: MEDIUM — based on CAT algorithm research + educational AI studies; `[ASSESSMENT_DONE]` signal is a design decision
- Stuck detection integration: HIGH — consecutive_incorrect already tracked; only need flag write
- Progress visualization: HIGH — pure Tailwind CSS; no new dependencies

**Research date:** 2026-02-18
**Valid until:** 2026-04-18 (60 days — stable APIs, no fast-moving dependencies)
