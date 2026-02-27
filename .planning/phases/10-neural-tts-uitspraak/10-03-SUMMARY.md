---
phase: 10-neural-tts-uitspraak
plan: "03"
subsystem: ui
tags: [tts, papiamento, react, next-intl, locale, accessibility]

# Dependency graph
requires:
  - phase: 10-01
    provides: useTextToSpeech hook (OpenAI TTS API) already in place
provides:
  - Papiamento locale permanently disables TTS auto-speak
  - "Alleen lezen" amber badge in ChatInterface header for pap locale
  - Voice-first toggle button hidden for Papiamento users
affects:
  - 10-04

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "locale === 'pap' guard before TTS calls — no OpenAI Papiamento voice exists"
    - "isPapiamento boolean derived at component top-level, propagated to useCallback deps"

key-files:
  created: []
  modified:
    - aruba-leren/src/components/tutor/ChatInterface.tsx

key-decisions:
  - "isPapiamento derived from locale prop, not from TTS hook — keeps UI logic in component layer"
  - "Voice toggle button fully hidden for Papiamento (not just disabled) — no confusing inactive button"
  - "Alleen lezen badge uses amber color + book icon — visually distinct from sky-blue voice toggle"
  - "isPapiamento added to autoSpeak useCallback dependency array — ESLint exhaustive-deps compliant"

patterns-established:
  - "Locale-based feature gates: isPapiamento pattern reusable for other locale-specific restrictions"

# Metrics
duration: 2min
completed: 2026-02-27
---

# Phase 10 Plan 03: Papiamento uitspraakmodus — "Alleen lezen" badge Summary

**Papiamento locale permanently disables OpenAI TTS auto-speak and replaces the voice toggle with an amber "Alleen lezen" badge (book icon) in ChatInterface header**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-27T12:08:37Z
- **Completed:** 2026-02-27T12:10:51Z
- **Tasks:** 1 (with 3 sub-changes A/B/C)
- **Files modified:** 1

## Accomplishments

- Added `isPapiamento` boolean derived from `locale === 'pap'` directly after existing `isVoiceFirst` line
- Blocked `autoSpeak` callback for Papiamento with early return, added `isPapiamento` to useCallback dependency array
- Voice-first toggle button now hidden when `isPapiamento` is true (condition: `subject !== 'begrijpend_lezen' && !isPapiamento`)
- "Alleen lezen" amber badge with book SVG icon rendered when `isPapiamento && subject !== 'begrijpend_lezen'`
- Build passes with zero TypeScript errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Voeg Papiamento TTS-blokkering toe aan ChatInterface.tsx** - `92d916d` (feat)

**Plan metadata:** (created after this summary)

## Files Created/Modified

- `aruba-leren/src/components/tutor/ChatInterface.tsx` - Added isPapiamento detection, autoSpeak guard, conditional voice toggle hide, Alleen lezen badge

## Decisions Made

- `isPapiamento` derived from `locale` prop in the component (not inside the TTS hook) — keeps locale-gating in the UI layer where it belongs, hook remains generic
- Voice toggle fully hidden (not disabled) for Papiamento — a disabled button would be confusing since there's no path to enabling it
- Amber color for the badge matches the existing amber-themed informational UI elements (assessment banner, huiswerk banner)
- `isPapiamento` added to `autoSpeak` useCallback deps — ESLint exhaustive-deps rule compliance, no stale closures

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Papiamento TTS blocking complete — locale 'pap' never triggers OpenAI TTS calls
- Ready for Phase 10-04 (remaining neural TTS plan)

## Self-Check

- [x] `aruba-leren/src/components/tutor/ChatInterface.tsx` modified — FOUND
- [x] Commit `92d916d` exists — FOUND
- [x] Build passes — VERIFIED (npm run build clean output)

## Self-Check: PASSED

---
*Phase: 10-neural-tts-uitspraak*
*Completed: 2026-02-27*
