---
phase: 10-neural-tts-uitspraak
verified: 2026-02-27T18:30:21Z
status: passed
score: 5/5 must-haves verified
gaps: []
human_verification:
  - test: "TTS klinkt natuurlijk in de browser"
    expected: "OpenAI nova stem klinkt vloeiend en kindvriendelijk, duidelijk beter dan browser speechSynthesis"
    why_human: "Audiokwaliteit kan niet programmatisch worden beoordeeld"
  - test: "Pauzes hoorbaar na punt (~600ms) en komma (~300ms)"
    expected: "Zin als 'Goed gedaan! Probeer nu de volgende, die is iets moeilijker.' heeft duidelijke pauze na uitroepteken en kleinere pauze na komma"
    why_human: "Timing van audio segmenten is perceptueel — kan niet met grep worden getest"
  - test: "Papiamento locale toont geen spraakknop en speelt geen audio"
    expected: "Op /pap/tutor/... pagina zichtbaar amber 'Alleen lezen' badge, geen audio bij Koko-berichten"
    why_human: "UI rendering en audio-gedrag vereist browser-test"
  - test: "Arubaanse namen klinken correct in TTS"
    expected: "Koko zegt 'Oranje-stad' voor Oranjestad, 'San Nikolaas' voor San Nicolas, 'Aroeba' voor Aruba"
    why_human: "Uitspraak van fonetische substitutie kan alleen auditief worden geverifieerd"
---

# Phase 10: Neural TTS Uitspraak Verification Report

**Phase Goal:** Browser TTS wordt vervangen door hoogwaardige Neural TTS (OpenAI TTS), met correcte pauzes, en Papiamento valt terug naar "Alleen lezen"-modus als geen goede stem beschikbaar is.
**Verified:** 2026-02-27T18:30:21Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Nederlandse TTS klinkt natuurlijk via OpenAI nova stem en API-route | VERIFIED (needs human for audio) | `route.ts` aanwezig, `tts-1-hd` + `nova` stem geconfigureerd, `openai ^6.25.0` in `package.json`, `useTextToSpeech` fetcht van `/nl/api/tutor/tts` |
| 2 | Pauze na punt ~600ms, na komma ~300ms via segment-gebaseerde afspeling | VERIFIED (needs human for timing) | `splitIntoSegments()` in `tts-utils.ts` implementeert 600ms voor `.!?…` en 300ms voor `,;:`, `useSpeech.ts` gebruikt sequentiele segment-loop met `setTimeout` |
| 3 | Papiamento-content toont "Alleen lezen"-modus en speelt geen audio | VERIFIED (needs human for render) | `isPapiamento = locale === 'pap'` op regel 123 van `ChatInterface.tsx`, `autoSpeak` blokkeert op regel 239, badge op regels 487-497 |
| 4 | Arubaanse eigennamen worden fonetisch gecorrigeerd | VERIFIED (needs human for audio) | `tts-substitutions.ts` bevat 24 entries, `applyTtsSubstitutions()` geimporteerd en aangeroepen als laatste stap in `cleanForTts()` |
| 5 | TTS API-route beveiligd met auth check | VERIFIED | Regels 34-39 in `route.ts`: Supabase `getUser()` check, returns 401 als `authError \|\| !user` |

**Score:** 5/5 truths verified (4 need human for perceptual/UI confirmation)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `aruba-leren/src/app/[locale]/api/tutor/tts/route.ts` | Neural TTS API-route met OpenAI + auth | VERIFIED | 81 regels, `tts-1-hd` model, `nova`/`alloy` stemkeuze, Supabase auth guard, `MAX_TTS_CHARS=2000` |
| `aruba-leren/src/hooks/useSpeech.ts` | useTextToSpeech met segment-loop, geen speechSynthesis | VERIFIED | 200 regels, `splitIntoSegments` geimporteerd, segment for-loop met `isCancelledRef`, `speechSynthesis` verwijderd (alleen in comment) |
| `aruba-leren/src/lib/ai/tts-utils.ts` | `cleanForTts` + `splitIntoSegments` | VERIFIED | 133 regels, beide functies geexporteerd, `applyTtsSubstitutions` geimporteerd en toegepast |
| `aruba-leren/src/lib/ai/tts-substitutions.ts` | Arubaanse naam substitutie-map | VERIFIED | 78 regels, 24 entries in `TTS_SUBSTITUTIONS`, `applyTtsSubstitutions()` met Unicode-safe regex |
| `aruba-leren/src/components/tutor/ChatInterface.tsx` | Papiamento badge + cleanForTts wiring | VERIFIED | `isPapiamento` op regel 123, `autoSpeak` guard op 239, badge op 487-497, `cleanForTts` geimporteerd op regel 23 en gebruikt op 241 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `ChatInterface.tsx` | `tts-utils.ts` | `import { cleanForTts }` | WIRED | Regel 23: import, regel 241: gebruik in `autoSpeak` callback |
| `tts-utils.ts` | `tts-substitutions.ts` | `import { applyTtsSubstitutions }` | WIRED | Regel 8: import, regel 131: toegepast als laatste stap in `cleanForTts()` |
| `useSpeech.ts` | `/nl/api/tutor/tts` | `fetch` in `speak()` | WIRED | Regel 61: `fetch('/nl/api/tutor/tts', { method: 'POST', ... })`, blob afgespeeld via `HTMLAudioElement` |
| `useSpeech.ts` | `tts-utils.ts` | `import { splitIntoSegments }` | WIRED | Regel 4: import, regel 47: gebruikt in `speak()` voor segment-loop |
| `route.ts` | OpenAI API | `openai.audio.speech.create()` | WIRED | Regel 60-65: `tts-1-hd` model, `getVoice(lang)` stemkeuze, `arrayBuffer()` response teruggegeven |
| `ChatInterface.tsx` | `isPapiamento` guard | `autoSpeak` early return | WIRED | Regel 239: `if (isPapiamento) return;` blokkeert TTS voor pap locale |

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| OpenAI TTS via server-side route (nova stem) | SATISFIED | `route.ts` volledig geimplementeerd met auth + OpenAI client |
| Segment-gebaseerde afspeling met pauzes | SATISFIED | `splitIntoSegments()` + segment for-loop in `useSpeech.ts` |
| Papiamento "Alleen lezen" modus | SATISFIED | `isPapiamento` guard + badge in `ChatInterface.tsx` |
| Arubaanse fonetische substituties | SATISFIED | 24 entries in `tts-substitutions.ts`, geintegreerd via `cleanForTts()` |
| Auth-beveiliging TTS route | SATISFIED | Supabase `getUser()` check met 401 respons |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `tts-utils.ts` | 29 | `return []` | Info | Legitieme lege-input guard (`if (!text.trim()) return []`), geen stub |

Geen blockers of warnings gevonden.

### Human Verification Required

#### 1. TTS Audiokwaliteit

**Test:** Open tutor-chat, schakel voice-first mode in, stuur een bericht en wacht op Koko-antwoord
**Expected:** Audio klinkt vloeiend en kindvriendelijk (nova stem) — duidelijk warmer en natuurlijker dan browser speechSynthesis
**Why human:** Audiokwaliteit is een perceptuele beoordeling

#### 2. Pauze Timing

**Test:** Stuur bericht "Goed gedaan! Je hebt 3 sommen goed. Probeer nu de volgende, die is iets moeilijker." in voice-first modus
**Expected:** Duidelijke pauze (~600ms) na uitroepteken; kleinere pauze (~300ms) na komma; "3 sommen" wordt niet gesplitst
**Why human:** Audio timing kan niet programmatisch worden gemeten

#### 3. Papiamento "Alleen lezen" Badge

**Test:** Navigeer naar `/pap/tutor/[childId]/[subject]`, stuur een bericht
**Expected:** Geen spraakknop in header; amber "Alleen lezen" badge zichtbaar met boekicoon; geen audio bij Koko-reactie
**Why human:** UI rendering en audio-gedrag vereist browser-test

#### 4. Fonetische Substitutie Uitspraak

**Test:** Vraag Koko in de chat: "Vertel iets over Oranjestad en Aruba."
**Expected:** TTS zegt "Oranje-stad" (twee lettergrepen) en "Aroeba" (zachte u-klank)
**Why human:** Uitspraakverschil is alleen auditief te beoordelen

### Gaps Summary

Geen gaps. Alle 5 success criteria zijn programmatisch geverifieerd als aanwezig, substantieel en correct bedraad.

De 4 human verification items zijn perceptuele checks (audio, timing, visuele rendering) die niet met grep/file-inspectie kunnen worden gedaan — ze zijn geen gaps maar zijn normaal voor een TTS-feature.

---

_Verified: 2026-02-27T18:30:21Z_
_Verifier: Claude (gsd-verifier)_
