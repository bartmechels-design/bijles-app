---
phase: 07-parent-portal-admin-monitoring
plan: 01
subsystem: ui
tags: [nextjs, supabase, progress-tracking, dashboard, server-components]

# Dependency graph
requires:
  - phase: 05-baseline-assessment-progress-tracking
    provides: child_subject_progress table, progress_events table, ChildSubjectProgress type, SubjectProgress component
  - phase: 03-payment-verification-system
    provides: subscription check in dashboard (hasActiveSubscription pattern)
provides:
  - ProgressSummaryCard component (compact per-child progress for dashboard)
  - Per-child detail page /dashboard/kind/[childId] with full subject breakdown
  - Enhanced dashboard with Voortgang section and Vakantierooster link
  - Batch progress fetch via .in('child_id', childIds) — no N+1 queries
affects:
  - 07-02: vacation schedule feature (linked from dashboard Vakantierooster button)
  - 07-03: admin monitoring (same data model, different UI)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Batch Supabase .in() query for multi-child progress — group by child_id in JS after fetch
    - Server Component ownership check: fetch profile via user_id, then filter child by parent_id=profile.id
    - formatRelativeTime() helper for human-readable dates (Vandaag, Gisteren, X dagen geleden)

key-files:
  created:
    - aruba-leren/src/components/progress/ProgressSummaryCard.tsx
    - aruba-leren/src/app/[locale]/dashboard/kind/[childId]/page.tsx
  modified:
    - aruba-leren/src/app/[locale]/dashboard/page.tsx

key-decisions:
  - "Progress cards rendered only when children exist — no empty state needed in Voortgang section"
  - "Vakantierooster link placed in header action buttons (alongside Abonnement) for persistent visibility"
  - "ProgressSummaryCard shows all 6 subjects always — uses SubjectProgress null state for unstarted subjects"

patterns-established:
  - "Parent ownership gate: .eq('user_id', user.id) → profile.id → .eq('parent_id', profile.id) for child access"
  - "Batch progress fetch: childIds array → single .in() query → group by child_id in memory"

# Metrics
duration: 5min
completed: 2026-02-24
---

# Phase 7 Plan 01: Parent Dashboard Progress Visualization Summary

**Parent dashboard enhanced with per-child ProgressSummaryCard grid and drill-down /dashboard/kind/[childId] detail page, using a single batch Supabase query for all children's progress.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-02-24T21:07:42Z
- **Completed:** 2026-02-24T21:12:00Z
- **Tasks:** 2 (Task 1 pre-existing from prior commit, Task 2 executed now)
- **Files modified:** 3

## Accomplishments

- Created ProgressSummaryCard component showing child name, grade, and SubjectProgress for all 6 subjects, with "Nog geen lessen gevolgd" fallback and "Details >" link to detail page
- Created per-child detail page /dashboard/kind/[childId] with ownership verification (profile.id not user.id), full subject grid, session stats, and recent activity timeline
- Enhanced dashboard with "Voortgang" section (1-col mobile, 2-col desktop grid), Vakantierooster button in header, batch .in() progress query — build passes, both routes present in build output

## Task Commits

1. **Task 1: Create ProgressSummaryCard and per-child detail page** - `e7e7482` (feat)
2. **Task 2: Enhance parent dashboard with progress data and cards** - `32235c3` (feat)

**Plan metadata:** see final commit below

## Files Created/Modified

- `aruba-leren/src/components/progress/ProgressSummaryCard.tsx` - Compact progress card per child; shows all 6 subjects using SubjectProgress, links to detail page
- `aruba-leren/src/app/[locale]/dashboard/kind/[childId]/page.tsx` - Server Component detail page; authenticates, verifies child ownership via profile.id, shows subject grid + recent activity
- `aruba-leren/src/app/[locale]/dashboard/page.tsx` - Enhanced with Voortgang section (ProgressSummaryCard grid), Vakantierooster header link, batch progress fetch

## Decisions Made

- Progress cards rendered only when children.length > 0 — avoids empty Voortgang header with no content
- Vakantierooster link placed in header buttons (flex-wrap for mobile) alongside Abonnement and logout
- ProgressSummaryCard always renders all 6 subjects — SubjectProgress handles the "Toets nodig" state for subjects without assessment data

## Deviations from Plan

None - plan executed exactly as written. Task 1 was pre-committed in a prior session; Task 2 completed the dashboard integration.

## Issues Encountered

None. TypeScript check passed clean, build succeeded with both `/[locale]/dashboard` and `/[locale]/dashboard/kind/[childId]` routes present.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Parent progress visibility complete (OUDER-01 done)
- Add/edit children still works (OUDER-02 preserved)
- Subscription link still works (OUDER-03 preserved)
- Vakantierooster link ready for Plan 07-02 (vacation schedule feature)
- Per-child detail page ready for enrichment in future phases (e.g., homework history, Koko chat logs)

---
*Phase: 07-parent-portal-admin-monitoring*
*Completed: 2026-02-24*

## Self-Check: PASSED

- FOUND: aruba-leren/src/components/progress/ProgressSummaryCard.tsx
- FOUND: aruba-leren/src/app/[locale]/dashboard/kind/[childId]/page.tsx
- FOUND: .planning/phases/07-parent-portal-admin-monitoring/07-01-SUMMARY.md
- FOUND: commit e7e7482 (Task 1)
- FOUND: commit 32235c3 (Task 2)
