---
phase: 05-baseline-assessment-progress-tracking
plan: 02
subsystem: api
tags: [assessment, chat, streaming, session-type, stuck-detection, progress-tracking, CAT]

# Dependency graph
requires:
  - phase: 05-01
    provides: finishAssessment(), updateStuckFlag(), recordProgressEvent(), createAssessmentSession(), child_subject_progress table, progress_events table

provides:
  - buildAssessmentPrompt() function in system-prompts.ts (CAT algorithm, 5-7 questions, no hints, [ASSESSMENT_DONE] signal)
  - Chat API assessment session support: isAssessment flag, assessment prompt selection, [ASSESSMENT_DONE] detection
  - Stuck detection block in onFinish (3x consecutive incorrect -> updateStuckFlag)
  - Level change tracking in onFinish (tutoring only -> recordProgressEvent)
  - getActiveSession() filters by session_type='tutoring' (prevents mixing)
  - getActiveAssessmentSession() for assessment page use
  - Assessment entry page at /assessment/[childId]/[subject]
  - ChatInterface sessionType prop + assessment mode banner + completion UI

affects: [06-advanced-tutor, ui, assessment-flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "isAssessment closure capture: compute isAssessment before onFinish so closure captures it from outer scope"
    - "Signal stripping: [ASSESSMENT_DONE:level=X] stripped from visible text before rendering (same as [SPREEK] blocks)"
    - "Assessment idempotency: finishAssessment() called safely from onFinish (which may fire twice) — idempotent by design from 05-01"
    - "Non-fatal error wrapping: assessment/stuck/progress calls in try/catch to never break streaming response"

key-files:
  created:
    - aruba-leren/src/app/[locale]/assessment/[childId]/[subject]/page.tsx
  modified:
    - aruba-leren/src/lib/ai/prompts/system-prompts.ts
    - aruba-leren/src/app/[locale]/api/tutor/chat/route.ts
    - aruba-leren/src/lib/tutoring/session-manager.ts
    - aruba-leren/src/components/tutor/ChatInterface.tsx

key-decisions:
  - "isAssessment derived inside route.ts from currentSession.session_type — closure captures outer variable, accessible in onFinish"
  - "Assessment sessions skip difficulty adjustment — Koko manages level internally via CAT algorithm in prompt"
  - "Stuck detection runs for both assessment and tutoring sessions (not assessment-only)"
  - "Level change tracking (recordProgressEvent) only runs for tutoring sessions — assessment level is set once via finishAssessment"
  - "ChatInterface strips [ASSESSMENT_DONE] from visible text using same regex-replace pattern as [SPREEK]"
  - "Assessment completion banner auto-navigates via router.push to tutoring page"

patterns-established:
  - "Signal pattern: Koko emits [SIGNAL:param=value] in text, route.ts detects in onFinish, ChatInterface strips from visible content"
  - "Session type branching: single route handles both session types, branches on isAssessment flag"

# Metrics
duration: 15min
completed: 2026-02-19
---

# Phase 5 Plan 02: Assessment Wiring Summary

**Koko assessment flow wired end-to-end: [ASSESSMENT_DONE:level=X] signal detected in chat API, level persisted to child_subject_progress, stuck detection active, ChatInterface shows assessment mode banner and completion UI with navigation to tutoring.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-02-19
- **Completed:** 2026-02-19
- **Tasks:** 2
- **Files modified:** 5 (4 modified + 1 created)

## Accomplishments

- Chat API now detects `[ASSESSMENT_DONE:level=X]` in Koko's response and calls `finishAssessment()` to persist the determined level
- Stuck detection (3+ consecutive incorrect answers) triggers `updateStuckFlag(true)` for both assessment and tutoring sessions
- Level changes in tutoring sessions are recorded to progress_events ledger via `recordProgressEvent()`
- Assessment entry page at `/assessment/[childId]/[subject]` handles auth, ownership, completed-redirect, session create/resume, and renders ChatInterface in assessment mode
- ChatInterface shows amber "Beginsituatietoets" banner during assessment and green completion banner with "Ga naar de les" navigation button

## Task Commits

Each task was committed atomically:

1. **Task 1: Assessment prompt + session_type filtering + assessment page** - `8611450` (feat)
2. **Task 2: Chat API integration — assessment detection, stuck detection, level tracking** - `90091f6` (feat)

**Plan metadata:** (committed at SUMMARY creation)

## Files Created/Modified

- `aruba-leren/src/app/[locale]/assessment/[childId]/[subject]/page.tsx` - Assessment entry page (server component): auth, ownership check, completed-redirect, session create/resume, ChatInterface render
- `aruba-leren/src/lib/ai/prompts/system-prompts.ts` - Added `buildAssessmentPrompt()`: CAT algorithm, 5-7 questions, no hints, kid-friendly level names, [ASSESSMENT_DONE] signal instructions
- `aruba-leren/src/app/[locale]/api/tutor/chat/route.ts` - isAssessment flag, assessment prompt selection, 3 new onFinish blocks (assessment detection, stuck detection, level tracking)
- `aruba-leren/src/lib/tutoring/session-manager.ts` - `getActiveSession()` filters session_type='tutoring'; added `getActiveAssessmentSession()`; explicit `session_type: 'tutoring'` in `createSession()`
- `aruba-leren/src/components/tutor/ChatInterface.tsx` - `sessionType` prop, assessment mode banner (amber), completion banner (green) with router.push, [ASSESSMENT_DONE] signal stripping

## Decisions Made

- `isAssessment` computed outside onFinish closure so it's captured correctly in the async callback
- Assessment sessions skip the difficulty adjuster (`adjustDifficulty()`) — Koko manages difficulty internally via the CAT prompt algorithm
- Stuck detection fires for both session types to ensure stuck children are always flagged regardless of mode
- `recordProgressEvent()` is tutoring-only — assessment level is set once as a batch via `finishAssessment()`, not incrementally
- [ASSESSMENT_DONE] signal stripped from visible text using the same regex-replace approach as [SPREEK] blocks

## Deviations from Plan

None - plan executed exactly as written. All code was pre-staged from a previous session and matched the plan spec. TypeScript check passed clean.

## Issues Encountered

None. Both task commits were clean with no TypeScript errors.

## User Setup Required

None - no external service configuration required. (User still needs to run SQL migration 007 from plan 05-01 before end-to-end testing.)

## Next Phase Readiness

- Assessment flow complete: child visits /assessment/[childId]/[subject] -> Koko asks questions -> [ASSESSMENT_DONE] detected -> level persisted -> completion UI shown
- Stuck detection and level change tracking both active
- Ready for Phase 5 plan 03 (progress dashboard / parent-facing views) or Phase 5 plan 04 (integration testing)
- Blocker: User must run SQL migration 007_assessment_progress_tables.sql in Supabase SQL Editor before end-to-end testing

---
*Phase: 05-baseline-assessment-progress-tracking*
*Completed: 2026-02-19*

## Self-Check: PASSED

- FOUND: aruba-leren/src/app/[locale]/assessment/[childId]/[subject]/page.tsx
- FOUND: aruba-leren/src/lib/ai/prompts/system-prompts.ts (buildAssessmentPrompt exported)
- FOUND: aruba-leren/src/app/[locale]/api/tutor/chat/route.ts (ASSESSMENT_DONE, finishAssessment, updateStuckFlag, recordProgressEvent)
- FOUND: aruba-leren/src/lib/tutoring/session-manager.ts (session_type filtering)
- FOUND: aruba-leren/src/components/tutor/ChatInterface.tsx (sessionType prop, banners)
- FOUND: .planning/phases/05-baseline-assessment-progress-tracking/05-02-SUMMARY.md
- FOUND: commit 8611450 (Task 1)
- FOUND: commit 90091f6 (Task 2)
- TypeScript: npx tsc --noEmit passes with 0 errors
- ASSESSMENT_DONE regex: matches level=1 through level=5
