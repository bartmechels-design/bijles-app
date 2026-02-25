---
phase: 08-ui-ux-polish-koko-avatar-time-timer
plan: 01
subsystem: tutor-ui
tags: [koko-avatar, svg, animation, accessibility, 3d-gradients, surprised-emotion]
dependency_graph:
  requires: []
  provides: [koko-3d-avatar, surprised-emotion, prefers-reduced-motion-guard]
  affects: [KokoAvatar, useKokoState, globals.css]
tech_stack:
  added: []
  patterns: [radialGradient-svg, prefers-reduced-motion, transform-opacity-only-animations]
key_files:
  created:
    - aruba-leren/src/types/koko.ts
    - aruba-leren/src/hooks/useKokoState.ts
    - aruba-leren/src/components/tutor/KokoAvatar.tsx
  modified:
    - aruba-leren/src/app/globals.css
    - aruba-leren/tsconfig.json
decisions:
  - "Surprised detection placed between happy and encouraging — priority order: happy > surprised > encouraging"
  - "radialGradient refs on SVG stroke require gradientUnits userSpaceOnUse for correct rendering on paths"
  - "tsconfig.json: exclude supabase/functions to prevent Deno URL imports from failing Next.js build (pre-existing blocker)"
  - "Surprised sparkle stars use SVG text elements with ✦ — no external assets, no filters"
metrics:
  duration: 6 minutes
  completed: 2026-02-25
  tasks_completed: 2
  files_modified: 5
---

# Phase 8 Plan 01: Koko Avatar 3D Upgrade & Surprised Emotion Summary

**One-liner:** 3D-style Koko avatar with radial gradients and 7th emotion (surprised) with sparkle stars, jump animation, and full prefers-reduced-motion guard.

## What Was Built

Upgraded the Koko monkey avatar from flat SVG fills to a 3D appearance using SVG radialGradient definitions, and added a 7th emotion (surprised) with unique visual treatment. All existing and new animations are protected by a prefers-reduced-motion media query guard.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add surprised emotion type and detection | 6f79500 | koko.ts, useKokoState.ts |
| 2 | Upgrade KokoAvatar SVG to 3D + surprised | 9f0f9d7 | KokoAvatar.tsx, globals.css, tsconfig.json |

## Decisions Made

1. **Emotion detection priority order:** happy > surprised > encouraging — surprised triggers on rare wow/wauw expressions, which occur naturally after correct answers following an incorrect streak.

2. **tsconfig exclusion of supabase/functions:** The Next.js build was already failing before this plan due to Deno URL imports in the Edge Function. Added `"supabase/functions"` to tsconfig `exclude` array (Rule 3 — blocking issue fix).

3. **SVG radialGradient for 3D depth:** Four gradients defined (kokoHeadGrad, kokoFaceGrad, kokoBodyGrad, kokoEarGrad) each with lighter highlight at top-left and darker shadow tone at 100%. No SVG `<filter>` elements used (performance constraint for low-end Android).

4. **Sparkle stars as SVG text elements:** Used `✦` Unicode character — no external assets, no filter blurs, GPU-safe animation via transform/opacity only.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed pre-existing tsconfig build failure**
- **Found during:** Task 2 verification (npm run build)
- **Issue:** `supabase/functions/weekly-progress-report/index.ts` imports Deno URLs (`https://esm.sh/`) — tsconfig did not exclude this directory, causing Next.js TypeScript build to fail
- **Fix:** Added `"supabase/functions"` to `"exclude"` array in `aruba-leren/tsconfig.json`
- **Files modified:** aruba-leren/tsconfig.json
- **Commit:** 9f0f9d7 (included in task 2 commit)

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` (app code) | PASS — 0 errors |
| `npm run build` | PASS — compiled successfully |
| radialGradient in KokoAvatar.tsx | PASS — 8 occurrences (4 defs + 4 refs) |
| surprised mouth + stars in KokoAvatar.tsx | PASS — lines 145, 180-183 |
| koko-surprised CSS in globals.css | PASS — 7 occurrences |
| prefers-reduced-motion guard in globals.css | PASS — line 202 |
| 'surprised' in koko.ts union type | PASS |
| SURPRISED_WORDS + detection in useKokoState.ts | PASS — lines 7, 17-18 |

## Self-Check: PASSED

All 5 key files exist on disk. Both task commits (6f79500, 9f0f9d7) verified in git log.
