---
phase: 09-visuele-leerondersteuning
plan: 03
subsystem: ui
tags: [react, typescript, tailwind, sentence-analysis, interactive, grammar]

# Dependency graph
requires:
  - phase: 04-ai-tutor-core-foundations
    provides: ChatMessage.tsx segment parsing + ChatInterface streaming handler
  - phase: 06-advanced-ai-features
    provides: subject-prompts.ts taal prompt structure
provides:
  - Interactive sentence analysis panel (ZinsontledingPanel.tsx) with color-coded word chips
  - [ZINSONTLEDING] tag parsing in ChatMessage and ChatInterface
  - AI prompt instructions for emitting grammatically annotated JSON sentences
affects:
  - 09-visuele-leerondersteuning (ongoing phase)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Special block tag pattern: [ZINSONTLEDING]JSON[/ZINSONTLEDING] → parseSegments detects → ZinsontledingPanel renders"
    - "hasSpecialBlocks guard pattern extended: any new block type must be added to guard or segments never render"
    - "Auto-open panel pattern: after streaming completes, check for tag → parse JSON → set panel state"

key-files:
  created:
    - aruba-leren/src/components/tutor/ZinsontledingPanel.tsx
  modified:
    - aruba-leren/src/components/tutor/ChatMessage.tsx
    - aruba-leren/src/components/tutor/ChatInterface.tsx
    - aruba-leren/src/lib/ai/prompts/subject-prompts.ts

key-decisions:
  - "hasSpecialBlocks guard must include hasZinsontledingBlocks() — without it segments never render even if parsed"
  - "JSON.parse wrapped in try/catch in both ChatInterface locations (auto-open + manual click) to silently swallow malformed AI JSON"
  - "NONE words are interactive; words with known roles (PV/GEZ/ONS/LV/MWV) are display-only chips"
  - "Panel uses bottom-sheet on mobile (h-2/3, rounded-t-2xl) and right sidebar on desktop (md:w-80, md:h-full)"

patterns-established:
  - "Special block rendering: add interface + union type + TAG_REGEX + while-loop branch + hasXBlocks() + extractX() + hasSpecialBlocks guard + render case"

# Metrics
duration: 9min
completed: 2026-02-26
---

# Phase 9 Plan 3: Interactieve Zinsontleding Summary

**Color-coded interactive sentence analysis panel: AI emits [ZINSONTLEDING] JSON, children click NONE words to assign grammatical roles (PV/GEZ/ONS/LV/MWV) with correct-answer bounce animation**

## Performance

- **Duration:** 9 min
- **Started:** 2026-02-26T18:06:23Z
- **Completed:** 2026-02-26T18:16:04Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- ZinsontledingPanel.tsx: interactive component with 6-color role system, role picker dropdown, animate-bounce feedback, progress bar
- ChatMessage.tsx: ZinsontledingSegment type, parseSegments() extension, hasZinsontledingBlocks() guard in hasSpecialBlocks, "Zinsontleding bekijken" button
- ChatInterface.tsx: auto-open panel on AI response, handleZinsontledingClick handler, ZinsontledingPanel in JSX
- subject-prompts.ts: complete [ZINSONTLEDING] format instructions for taal klas 4-6 with JSON example and role definitions

## Task Commits

Each task was committed atomically:

1. **Task 1: Maak ZinsontledingPanel.tsx** - `d09853c` (feat)
2. **Task 2: Wire [ZINSONTLEDING] tag in ChatMessage + ChatInterface + subject-prompts** - `be33c75` (feat)

**Plan metadata:** (docs commit — see final commit)

## Files Created/Modified
- `aruba-leren/src/components/tutor/ZinsontledingPanel.tsx` - New interactive sentence analysis panel
- `aruba-leren/src/components/tutor/ChatMessage.tsx` - ZinsontledingSegment type, parser, guard, button render
- `aruba-leren/src/components/tutor/ChatInterface.tsx` - Import, state, auto-open, handler, panel JSX
- `aruba-leren/src/lib/ai/prompts/subject-prompts.ts` - [ZINSONTLEDING] section in taal prompt

## Decisions Made
- hasSpecialBlocks guard must include hasZinsontledingBlocks() — without it, segments are parsed but never rendered (the guard short-circuits to the simple renderMarkdown() path)
- JSON.parse wrapped in try/catch in both locations (auto-open after stream + manual click handler) to silently swallow any malformed AI JSON
- NONE words are interactive (role picker on click); words with pre-assigned roles are display-only colored chips
- Panel layout: bottom-sheet on mobile (h-2/3, slide up), right sidebar on desktop (w-80, slide in from right)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- ZinsontledingPanel fully wired; AI will emit [ZINSONTLEDING] blocks for taal klas 4-6
- Pattern established for future special block types: add to TAG_REGEX, parseSegments, hasSpecialBlocks guard, render case
- Ready for 09-04 (next plan in visuele leerondersteuning phase)

---
*Phase: 09-visuele-leerondersteuning*
*Completed: 2026-02-26*

## Self-Check: PASSED

- ZinsontledingPanel.tsx: FOUND
- ChatMessage.tsx: FOUND
- ChatInterface.tsx: FOUND
- subject-prompts.ts: FOUND
- 09-03-SUMMARY.md: FOUND
- Commit d09853c: FOUND
- Commit be33c75: FOUND
