---
phase: 11-rapportages-pdf-deling
plan: 03
subsystem: api
tags: [supabase, token, sha256, share-link, pin-gate, server-component, client-component]

# Dependency graph
requires:
  - phase: 11-rapportages-pdf-deling
    plan: 01
    provides: report_tokens tabel (012_rapport_tables.sql), buildRapportData(), RapportView met readOnly prop
  - phase: 02-authentication-family-accounts
    provides: createAdminClient() voor publieke routes zonder sessie

provides:
  - createReportToken() + hashPin() hulpfuncties (report-token.ts)
  - POST /[locale]/api/rapport/generate — aanmaken deelbare link met snapshot
  - ShareLinkPanel client component — PIN-invoer, genereer-knop, URL-weergave, kopieer-knop
  - /[locale]/rapport/[token] publieke route — rapport zonder login, met PIN-gate
  - PinGateForm client component — GET-formulier voor PIN-invoer

affects: [11-04-whatsapp-pdf]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - createAdminClient() voor publieke routes (geen RLS-sessie aanwezig)
    - one-token-per-child: DELETE bestaande tokens voor INSERT nieuw token
    - hashPin() via crypto.subtle.digest('SHA-256') — geen externe library
    - PinGateForm als aparte 'use client' component (niet inline in Server Component)
    - PIN-verificatie via GET-parameter + server-side hash vergelijking (geen JS vereist)

key-files:
  created:
    - aruba-leren/src/lib/rapport/report-token.ts
    - aruba-leren/src/app/[locale]/api/rapport/generate/route.ts
    - aruba-leren/src/components/rapport/ShareLinkPanel.tsx
    - aruba-leren/src/app/[locale]/rapport/[token]/page.tsx
    - aruba-leren/src/app/[locale]/rapport/[token]/PinGateForm.tsx
  modified:
    - aruba-leren/src/app/[locale]/dashboard/kind/[childId]/rapport/page.tsx

key-decisions:
  - "createAdminClient() vereist voor publieke rapport-route — geen auth-sessie aanwezig, RLS blokkeert gewone client"
  - "PinGateForm als aparte 'use client' bestand — 'use client' directive mag niet midden in Server Component bestand"
  - "PIN-gate via GET-parameter (form method=GET) — werkt zonder JavaScript, eenvoudigste aanpak"
  - "one-token-per-child: DELETE voor INSERT — eenvoudiger UX, ouder ziet altijd de actuele link"
  - "report_data als JSONB snapshot bij token-aanmaak — publieke pagina laat altijd rapport op moment van generatie zien"

patterns-established:
  - "Pattern: publieke route zonder auth gebruikt createAdminClient() + .gt('expires_at', now) voor token-validatie"
  - "Pattern: ShareLinkPanel haalt bestaand token op bij paginaload via maybeSingle() in Server Component"

# Metrics
duration: 5min
completed: 2026-02-28
---

# Phase 11 Plan 03: Deelbare Link Systeem Summary

**Token-gebaseerd deellink-systeem met SHA-256 PIN-hashing, publieke rapport-route via adminClient, en ShareLinkPanel met kopieer-knop op de geauthenticeerde rapportpagina**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-28T01:12:16Z
- **Completed:** 2026-02-28T01:17:15Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- `report-token.ts`: `hashPin()` via `crypto.subtle.digest` (ingebouwd Node.js) + `createReportToken()` met one-token-per-child strategie en 30-dagen vervaldatum
- `generate/route.ts`: POST endpoint met cookie-auth, eigenaarschapscheck (via `profile.id`), rapport-snapshot en token-aanmaak
- `ShareLinkPanel.tsx`: client component met amber PIN-sectie, sky-blue genereer-knop, groene kopieer-knop, URL-weergave en vervaldatum
- `/rapport/[token]/page.tsx`: publieke Server Component met admin client, verlopen-token melding en PIN-gate
- `PinGateForm.tsx`: apart client component met GET-formulier (geen JS vereist)
- Rapportpagina: placeholder "Rapport delen" vervangen door werkende ShareLinkPanel met pre-fetch van bestaand token

## Task Commits

1. **Task 1: report-token lib + generate API-route + ShareLinkPanel** - `964d254` (feat)
2. **Task 2: publieke rapport-route + ShareLinkPanel koppeling** - `0c9baab` (feat)

**Plan metadata:** [docs commit na SUMMARY]

## Files Created/Modified

- `aruba-leren/src/lib/rapport/report-token.ts` — hashPin() + createReportToken() hulpfuncties
- `aruba-leren/src/app/[locale]/api/rapport/generate/route.ts` — POST endpoint voor token-aanmaak
- `aruba-leren/src/components/rapport/ShareLinkPanel.tsx` — deel-UI met PIN, genereer en kopieer
- `aruba-leren/src/app/[locale]/rapport/[token]/page.tsx` — publieke rapport-route zonder auth
- `aruba-leren/src/app/[locale]/rapport/[token]/PinGateForm.tsx` — PIN-invoer formulier
- `aruba-leren/src/app/[locale]/dashboard/kind/[childId]/rapport/page.tsx` — ShareLinkPanel geintegreerd

## Decisions Made

- `createAdminClient()` is vereist voor publieke routes — normale Supabase client heeft geen sessie en RLS blokkeert alle queries
- `PinGateForm` als apart `'use client'` bestand — Next.js App Router staat `'use client'` directive niet toe midden in een Server Component bestand
- PIN-gate werkt via GET-parameter (`?pin=1234`) zodat form submission werkt zonder JavaScript
- one-token-per-child: bij elke generatie worden bestaande tokens verwijderd voor een cleane UX

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] PinGateForm verplaatst naar apart bestand**
- **Found during:** Task 2
- **Issue:** Plan specificeerde PinGateForm als inline component in `page.tsx`, maar een Server Component bestand mag geen `'use client'` directive bevatten (anders dan als eerste regel van een eigen bestand)
- **Fix:** `PinGateForm.tsx` aangemaakt als apart `'use client'` bestand naast `page.tsx`
- **Files modified:** `aruba-leren/src/app/[locale]/rapport/[token]/PinGateForm.tsx` (nieuw)
- **Committed in:** 0c9baab (Task 2 commit)

**2. [Rule 1 - Bug] Rapport-pagina had al StudyPlanEditor (plan 11-02)**
- **Found during:** Task 2 (bestand lezen)
- **Issue:** Plan 11-02 had de rapport/page.tsx al gewijzigd met StudyPlanEditor; plan 11-03 specificeerde een eenvoudigere versie zonder StudyPlanEditor
- **Fix:** Alleen de placeholder-sectie vervangen door ShareLinkPanel, StudyPlanEditor behouden — beide features functioneel aanwezig
- **Files modified:** `aruba-leren/src/app/[locale]/dashboard/kind/[childId]/rapport/page.tsx`
- **Committed in:** 0c9baab (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 Next.js architectural constraint, 1 bestaande implementatie bewaard)
**Impact on plan:** Geen scope creep. Alle plan-truths geimplementeerd.

## User Setup Required

Geen nieuwe SQL-migraties — `report_tokens` tabel is aangemaakt in migratie 012 (plan 11-01).
SQL migratie 012 moet nog uitgevoerd worden in Supabase SQL Editor als dat nog niet gedaan is.

## Next Phase Readiness

- Token-systeem is klaar voor plan 11-04 (WhatsApp-knop)
- Placeholder comment `{/* WhatsApp-knop wordt toegevoegd in plan 11-04 */}` aanwezig in ShareLinkPanel.tsx
- `shareUrl` is beschikbaar in ShareLinkPanel state voor WhatsApp deep-link in plan 11-04

---
*Phase: 11-rapportages-pdf-deling*
*Completed: 2026-02-28*

## Self-Check: PASSED
