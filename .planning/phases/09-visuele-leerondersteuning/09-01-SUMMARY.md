---
phase: 09-visuele-leerondersteuning
plan: 01
subsystem: ui
tags: [css, animations, clip-path, whiteboard, gpu, accessibility]

# Dependency graph
requires:
  - phase: 08-ui-ux-polish-koko-avatar-time-timer
    provides: globals.css with Koko animations + Whiteboard.tsx component foundation
provides:
  - clip-path reveal-line animation for whiteboard content blocks
  - prefers-reduced-motion support for whiteboard animation
affects: [09-02, 09-03, 09-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CSS clip-path inset() animation for compositor-threaded left-to-right text reveal (not SVG stroke-dashoffset)"
    - "Animation stagger via inline animationDelay style prop (ms offset per block index)"
    - "Whiteboard blocks receive .whiteboard-line class once visible — CSS handles the animation"

key-files:
  created: []
  modified:
    - aruba-leren/src/app/globals.css
    - aruba-leren/src/components/tutor/Whiteboard.tsx

key-decisions:
  - "clip-path inset() over SVG stroke-dashoffset: compositor-threaded on Android, no layout thrashing"
  - "Animation stagger: sum-block items at (range.start + li) * 80ms, label/text blocks at range.start * 100ms"
  - "visibleLines + setTimeout reveal logic preserved unchanged — CSS animation is additive on top of the existing reveal sequencing"
  - "sum-line (horizontal separator) gets whiteboard-line class for visual consistency even though clip-path on a borderBottom-only div may show minimal effect"

patterns-established:
  - "Pattern: CSS class on reveal — element receives animation class at the moment it becomes visible (not pre-assigned)"
  - "Pattern: prefers-reduced-motion guard in globals.css disables .whiteboard-line animation only, preserving line-by-line sequencing"

# Metrics
duration: 3min
completed: 2026-02-26
---

# Phase 9 Plan 01: Whiteboard Schrijfanimatie Summary

**CSS clip-path left-to-right reveal animation per whiteboard block, GPU-composited for low-end Android with prefers-reduced-motion support**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-26T18:06:21Z
- **Completed:** 2026-02-26T18:08:53Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Replaced instant `transition-opacity` pop-in with `clip-path: inset(0 100% 0 0) → inset(0 0% 0 0)` left-to-right writing effect
- All 4 whiteboard block types (sum-line, sum-number, label, plain text) now animate with staggered delays
- `prefers-reduced-motion` guard disables the within-line animation while preserving line-by-line reveal order
- Build passes without TypeScript errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Voeg @keyframes reveal-line toe aan globals.css** - `8a1a3cf` (feat)
2. **Task 2: Pas Whiteboard.tsx aan — clip-path animatie per blok bij reveal** - `a92670f` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `aruba-leren/src/app/globals.css` - Added `@keyframes reveal-line`, `.whiteboard-line` class, and `prefers-reduced-motion` guard
- `aruba-leren/src/components/tutor/Whiteboard.tsx` - Replaced `transition-opacity duration-300` with `whiteboard-line` + `animationDelay` style on all 4 visible block types

## Decisions Made

- Used `clip-path: inset()` instead of SVG `stroke-dashoffset` — compositor-threaded on Android, works reliably on low-end devices without requiring SVG-based text rendering
- Stagger delay formula: sum-block items use `(range.start + li) * 80ms` (tighter, per-line within block), label/text blocks use `range.start * 100ms` (looser, per-block)
- Did not modify `visibleLines` state or `setTimeout` reveal logic — CSS animation is purely additive to the existing sequencing mechanism
- `animation-fill-mode: both` on `.whiteboard-line` ensures elements don't flash before animation starts

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Whiteboard schrijfanimatie is live and GPU-composited
- Ready for 09-02 (next visual learning enhancement plan)
- No blockers

## Self-Check: PASSED

- FOUND: aruba-leren/src/app/globals.css
- FOUND: aruba-leren/src/components/tutor/Whiteboard.tsx
- FOUND: .planning/phases/09-visuele-leerondersteuning/09-01-SUMMARY.md
- FOUND: commit 8a1a3cf (Task 1)
- FOUND: commit a92670f (Task 2)
- FOUND: commit a503f3f (docs)

---
*Phase: 09-visuele-leerondersteuning*
*Completed: 2026-02-26*
