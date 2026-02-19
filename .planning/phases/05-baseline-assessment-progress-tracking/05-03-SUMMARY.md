---
phase: 05-baseline-assessment-progress-tracking
plan: 03
subsystem: ui
tags: [react, tailwind, progress, assessment-gate, next-intl, typescript]

# Dependency graph
requires:
  - phase: 05-01
    provides: getAllSubjectProgress() server function, ChildSubjectProgress type, LEVEL_NAMES constant
  - phase: 05-02
    provides: assessment entry page at /assessment/[childId]/[subject]
provides:
  - ProgressBar component (accessible Tailwind level 1-5 bar)
  - LevelBadge component (locale-aware kid-friendly badge with emoji)
  - SubjectProgress component (combined card element: toets-nodig or level+bar+stuck)
  - SubjectSelector with assessment gate (routes to /assessment/ or /tutor/ based on progress)
  - Subject selection page fetches progress server-side and passes progressMap to SubjectSelector
affects: [phase-06-advanced-ai, phase-07-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ProgressBar uses role=progressbar with aria-valuenow/min/max for accessibility"
    - "LevelBadge reads LEVEL_NAMES from types/progress.ts — single source of truth for locale names"
    - "Server component fetches getAllSubjectProgress(), builds Record<string, ChildSubjectProgress>, passes to client component as prop"
    - "Assessment gate: progress?.assessment_completed === true determines link destination in SubjectSelector"

key-files:
  created:
    - aruba-leren/src/components/progress/ProgressBar.tsx
    - aruba-leren/src/components/progress/LevelBadge.tsx
    - aruba-leren/src/components/progress/SubjectProgress.tsx
  modified:
    - aruba-leren/src/components/tutor/SubjectSelector.tsx
    - aruba-leren/src/app/[locale]/tutor/[childId]/page.tsx

key-decisions:
  - "SubjectProgress renders three distinct states: null (toets nodig), assessment_completed=false (toets nodig), assessment_completed=true (level+bar+stuck)"
  - "progressMap keyed by subject string — O(1) lookup in SubjectSelector per subject card"
  - "LevelBadge uses try/catch around t('startAssessment') to gracefully fall back to Dutch if i18n key missing"
  - "renderCard() helper in SubjectSelector avoids duplication between kern and zaak subject loops"

patterns-established:
  - "progress components in src/components/progress/ — dedicated directory for all progress UI"
  - "Server component owns data fetching; client component receives typed progressMap prop"

# Metrics
duration: 10min
completed: 2026-02-19
---

# Phase 5 Plan 03: Progress Visualization & Assessment Gate Summary

**Accessible Tailwind progress components (ProgressBar, LevelBadge, SubjectProgress) wired into SubjectSelector with server-side progress fetch and assessment routing gate**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-02-19
- **Completed:** 2026-02-19
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Created three reusable progress components in `src/components/progress/`: ProgressBar (ARIA-accessible, sky gradient), LevelBadge (locale-aware with emoji+color per level 1-5), SubjectProgress (three-state card element)
- Updated SubjectSelector to show assessment gate: cards link to `/assessment/[childId]/[subject]` when assessment not completed, `/tutor/[childId]/[subject]` when completed; button label switches accordingly
- Updated tutor/[childId]/page.tsx server component to fetch `getAllSubjectProgress()` and pass a `Record<string, ChildSubjectProgress>` progressMap to SubjectSelector

## Task Commits

Each task was committed atomically:

1. **Task 1: Progress visualization components** - `3e495f2` (feat)
2. **Task 2: SubjectSelector assessment gate + progress display** - `e4b590c` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `aruba-leren/src/components/progress/ProgressBar.tsx` - Accessible Tailwind progress bar, level 1-5, sky gradient, ARIA attributes, 500ms transition
- `aruba-leren/src/components/progress/LevelBadge.tsx` - Locale-aware kid-friendly badge (nl/pap/es/en), color+emoji per level, reads LEVEL_NAMES from types
- `aruba-leren/src/components/progress/SubjectProgress.tsx` - Three-state card element: amber "Toets nodig" when assessment missing, level badge+bar+stuck indicator when completed
- `aruba-leren/src/components/tutor/SubjectSelector.tsx` - Added progressMap prop, assessment gate routing, SubjectProgress inside each card, button label switch
- `aruba-leren/src/app/[locale]/tutor/[childId]/page.tsx` - Fetches getAllSubjectProgress() server-side, builds progressMap, passes to SubjectSelector

## Decisions Made

- progressMap keyed by subject string for O(1) lookup per card — no linear scans in render loop
- SubjectProgress handles both null (no row) and assessment_completed=false with the same "Toets nodig" badge — simpler consumer API
- `renderCard()` helper in SubjectSelector deduplicates kern/zaak card rendering
- try/catch around `t('startAssessment')` for graceful fallback to Dutch when i18n key not yet added to message files

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Progress visualization complete. Subject cards now show level/progress state and route correctly based on assessment completion.
- Phase 5 plan 04 (progress dashboard / parent view) can build on these components.
- SQL migration 007 still needs to be run in Supabase SQL Editor before any end-to-end testing.

---
*Phase: 05-baseline-assessment-progress-tracking*
*Completed: 2026-02-19*
