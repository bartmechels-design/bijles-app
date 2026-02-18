---
phase: 04-ai-tutor-core-foundations
plan: 04
subsystem: api
tags: [adaptive-difficulty, response-analysis, i18n, streaming-api]

# Dependency graph
requires:
  - phase: 04-02
    provides: "difficulty-adjuster.ts with recordAnswer() and adjustDifficulty() pure functions"
  - phase: 04-03
    provides: "streaming chat route onFinish callback and session metadata infrastructure"
provides:
  - "Heuristic NL/PAP/ES response analyzer that detects correct answers, incorrect answers, and hints"
  - "recordAnswer() wired into onFinish — consecutive_correct/consecutive_incorrect/total_hints_given now actually increment"
  - "Message metadata includes was_correct, hints_given, difficulty_at_time for auditability"
  - "Hard-coded 'Start bijles'/'Start les' strings replaced with i18n keys"
affects: [phase-05, phase-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Heuristic pattern matching with case-insensitive regex alternation for multilingual signal detection"
    - "Pure analysis function (no side effects) called inside async callback, results merged before single DB write"
    - "Null-as-indeterminate pattern: wasCorrect=null skips recordAnswer, avoiding false counter increments on neutral responses"

key-files:
  created:
    - "aruba-leren/src/lib/tutoring/response-analyzer.ts"
  modified:
    - "aruba-leren/src/app/[locale]/api/tutor/chat/route.ts"
    - "aruba-leren/src/app/[locale]/tutor/page.tsx"
    - "aruba-leren/src/components/tutor/SubjectSelector.tsx"

key-decisions:
  - "Null-as-indeterminate for wasCorrect: when neither praise nor correction patterns match, skip recordAnswer entirely to avoid noise from questions/greetings"
  - "Ambiguous case (both correct+incorrect patterns match): treat as indeterminate (null) rather than guessing"
  - "Single updateSessionMetadata call in onFinish combining all updates (messages, tokens, answer counters, hints) to minimize DB round-trips"
  - "analyzeKokoResponse called before saveMessage so analysis result is available in message metadata for auditability"

patterns-established:
  - "Response analysis: pure function -> analyze -> merge -> single DB write (no intermediate saves)"
  - "i18n: server components use t('namespace.key'), client components with namespace use t('key')"

# Metrics
duration: 8min
completed: 2026-02-18
---

# Phase 4 Plan 4: Gap Closure — Response Analyzer and i18n Fixes Summary

**Heuristic multilingual response analyzer (NL/PAP/ES) wired into chat onFinish to increment adaptive difficulty counters, plus i18n replacement of 3 hard-coded Dutch UI strings**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-18T18:23:22Z
- **Completed:** 2026-02-18T18:31:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created `response-analyzer.ts` with `analyzeKokoResponse()` detecting praise (correct), correction (incorrect), and hint patterns across Dutch, Papiamento, and Spanish
- Wired `recordAnswer()` into the chat route's `onFinish` callback — consecutive_correct/consecutive_incorrect/total_hints_given counters now actually increment (previously always 0)
- Added message metadata persistence: `was_correct`, `hints_given`, `difficulty_at_time` saved per assistant message for auditability
- Replaced all 3 hard-coded Dutch strings ("Start bijles", "Start les" x2) with i18n keys (`tutor.startSession`)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create response analyzer and wire recordAnswer() into chat route onFinish** - `280f08e` (feat)
2. **Task 2: Replace hard-coded Dutch strings with i18n keys in tutor pages** - `2dcf224` (feat)

**Plan metadata:** committed in final docs commit

## Files Created/Modified

- `aruba-leren/src/lib/tutoring/response-analyzer.ts` - Pure function `analyzeKokoResponse(text)` with NL/PAP/ES regex patterns for praise, correction, and hint detection
- `aruba-leren/src/app/[locale]/api/tutor/chat/route.ts` - Added imports for `recordAnswer` and `analyzeKokoResponse`; rewired `onFinish` with analysis logic, single combined `updateSessionMetadata` call
- `aruba-leren/src/app/[locale]/tutor/page.tsx` - Replaced `"Start bijles"` with `{t('tutor.startSession')}`
- `aruba-leren/src/components/tutor/SubjectSelector.tsx` - Replaced both `"Start les"` with `{t('startSession')}`

## Decisions Made

- **Null-as-indeterminate for wasCorrect:** When neither praise nor correction patterns match (e.g., Koko asking a new question), `wasCorrect` returns `null` and `recordAnswer` is skipped entirely. This avoids inflating/deflating counters on neutral responses.
- **Ambiguous pattern handling:** If both correct AND incorrect patterns match in the same response (edge case), treat as indeterminate rather than guessing. Correctness.
- **Single DB write in onFinish:** All metadata updates (total_messages, tokens_used, answer counters, hints) combined into one `updateSessionMetadata` call at the end of `onFinish`, reducing DB round-trips from 2 to 1.
- **Analysis before saveMessage:** `analyzeKokoResponse(text)` is called first in `onFinish` so the analysis result is available for message metadata persistence (`was_correct`, `hints_given`, `difficulty_at_time`).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Adaptive difficulty loop is now fully end-to-end: Koko responses are analyzed, counters increment, and `adjustDifficulty()` on the NEXT request reads fresh counters and triggers level changes at thresholds (3 consecutive correct = harder, 3+ hints = easier)
- Phase 4 complete — all 4 plans executed and verified
- Ready for Phase 5 planning

---

## Self-Check: PASSED

Files exist on disk:
- FOUND: aruba-leren/src/lib/tutoring/response-analyzer.ts
- FOUND: aruba-leren/src/app/[locale]/api/tutor/chat/route.ts (modified)
- FOUND: aruba-leren/src/app/[locale]/tutor/page.tsx (modified)
- FOUND: aruba-leren/src/components/tutor/SubjectSelector.tsx (modified)

Commits exist:
- FOUND: 280f08e — feat(04-04): create response analyzer and wire recordAnswer into onFinish
- FOUND: 2dcf224 — feat(04-04): replace hard-coded Dutch strings with i18n keys

---
*Phase: 04-ai-tutor-core-foundations*
*Completed: 2026-02-18*
