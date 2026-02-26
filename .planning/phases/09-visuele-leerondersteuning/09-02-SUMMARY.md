---
phase: 09-visuele-leerondersteuning
plan: 02
subsystem: ui
tags: [katex, latex, math, fractions, whiteboard, chat, system-prompts, rendering]

# Dependency graph
requires:
  - phase: 09-visuele-leerondersteuning
    provides: Whiteboard.tsx component with clip-path animations (09-01)
  - phase: 09-visuele-leerondersteuning
    provides: ZinsontledingPanel and [ZINSONTLEDING] tag wiring (09-03)
provides:
  - KaTeX math rendering in Whiteboard.tsx via renderMathLine() for all 4 block types
  - KaTeX math rendering in ChatMessage.tsx [OPDRACHT] blocks (per-line)
  - MATH_FORMAT_RULES system prompt constant for rekenen sessions
  - AI instructed to emit \frac{}{}, \times, \div, \sqrt notation instead of 1/4, x, /
affects: [09-04]

# Tech tracking
tech-stack:
  added:
    - "katex ^0.16.33 (runtime)"
    - "@types/katex (devDependency)"
  patterns:
    - "KaTeX CSS imported in Server Component layout.tsx (not 'use client' component) for correct bundling"
    - "renderMathLine() pattern: containsMath() guard → katex.renderToString() → dangerouslySetInnerHTML, with throwOnError:false + try/catch fallback"
    - "Per-line KaTeX rendering in multi-line blocks: split('\\n').map() so only lines with LaTeX get KaTeX treatment"
    - "MATH_FORMAT_RULES injected conditionally (rekenen only) after subjectPrompt, before languageContext"

key-files:
  created: []
  modified:
    - aruba-leren/package.json
    - aruba-leren/src/app/[locale]/layout.tsx
    - aruba-leren/src/components/tutor/Whiteboard.tsx
    - aruba-leren/src/components/tutor/ChatMessage.tsx
    - aruba-leren/src/lib/ai/prompts/system-prompts.ts

key-decisions:
  - "KaTeX CSS loaded in layout.tsx (Server Component) — 'use client' components cannot import external CSS without Next.js bundler issues"
  - "throwOnError: false mandatory — KaTeX parse failures silently degrade to plain text, never crash the UI"
  - "containsMath() guard before renderToString() — avoids KaTeX overhead on plain-text lines (majority of content)"
  - "Per-line rendering in [OPDRACHT] blocks — split('\\n').map() so arithmetic expressions render correctly without full-display-mode LaTeX"
  - "MATH_FORMAT_RULES injected only for rekenen subject — other subjects don't need LaTeX notation rules"
  - "KOKO_BASE_PROMPT examples updated to \\frac{}{} — ensures few-shot examples in static prompt also use correct notation"

patterns-established:
  - "Pattern: renderMathLine(text, className?) — reusable helper, same implementation in Whiteboard.tsx and ChatMessage.tsx"
  - "Pattern: containsMath() regex guard — /\\\\frac|\\\\times|\\\\div|\\\\sqrt|\\\\cdot|\\^{|_{/ detects LaTeX tokens before invoking KaTeX"

# Metrics
duration: 8min
completed: 2026-02-26
---

# Phase 9 Plan 02: KaTeX Wiskundige Notatie Summary

**KaTeX geinstalleerd met renderMathLine() helper in Whiteboard + ChatMessage; AI-prompt instructs \\frac{}{} notation voor breuken, ×, ÷, √ in rekenen-sessies**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-02-26T18:18:50Z
- **Completed:** 2026-02-26T18:26:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- KaTeX installed (`katex ^0.16.33`) with CSS loaded via layout.tsx Server Component
- `renderMathLine()` helper in Whiteboard.tsx used in all 4 render paths: UITLEG italic, ANTWOORD monospace, default flex label, plain-text p
- `renderMathLine()` in ChatMessage.tsx renders [OPDRACHT] blocks line-by-line (only lines with LaTeX get KaTeX treatment)
- `MATH_FORMAT_RULES` constant added to system-prompts.ts, injected for rekenen-sessies
- KOKO_BASE_PROMPT fraction examples updated to `\frac{}{}` notation
- Build passes without TypeScript errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Installeer KaTeX, voeg CSS import toe, maak renderMathLine helper** - `f52b885` (feat)
2. **Task 2: KaTeX in ChatMessage [OPDRACHT] blokken + systeem prompt update** - `8d8fe2e` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `aruba-leren/package.json` - Added katex ^0.16.33 dependency + @types/katex devDependency
- `aruba-leren/src/app/[locale]/layout.tsx` - Added `import 'katex/dist/katex.min.css'` (Server Component)
- `aruba-leren/src/components/tutor/Whiteboard.tsx` - Added katex import, containsMath(), renderMathLine(); updated all 4 render paths
- `aruba-leren/src/components/tutor/ChatMessage.tsx` - Added katex import, containsMath(), renderMathLine(); [OPDRACHT] per-line rendering
- `aruba-leren/src/lib/ai/prompts/system-prompts.ts` - Added MATH_FORMAT_RULES export; mathRules injection for rekenen; KOKO_BASE_PROMPT examples updated

## Decisions Made

- KaTeX CSS in Server Component layout.tsx: `'use client'` components cannot reliably import external CSS via npm packages in Next.js — Server Components bundle correctly
- `throwOnError: false` is mandatory: KaTeX parse errors must never hard-crash the UI; fallback to plain text is always correct behavior
- `containsMath()` guard before invoking KaTeX: most whiteboard content is plain text/numbers, no LaTeX overhead needed
- Per-line rendering in [OPDRACHT]: full display-mode LaTeX on multi-line strings breaks layout; per-line is simpler and correct for mixed content
- MATH_FORMAT_RULES only for rekenen: other subjects (taal, zaakvakken, begrijpend_lezen) don't use mathematical notation

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- KaTeX rendering live in both Whiteboard and ChatMessage
- AI will now emit `\frac{1}{4}` instead of `1/4` in rekenen sessions
- Ready for 09-04 (final plan in phase 9)
- No blockers

## Self-Check: PASSED

- FOUND: aruba-leren/package.json contains katex
- FOUND: aruba-leren/src/app/[locale]/layout.tsx contains katex.min.css import
- FOUND: aruba-leren/src/components/tutor/Whiteboard.tsx contains renderMathLine
- FOUND: aruba-leren/src/components/tutor/ChatMessage.tsx contains renderMathLine
- FOUND: aruba-leren/src/lib/ai/prompts/system-prompts.ts contains MATH_FORMAT_RULES
- FOUND: commit f52b885 (Task 1)
- FOUND: commit 8d8fe2e (Task 2)

---
*Phase: 09-visuele-leerondersteuning*
*Completed: 2026-02-26*
