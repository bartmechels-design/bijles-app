---
phase: 10-neural-tts-uitspraak
plan: 01
subsystem: api
tags: [openai, tts, audio, speech, neural, hook, nextjs]

# Dependency graph
requires:
  - phase: 04-ai-tutor-core
    provides: tutor chat API route and Supabase auth patterns
provides:
  - OpenAI TTS API route (POST /[locale]/api/tutor/tts) returning audio/mpeg
  - useTextToSpeech() hook that fetches from server-side TTS route instead of speechSynthesis
  - Drop-in interface: speak(text, lang, { onStart, onEnd }), stop(), isSpeaking
affects:
  - 10-02 (dictation/spreek integration depends on this hook)
  - 10-03 (uitspraaktrainer depends on this hook)
  - 10-04 (any further TTS usage)

# Tech tracking
tech-stack:
  added:
    - openai ^6.25.0 (TTS API client)
  patterns:
    - Server-side TTS: client hook fetches blob from API route, plays via HTMLAudioElement
    - Auth guard on paid API routes (401 for unauthenticated requests)
    - Blob URL lifecycle management: create → play → revoke on end/error/stop/unmount
    - Hard cap (MAX_TTS_CHARS=2000) to prevent runaway API costs

key-files:
  created:
    - aruba-leren/src/app/[locale]/api/tutor/tts/route.ts
  modified:
    - aruba-leren/src/hooks/useSpeech.ts
    - aruba-leren/package.json

key-decisions:
  - "nova voice for nl/pap/es (warm female), alloy for en-US (neutral) — voice selection by lang"
  - "Hardcoded /nl/api/tutor/tts path in hook — Next.js registers [locale] route for all locales, locale param unused in route logic"
  - "tts-1-hd model selected over tts-1 — HD quality worth cost premium for child-facing audio"
  - "OPENAI_API_KEY in .env.local, never exposed to client — server-side route is the security boundary"
  - "speak() is now async (was synchronous) — callers using await are correct; callers not awaiting still work (fire-and-forget)"

patterns-established:
  - "Binary API response: return new Response(arrayBuffer, { headers: { Content-Type: audio/mpeg } })"
  - "Blob URL audio playback with full lifecycle cleanup (revoke on end/error/stop/unmount)"

# Metrics
duration: 12min
completed: 2026-02-27
---

# Phase 10 Plan 01: OpenAI TTS API-route + Hook vervanging Summary

**OpenAI TTS `tts-1-hd` (nova stem) via beveiligde server-side API-route, vervangt `window.speechSynthesis` — zelfde hook interface, betere stemkwaliteit op alle apparaten**

## Performance

- **Duration:** 12 min
- **Started:** 2026-02-27T00:00:00Z
- **Completed:** 2026-02-27T00:12:00Z
- **Tasks:** 3
- **Files modified:** 3 (+ package-lock.json)

## Accomplishments

- OpenAI `tts-1-hd` model met `nova` stem draait server-side, API sleutel nooit blootgesteld aan client
- TTS API-route beveiligd met Supabase auth-check (401 zonder geldige sessie) + 2000-teken limiet
- `useTextToSpeech()` is een drop-in vervanger: zelfde interface, nu async via `HTMLAudioElement` + Blob URL

## Task Commits

Elke taak atomisch gecommit:

1. **Task 1: Installeer openai pakket** - `ab85d1d` (chore)
2. **Task 2: Maak TTS API-route aan** - `c0000ad` (feat)
3. **Task 3: Vervang useTextToSpeech** - `330cb2b` (feat)

## Files Created/Modified

- `aruba-leren/src/app/[locale]/api/tutor/tts/route.ts` - Neural TTS API-route: auth + OpenAI tts-1-hd + audio/mpeg response
- `aruba-leren/src/hooks/useSpeech.ts` - useTextToSpeech vervangen door OpenAI TTS hook; useSpeechToText ongewijzigd
- `aruba-leren/package.json` - openai ^6.25.0 toegevoegd
- `aruba-leren/.env.local` - OPENAI_API_KEY placeholder toegevoegd (user moet echte sleutel invullen)

## Decisions Made

- `nova` stem voor nl/pap/es (warm, vrouwelijk — kindvriendelijk), `alloy` voor en-US
- Hardcoded `/nl/api/tutor/tts` pad in hook — Next.js registreert `[locale]`-route voor alle locales, locale-param ongebruikt in route-logica
- `tts-1-hd` model boven `tts-1` — HD kwaliteit waard voor kindergerichte audio
- `speak()` is nu async (was synchroon) — fire-and-forget callers werken nog steeds correct

## Deviations from Plan

None — plan uitgevoerd exact zoals geschreven.

## Issues Encountered

None — TypeScript compilatie geslaagd zonder fouten na alle wijzigingen.

## User Setup Required

**De OPENAI_API_KEY moet handmatig worden ingevuld.**

Stappen:
1. Ga naar https://platform.openai.com/api-keys
2. Maak een nieuwe API-sleutel aan (of gebruik een bestaande)
3. Open `aruba-leren/.env.local`
4. Vervang `VERVANG_DIT_MET_JE_OPENAI_SLEUTEL` met de echte sleutel: `OPENAI_API_KEY=sk-proj-...`
5. Herstart de dev server: `npm run dev` in `aruba-leren/`
6. Verificatie: open tutor-chat in browser, schakel voice-first mode in, stuur een bericht — Koko spreekt via OpenAI TTS (vloeiender, warmer dan browser TTS)
7. Network tab in DevTools: verzoek naar `/nl/api/tutor/tts` moet HTTP 200 retourneren met `Content-Type: audio/mpeg`

## Next Phase Readiness

- TTS basis klaar voor Phase 10 Wave 2: 10-02 (dictation/spreek), 10-03 (uitspraaktrainer), 10-04
- Hook interface is drop-in — geen aanpassingen nodig in ChatInterface of andere consumers
- Let op: zonder geldig OPENAI_API_KEY geeft de route HTTP 500 bij het aanroepen

---
*Phase: 10-neural-tts-uitspraak*
*Completed: 2026-02-27*
