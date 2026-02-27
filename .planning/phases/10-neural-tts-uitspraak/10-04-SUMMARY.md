---
phase: 10-neural-tts-uitspraak
plan: 04
subsystem: ui
tags: [tts, openai, text-to-speech, aruba, substitutions, typescript]

# Dependency graph
requires:
  - phase: 10-01
    provides: useTextToSpeech hook met OpenAI TTS API
  - phase: 10-02
    provides: tts-utils.ts met cleanForTts() functie

provides:
  - Arubaanse fonetische substitutie-map (22 entries) in tts-substitutions.ts
  - applyTtsSubstitutions() functie met case-insensitive whole-word matching
  - cleanForTts() past nu automatisch Arubaanse naam-substituties toe
  - ChatInterface gebruikt shared cleanForTts (geen lokale duplicaat meer)

affects: [tts-utils, ChatInterface, alle TTS-playback in de chat]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Fonetische substitutie als post-processing stap na markdown cleaning
    - Whole-word matching via lookahead/lookbehind (niet \b) voor Unicode-safe matching
    - Substitutie-map als apart bestand voor eenvoudige uitbreiding

key-files:
  created:
    - aruba-leren/src/lib/ai/tts-substitutions.ts
  modified:
    - aruba-leren/src/lib/ai/tts-utils.ts
    - aruba-leren/src/components/tutor/ChatInterface.tsx

key-decisions:
  - "applyTtsSubstitutions() als aparte module — makkelijk uitbreidbaar zonder tts-utils aan te raken"
  - "Substitutie als laatste stap na markdown cleaning — werkt op schone tekst, geen interferentie met markdown-syntax"
  - "Lookahead/lookbehind (?<![\\wÀ-ÿ]) i.p.v. \\b voor Unicode-safe word boundary (Arubaanse namen)"
  - "cleanForAutoTts() in ChatInterface verwijderd — single source of truth via tts-utils.ts"

patterns-established:
  - "TTS substitutie-map uitbreiding: voeg entry toe aan TTS_SUBSTITUTIONS array, test via chat"

# Metrics
duration: 8min
completed: 2026-02-27
---

# Phase 10 Plan 04: Arubaanse context — eigennamen substitutie voor TTS Summary

**Fonetische substitutie-map voor 22 Arubaanse plaatsnamen en eigennamen, geintegreerd in cleanForTts() zodat OpenAI TTS ze correct uitspreekt**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-27T18:16:33Z
- **Completed:** 2026-02-27T18:24:39Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Nieuwe `tts-substitutions.ts` module met 22 Arubaanse namen en fonetische equivalenten
- `cleanForTts()` in `tts-utils.ts` past nu automatisch Arubaanse naam-substituties toe als laatste stap
- Lokale `cleanForAutoTts()` in ChatInterface.tsx verwijderd — ChatInterface gebruikt nu de centrale functie

## Task Commits

1. **Task 1: Maak tts-substitutions.ts aan** - `7b380c0` (feat)
2. **Task 2: Integreer substitities in cleanForTts()** - `7498312` (feat)
3. **Task 3: Vervang cleanForAutoTts door cleanForTts in ChatInterface** - `597e16a` (feat)

**Plan metadata:** *(zie final commit)*

## Files Created/Modified

- `aruba-leren/src/lib/ai/tts-substitutions.ts` - TtsSubstitution interface, TTS_SUBSTITUTIONS array (22 entries), applyTtsSubstitutions() functie
- `aruba-leren/src/lib/ai/tts-utils.ts` - Import applyTtsSubstitutions, cleanForTts() past substituties toe na markdown cleaning
- `aruba-leren/src/components/tutor/ChatInterface.tsx` - Import cleanForTts van tts-utils, lokale cleanForAutoTts() verwijderd

## Decisions Made

- applyTtsSubstitutions() als aparte module — makkelijk uitbreidbaar zonder tts-utils aan te raken
- Substitutie als laatste stap na markdown cleaning — werkt op schone tekst, geen interferentie met markdown-syntax
- Lookahead/lookbehind `(?<![\\wÀ-ÿ])` i.p.v. `\\b` voor Unicode-safe word boundary (Arubaanse namen bevatten accenten)
- cleanForAutoTts() in ChatInterface verwijderd — single source of truth via tts-utils.ts

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - geen externe services of SQL migraties vereist.

## Next Phase Readiness

- Phase 10 volledig compleet — alle 4 plannen uitgevoerd
- Arubaanse TTS klaar: substitutie, segmentatie, Papiamento-blocking, OpenAI TTS hook
- Handmatige verificatie aanbevolen: vraag Koko over "Oranjestad" en "San Nicolas" om uitspraak te testen

## Self-Check: PASSED

- FOUND: aruba-leren/src/lib/ai/tts-substitutions.ts
- FOUND: aruba-leren/src/lib/ai/tts-utils.ts
- FOUND: aruba-leren/src/components/tutor/ChatInterface.tsx
- FOUND commit: 7b380c0 (feat 10-04 tts-substitutions.ts)
- FOUND commit: 7498312 (feat 10-04 tts-utils.ts integration)
- FOUND commit: 597e16a (feat 10-04 ChatInterface wiring)
- Build: PASSED (no TypeScript errors)

---
*Phase: 10-neural-tts-uitspraak*
*Completed: 2026-02-27*
