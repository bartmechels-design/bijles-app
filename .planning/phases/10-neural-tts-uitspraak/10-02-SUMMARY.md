---
phase: 10-neural-tts-uitspraak
plan: 02
subsystem: ui
tags: [tts, openai, audio, speech, prosody, typescript]

# Dependency graph
requires:
  - phase: 10-01
    provides: useTextToSpeech hook + /nl/api/tutor/tts API route
provides:
  - splitIntoSegments() utility: text → TtsSegment[] met pauseAfter timings
  - cleanForTts() utility: markdown/tag stripper herbruikbaar
  - Segment-gebaseerde TTS afspeling met 600ms/300ms pauzes
  - isCancelledRef mechanisme voor directe stop() onderbreking
affects:
  - 10-03
  - 10-04

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Tekst splitsen op interpunctiegrenzen voor TTS prosody zonder SSML
    - Sequential async audio playback met Promise-wrapping
    - Cancellation flag (isCancelledRef) voor onderbreking van async for-loop

key-files:
  created:
    - aruba-leren/src/lib/ai/tts-utils.ts
  modified:
    - aruba-leren/src/hooks/useSpeech.ts

key-decisions:
  - "Text-splitting ipv SSML/AudioContext-concatenatie: simpeler, geen browser-API-complexiteit"
  - "isCancelledRef.current = true in stop() zodat async for-loop direct stopt na huidig segment"
  - "Decimale getallen (3.14) en duizendtalscheiding (1,000) worden overgeslagen bij splitting"
  - "Laatste segment altijd pauseAfter=0 — forceer dit na opbouw van segments array"

patterns-established:
  - "Segment-loop: fetch → blob URL → Audio.play() → wacht op onended → setTimeout pause → volgende"
  - "cleanForTts() voor hergebruik: geëxtraheerd uit ChatInterface, nu in tts-utils voor reuse"

# Metrics
duration: 4min
completed: 2026-02-27
---

# Phase 10 Plan 02: Uitspraakregie — correcte pauzes bij punt en komma Summary

**Segment-gebaseerde TTS afspeling met 600ms/300ms pauzes via splitIntoSegments() utility, isCancelledRef voor directe stop-onderbreking**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-27T18:08:35Z
- **Completed:** 2026-02-27T18:12:25Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `tts-utils.ts` aangemaakt met `splitIntoSegments()` die tekst op zin- en zinsdeelgrenzen splitst met pauzetimings
- `cleanForTts()` utility geëxtraheerd als herbruikbare markdown/tag-stripper
- `useTextToSpeech()` omgebouwd van single-fetch naar segment-loop met sequentiële afspeling en pauzes
- `isCancelledRef` mechanisme toegevoegd: `stop()` zet vlag zodat for-loop direct stopt na huidig segment

## Task Commits

Elke taak atomisch gecommit:

1. **Task 1: Maak tts-utils.ts aan met segment-splitter** - `111395a` (feat)
2. **Task 2: Update useTextToSpeech() voor segment-gebaseerde afspeling** - `347b1ca` (feat)

## Files Created/Modified

- `aruba-leren/src/lib/ai/tts-utils.ts` - splitIntoSegments() + cleanForTts() utilities
- `aruba-leren/src/hooks/useSpeech.ts` - segment-gebaseerde speak(), isCancelledRef in stop()

## Decisions Made

- Text-splitting aanpak gekozen boven SSML/AudioContext-concatenatie: simpeler, geen browser-API-complexiteit, zelfde resultaat voor gebruiker
- `isCancelledRef.current = true` in `stop()` zodat de async `for`-loop direct stopt na het huidig segment (fetch kan niet geannuleerd worden, maar volgende iteratie wordt overgeslagen)
- Decimale getallen (3.14) en duizendtalscheiding (1,000) worden overgeslagen bij splitting — char-voor-char walker met prevIsDigit/nextIsDigit check
- Laatste segment krijgt altijd `pauseAfter = 0` — expliciet forceren na opbouw van array
- TypeScript compilatie geverifieerd met `npx tsc --noEmit` (geen errors)

## Deviations from Plan

None - plan uitgevoerd exact zoals beschreven.

## Issues Encountered

`npm run build` blokkeerde door lopend lock-bestand (dev server actief). Omzeild met `npx tsc --noEmit` voor type-verificatie — geeft zelfde TypeScript-fout-detectie zonder build lock.

## User Setup Required

None - geen externe service configuratie vereist.

## Next Phase Readiness

- Segment-splitter klaar voor gebruik door alle TTS-aanroepen in de app
- `speak()` interface ongewijzigd — `ChatInterface.tsx` hoeft niet aangepast te worden
- `cleanForTts()` beschikbaar voor toekomstige plannen die TTS-cleaning nodig hebben
- Klaar voor 10-03 en 10-04

---
*Phase: 10-neural-tts-uitspraak*
*Completed: 2026-02-27*

## Self-Check: PASSED

- FOUND: aruba-leren/src/lib/ai/tts-utils.ts
- FOUND: aruba-leren/src/hooks/useSpeech.ts
- FOUND: .planning/phases/10-neural-tts-uitspraak/10-02-SUMMARY.md
- FOUND commit: 111395a feat(10-02): maak tts-utils.ts aan met splitIntoSegments en cleanForTts
- FOUND commit: 347b1ca feat(10-02): update useTextToSpeech voor segment-gebaseerde afspeling
- FOUND export: splitIntoSegments (tts-utils.ts:26)
- FOUND export: cleanForTts (tts-utils.ts:110)
- FOUND import: splitIntoSegments in useSpeech.ts
- FOUND: isCancelledRef usage in useSpeech.ts (reset, break, stop())
