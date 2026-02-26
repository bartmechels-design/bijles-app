---
phase: 09-visuele-leerondersteuning
plan: 04
subsystem: ui
tags: [canvas, drawing, scratchpad, supabase-storage, rls, rekenen, system-prompts]

# Dependency graph
requires:
  - phase: 09-visuele-leerondersteuning
    provides: KaTeX wiskundige notatie + MATH_FORMAT_RULES (09-02)
  - phase: 09-visuele-leerondersteuning
    provides: ZinsontledingPanel wiring in ChatInterface (09-03)
provides:
  - Digital scratchpad canvas component (Scratchpad.tsx) for rekenen sessions
  - Auto-show logic in ChatInterface: boardContent trigger + mount-time page-reload restore
  - Supabase storage bucket 'scratchpads' with parent RLS (viewing UI in Phase 11)
  - KOKO_BASE_PROMPT kladblaadje reminder section
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PointerEvent-based canvas drawing: setPointerCapture + moveTo/lineTo with round cap/join"
    - "Canvas resize pattern: save imageData → resize → fill background → putImageData (best-effort restore)"
    - "isVisible controlled pattern: no close button on Scratchpad — parent owns visibility via showScratchpad state"
    - "Mount-time restore pattern: empty dependency array useEffect scans initial messages for hasBordBlocks()"
    - "canvas.toBlob() → supabase.storage.upload() with hasContent guard"

key-files:
  created:
    - aruba-leren/src/components/tutor/Scratchpad.tsx
    - aruba-leren/supabase/migrations/011_scratchpads.sql
  modified:
    - aruba-leren/src/components/tutor/ChatInterface.tsx
    - aruba-leren/src/lib/ai/prompts/system-prompts.ts

key-decisions:
  - "Migration numbered 011 (not 010) — 010_weekly_email_cron.sql already exists in migrations directory"
  - "showScratchpad has no dismiss path — header has no close button, isVisible is parent-controlled state with no setter exposed to Scratchpad"
  - "Mount-time useEffect uses [] intentionally — scans messages at initial render for page-reload restore without re-running on every message update"
  - "Scratchpad positioned between messages area and input bar — always in viewport while child types"
  - "Parent viewing UI for scratchpad images scoped to Phase 11 — RLS policies in place, bucket is private"
  - "clearCanvas redraws grid after fill — grid preserved after wis action for visual consistency"

patterns-established:
  - "Pattern: non-dismissible panel via parent-controlled isVisible without close button"
  - "Pattern: canvas resize with imageData save/restore for content preservation on window resize"

# Metrics
duration: 3min
completed: 2026-02-26
---

# Phase 9 Plan 04: Digitaal Kladblaadje Summary

**Canvas tekenpaneel voor rekenen-sessies: auto-toont bij [BORD] blokken, bewaard in Supabase storage (private bucket, RLS per kind), met mount-time page-reload restore en niet-wegklikbare header**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-26T18:25:32Z
- **Completed:** 2026-02-26T18:28:35Z
- **Tasks:** 2
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments

- `Scratchpad.tsx` nieuwe 'use client' component: PointerEvent-based canvas tekenen, 5 kleuren, wis-knop met grid-herstel, Supabase upload met hasContent guard
- `011_scratchpads.sql`: private bucket aangemaakt + 3 RLS policies (parent upload, parent read, admin read)
- `ChatInterface.tsx`: Scratchpad geimporteerd, `showScratchpad` state, 2 useEffects (boardContent trigger + mount-time restore), setShowScratchpad in handleSubmit, Scratchpad JSX voor input-balk
- `system-prompts.ts`: kladblaadje-herinnering sectie toegevoegd aan KOKO_BASE_PROMPT (na Arubaanse Context)
- Build slaagt zonder TypeScript-fouten

## Task Commits

Each task was committed atomically:

1. **Task 1: Maak Scratchpad.tsx component + SQL migratie 011** - `d751e4e` (feat)
2. **Task 2: Integreer Scratchpad in ChatInterface + systeem prompt** - `2e7f4c5` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `aruba-leren/src/components/tutor/Scratchpad.tsx` - Nieuw canvas tekenpaneel met kleurkiezer, wis, opslaan-naar-Supabase
- `aruba-leren/supabase/migrations/011_scratchpads.sql` - Scratchpads storage bucket + RLS policies (private, parent-scoped)
- `aruba-leren/src/components/tutor/ChatInterface.tsx` - Scratchpad import + showScratchpad state + 2 useEffects + JSX
- `aruba-leren/src/lib/ai/prompts/system-prompts.ts` - KOKO_BASE_PROMPT kladblaadje-herinnering sectie

## Decisions Made

- Migration numbered 011: 010_weekly_email_cron.sql already occupied slot 010
- Non-dismissible design: showScratchpad has no path to false after becoming true — Scratchpad component has no close button
- Mount-time useEffect with `[]` dependency: intentional — scans messages at initial render for page-reload restore, not on every subsequent message
- clearCanvas redraws grid: visual consistency after wis — grid dots preserved
- Parent viewing UI deferred to Phase 11: RLS ready, bucket private, scope boundary explicit

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] clearCanvas did not redraw grid after fill**
- **Found during:** Task 1 implementation
- **Issue:** Plan's clearCanvas only did `fillRect` with white, but resizeCanvas draws a light grid. After clear, the grid would be missing.
- **Fix:** Added grid redraw logic to clearCanvas (same as in resizeCanvas) so visual state is consistent
- **Files modified:** aruba-leren/src/components/tutor/Scratchpad.tsx
- **Commit:** d751e4e (inline fix, not separate commit)

**2. [Rule 1 - Bug] Migration filename conflict — 010_scratchpads.sql would overwrite existing 010_weekly_email_cron.sql**
- **Found during:** Task 1 pre-implementation check
- **Issue:** Plan specified 010_scratchpads.sql but 010_weekly_email_cron.sql already exists
- **Fix:** Named migration 011_scratchpads.sql; updated plan artifact reference accordingly
- **Files modified:** aruba-leren/supabase/migrations/011_scratchpads.sql
- **Commit:** d751e4e (applied at creation time)

## Issues Encountered

None beyond the two auto-fixed deviations above.

## User Setup Required

Run the following SQL in **Supabase SQL Editor** to apply the storage bucket and RLS policies:

```
aruba-leren/supabase/migrations/011_scratchpads.sql
```

This creates the `scratchpads` private storage bucket and the three RLS policies for parent-scoped access.

## Next Phase Readiness

- Phase 9 (Visuele Leerondersteuning) COMPLETE — all 4 plans delivered
- 09-01: schrijfanimatie (clip-path reveal)
- 09-02: KaTeX wiskundige notatie
- 09-03: interactieve zinsontleding
- 09-04: digitaal kladblaadje (this plan)
- Ready for Phase 10

## Self-Check: PASSED

- FOUND: aruba-leren/src/components/tutor/Scratchpad.tsx
- FOUND: aruba-leren/supabase/migrations/011_scratchpads.sql
- FOUND: ChatInterface.tsx contains showScratchpad
- FOUND: ChatInterface.tsx contains hasBordInHistory (mount-time restore)
- FOUND: system-prompts.ts contains "Kladblaadje bij Rekenen"
- FOUND: commit d751e4e (Task 1)
- FOUND: commit 2e7f4c5 (Task 2)

---
*Phase: 09-visuele-leerondersteuning*
*Completed: 2026-02-26*
