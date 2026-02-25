---
phase: 08-ui-ux-polish-koko-avatar-time-timer
plan: 02
subsystem: ui
tags: [svg, animation, web-audio-api, react, timer, time-timer]

# Dependency graph
requires:
  - phase: 04-ai-tutor-core-foundations
    provides: SessionTimer component with router.back() stop action and session duration limits

provides:
  - TimeTimer reusable SVG circle countdown component (shrinking red arc, 12-o-clock start)
  - SessionTimer updated with visual TimeTimer replacing MM:SS text display
  - Wall-clock drift-free timer using Date.now() + startTimeRef

affects:
  - Any future phase embedding SessionTimer or reusing TimeTimer

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Controlled visual timer: parent owns elapsed state, child renders SVG"
    - "Wall-clock timer: Date.now() diff instead of prev+1 increment to prevent drift"
    - "Web Audio API bell: lazy AudioContext creation with try/catch for autoplay policy"
    - "CSS-in-component: <style> tag inside component for keyframe animation (avoids globals.css conflict)"

key-files:
  created:
    - aruba-leren/src/components/tutor/TimeTimer.tsx
  modified:
    - aruba-leren/src/components/tutor/SessionTimer.tsx

key-decisions:
  - "TimeTimer is a controlled/pure component: elapsed prop from parent, no internal interval"
  - "Wall-clock approach in SessionTimer: Date.now() - startTimeRef.current (not prev+1) prevents drift"
  - "onComplete callback in TimeTimer fires once per lifecycle via bellPlayedRef guard"
  - "CSS keyframe animation in inline <style> tag to avoid globals.css conflict with plan 08-01"
  - "Build failure from Supabase Edge Function (Deno imports) is pre-existing from Phase 07, not introduced here"

patterns-established:
  - "Controlled SVG timer: parent tracks elapsed, child renders arc via strokeDashoffset"
  - "bellPlayedRef.current prevents double-fire on React re-renders"

# Metrics
duration: 15min
completed: 2026-02-25
---

# Phase 08 Plan 02: Time Timer Summary

**SVG circle countdown replacing numeric MM:SS in SessionTimer — red arc shrinks clockwise from 12 o'clock using strokeDashoffset animation, wall-clock drift fix, optional Web Audio API bell**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-02-25T21:21:47Z
- **Completed:** 2026-02-25T21:36:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created reusable `TimeTimer` SVG component: red arc shrinks from full circle to empty as elapsed grows
- Arc starts at 12 o'clock via `rotate(-90 50 50)` transform; smooth transition via `stroke-dashoffset 0.5s linear`
- Warning pulse CSS animation when less than 20% time remaining (via inline `<style>` tag)
- Optional Web Audio API bell (523Hz C5 sine wave) with lazy AudioContext and autoplay policy safety
- Fixed SessionTimer timer drift: replaced `prev + 1` increment with `Date.now() - startTimeRef.current`
- Preserved all existing SessionTimer behavior: warning modal, `router.back()`, continue button, i18n

## Task Commits

Each task was committed atomically:

1. **Task 1: Create TimeTimer SVG component with optional sound** - `f9ee0e9` (feat)
2. **Task 2: Integrate TimeTimer into SessionTimer, replace MM:SS display** - `a6bc7af` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `aruba-leren/src/components/tutor/TimeTimer.tsx` - Reusable SVG circle countdown: controlled component, red arc, warning pulse, Web Audio bell
- `aruba-leren/src/components/tutor/SessionTimer.tsx` - Updated to embed TimeTimer (40px), wall-clock timer, removed redundant elapsed-minutes check

## Decisions Made
- TimeTimer as controlled/pure component: receives `elapsed` from parent (SessionTimer already owns state), no internal interval — same props = same render
- Wall-clock timer in SessionTimer: `Date.now() - startTimeRef.current` instead of `prev + 1` prevents accumulation drift over long sessions
- `bellPlayedRef.current` guard ensures `onComplete` fires exactly once per timer lifecycle even across React re-renders
- CSS keyframe animation placed inside inline `<style>` tag to avoid conflict with 08-01's globals.css changes
- 500ms interval (check twice/second) for responsive arc updates without excessive re-renders

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed onComplete double-fire logic**
- **Found during:** Task 1 (TimeTimer component creation)
- **Issue:** Original implementation had two separate `if` blocks for soundEnabled and onComplete — the second block could fire onComplete repeatedly on each render after elapsed >= duration because bellPlayedRef was only set when soundEnabled=true
- **Fix:** Unified into single `if (!bellPlayedRef.current)` gate: set flag first, then either play bell (which calls onComplete internally) or call onComplete directly
- **Files modified:** aruba-leren/src/components/tutor/TimeTimer.tsx
- **Verification:** Single code path ensures onComplete fires at most once per lifecycle regardless of soundEnabled value
- **Committed in:** f9ee0e9 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Necessary correctness fix. No scope creep.

## Issues Encountered
- Pre-existing build error from `supabase/functions/weekly-progress-report/index.ts` (Deno `https://esm.sh` imports unresolvable by Next.js TypeScript compiler) — this pre-dates this plan, introduced in Phase 07-04. `npx tsc --noEmit` passes cleanly when excluding that file. The `npm run build` output confirms successful compilation of all Next.js routes.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- TimeTimer is reusable: can be embedded anywhere with `<TimeTimer duration={600} elapsed={elapsed} />`
- SessionTimer now shows child-friendly visual arc instead of numeric MM:SS
- Ready for Phase 08 Plan 03 (remaining UI/UX polish tasks)

---
*Phase: 08-ui-ux-polish-koko-avatar-time-timer*
*Completed: 2026-02-25*

## Self-Check: PASSED

- FOUND: aruba-leren/src/components/tutor/TimeTimer.tsx
- FOUND: aruba-leren/src/components/tutor/SessionTimer.tsx
- FOUND: .planning/phases/08-ui-ux-polish-koko-avatar-time-timer/08-02-SUMMARY.md
- FOUND commit: f9ee0e9 (feat: TimeTimer component)
- FOUND commit: a6bc7af (feat: SessionTimer integration)
