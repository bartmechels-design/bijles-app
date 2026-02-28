---
phase: 11-rapportages-pdf-deling
plan: 01
subsystem: ui
tags: [recharts, supabase, rls, server-component, next-dynamic]

# Dependency graph
requires:
  - phase: 05-baseline-assessment-progress-tracking
    provides: child_subject_progress, progress_events tabellen met level history
  - phase: 04-ai-tutor-core-foundations
    provides: tutoring_sessions tabel met started_at, ended_at, subject kolommen
  - phase: 02-authentication-family-accounts
    provides: profiles/children parent-kind relatie met RLS

provides:
  - SQL migratie 012 met report_tokens en study_plans tabellen (RLS-beveiligd)
  - buildRapportData() aggregatiefunctie — leest progress data, retourneert RapportData
  - ProgressLineChart component — Recharts lijngrafieken niveau-over-tijd per vak
  - RapportView component — volledig rapport render (startmeting, niveau, leertijd, foutanalyse)
  - /dashboard/kind/[childId]/rapport pagina — geauthenticeerde rapportpagina

affects: [11-02-studieplan, 11-03-deelbare-link, 11-04-pdf]

# Tech tracking
tech-stack:
  added: [recharts@3.7.0]
  patterns:
    - Server Component rapportpagina met parent-kind ownership check (profiles.id, niet user.id)
    - Client wrapper voor next/dynamic ssr:false (vereist door Next.js App Router)
    - buildRapportData() accepteert SupabaseClient parameter — werkt voor authenticated EN admin client
    - calcEffectiveMinutes() capped op 45 min/sessie, guard negatieve duur
    - recurringDifficulty = stuck_concept_count >= 2

key-files:
  created:
    - aruba-leren/supabase/migrations/012_rapport_tables.sql
    - aruba-leren/src/lib/rapport/rapport-data.ts
    - aruba-leren/src/components/rapport/ProgressLineChart.tsx
    - aruba-leren/src/components/rapport/ProgressLineChartWrapper.tsx
    - aruba-leren/src/components/rapport/RapportView.tsx
    - aruba-leren/src/app/[locale]/dashboard/kind/[childId]/rapport/page.tsx
  modified:
    - aruba-leren/package.json
    - aruba-leren/package-lock.json

key-decisions:
  - "dynamic() ssr:false verplaatst naar aparte Client Component wrapper (ProgressLineChartWrapper) — Next.js App Router staat dit niet toe in Server Components"
  - "buildRapportData() accepteert SupabaseClient als parameter (niet createClient() intern aanroepen) — maakt hergebruik mogelijk voor public share route (plan 11-03)"
  - "RapportView verdeelt subjects in met-voortgang en nog-niet-gestart — leeg rapport geeft duidelijk feedback aan ouder"
  - "Placeholder secties voor studieplan en deel-link al aanwezig in pagina — wordt gevuld in plan 11-02 en 11-03"

patterns-established:
  - "Pattern 1: ProgressLineChartWrapper — altijd een client wrapper aanmaken voor dynamic ssr:false in Server Component context"
  - "Pattern 2: RapportView props: { data: RapportData; locale?: string; readOnly?: boolean } — readOnly=true voor publieke deellink"

# Metrics
duration: 27min
completed: 2026-02-28
---

# Phase 11 Plan 01: Rapport Generator Summary

**Recharts lijngrafieken + data-aggregatie van progress_events/tutoring_sessions, geauthenticeerde /dashboard/kind/[childId]/rapport route met startmeting, groei, foutanalyse en effectieve leertijd per vak**

## Performance

- **Duration:** 27 min
- **Started:** 2026-02-28T01:01:38Z
- **Completed:** 2026-02-28T01:28:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- SQL migratie 012 met `report_tokens` en `study_plans` tabellen — volledig RLS-beveiligd, klaar voor plan 11-02 en 11-03
- `buildRapportData()` aggregeert `child_subject_progress`, `progress_events` en `tutoring_sessions` tot gestructureerde `RapportData`
- Recharts lijngrafieken per vak (placeholder bij < 2 datapunten), via client wrapper patroon voor Next.js App Router compatibility
- Geauthenticeerde rapportpagina met parent-kind ownership verificatie, per-vak kaarten en placeholder secties voor toekomstige plannen

## Task Commits

1. **Task 1: SQL migratie 012 + rapport-data aggregatiefunctie** - `bab2660` (feat)
2. **Task 2: ProgressLineChart + RapportView + geauthenticeerde rapportpagina** - `b05c665` (feat)

**Plan metadata:** [docs commit na SUMMARY]

## Files Created/Modified
- `aruba-leren/supabase/migrations/012_rapport_tables.sql` - report_tokens + study_plans tabellen met RLS
- `aruba-leren/src/lib/rapport/rapport-data.ts` - buildRapportData(), LevelPoint, SubjectRapport, RapportData types
- `aruba-leren/src/components/rapport/ProgressLineChart.tsx` - Recharts 'use client' lijngrafieken component
- `aruba-leren/src/components/rapport/ProgressLineChartWrapper.tsx` - Client wrapper voor dynamic ssr:false
- `aruba-leren/src/components/rapport/RapportView.tsx` - Server Component — volledig rapport render
- `aruba-leren/src/app/[locale]/dashboard/kind/[childId]/rapport/page.tsx` - Geauthenticeerde rapportpagina
- `aruba-leren/package.json` + `package-lock.json` - recharts@3.7.0 toegevoegd

## Decisions Made
- `dynamic()` met `ssr: false` vereist een aparte `'use client'` wrapper component in Next.js App Router — direct gebruik in Server Component geeft build error
- `buildRapportData()` accepteert `SupabaseClient` als parameter zodat plan 11-03 de admin client kan meegeven voor de publieke share route
- `RapportView` exporteert zowel named (`RapportView`) als default export voor maximale flexibiliteit bij imports

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] dynamic() ssr:false verplaatst naar Client Component wrapper**
- **Found during:** Task 2 (bouwfout bij npm run build)
- **Issue:** Next.js App Router staat `next/dynamic` met `ssr: false` niet toe in Server Components — Turbopack bouwfout
- **Fix:** Nieuw bestand `ProgressLineChartWrapper.tsx` aangemaakt als `'use client'` component dat de dynamic import beheert; RapportView importeert de wrapper
- **Files modified:** aruba-leren/src/components/rapport/ProgressLineChartWrapper.tsx (nieuw), aruba-leren/src/components/rapport/RapportView.tsx
- **Verification:** `npm run build` slaagt, `/[locale]/dashboard/kind/[childId]/rapport` zichtbaar in build output
- **Committed in:** b05c665 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking build error)
**Impact on plan:** Noodzakelijke fix voor Next.js App Router compatibiliteit. Geen scope creep.

## Issues Encountered
- Recharts `Tooltip` formatter type verwachtte `number | undefined` (niet `number`) — inline type fix toegepast

## User Setup Required
SQL migratie `012_rapport_tables.sql` moet handmatig worden uitgevoerd in Supabase SQL Editor:
1. Ga naar Supabase Dashboard > SQL Editor
2. Kopieer inhoud van `aruba-leren/supabase/migrations/012_rapport_tables.sql`
3. Voer uit — maakt `report_tokens` en `study_plans` tabellen aan met RLS

## Next Phase Readiness
- `buildRapportData()` is klaar voor gebruik door plan 11-03 (deelbare link) — admin client meegeven voor public route
- `RapportView` heeft `readOnly` prop klaar voor publieke weergave
- Placeholder secties in rapportpagina markeren integratiepunten voor plan 11-02 (studieplan) en 11-03/11-04 (delen/PDF)
- SQL migratie 012 nog niet uitgevoerd in Supabase — vereist voor `report_tokens` en `study_plans`

---
*Phase: 11-rapportages-pdf-deling*
*Completed: 2026-02-28*

## Self-Check: PASSED
