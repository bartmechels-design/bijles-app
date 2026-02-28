---
phase: 11-rapportages-pdf-deling
plan: 02
subsystem: ui, api, database
tags: [react, nextjs, supabase, tailwind, typescript]

# Dependency graph
requires:
  - phase: 11-01
    provides: buildRapportData(), SubjectRapport[], RapportData with studyPlan field, study_plans tabel (SQL migratie 012)
provides:
  - generateStudyPlan() pure function in study-plan-generator.ts
  - StudyPlanEditor client component met bewerkbaar weekraster
  - PUT /api/rapport/study-plan API route (upsert naar study_plans)
  - Rapport pagina integreert studieplan (opgeslagen of gegenereerd)
affects:
  - 11-03 (deellink-pagina kan ook het opgeslagen studieplan tonen)
  - 11-04 (PDF export bevat het studieplan)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Pure rule-based generator (geen AI) voor planningsfunctionaliteit
    - Server Component bepaalt initPlan; Client Component (StudyPlanEditor) beheert edit-state
    - upsert met onConflict: 'child_id' voor idempotente plan-opslag

key-files:
  created:
    - aruba-leren/src/lib/rapport/study-plan-generator.ts
    - aruba-leren/src/components/rapport/StudyPlanEditor.tsx
    - aruba-leren/src/app/[locale]/api/rapport/study-plan/route.ts
  modified:
    - aruba-leren/src/app/[locale]/dashboard/kind/[childId]/rapport/page.tsx

key-decisions:
  - "generateStudyPlan() als pure functie: stuck>=2 = 3 sessies, assessed = 2, niet-geassessed = 1 (geen AI nodig)"
  - "Server Component bepaalt initPlan (opgeslagen of gegenereerd), geeft als prop aan StudyPlanEditor"
  - "upsert op child_id (onConflict) voor idempotente opslag — geen dubbele rijen per kind"
  - "StudyPlanEditor gebruikt useParams() voor locale in fetch-pad — geen prop-drilling nodig"
  - "Stuck-vakken (sessies >= 3 in plan) krijgen amber kolomkop — visuele aandachtsindicator"

patterns-established:
  - "Server Component fetch + Client Component edit: data op server, mutaties op client via fetch"
  - "PUT voor updates/upserts, POST voor nieuwe resources — consistent met REST conventies"
  - "Eigenaarschapscheck: profile.id (niet user.id) koppelen aan child.parent_id"

# Metrics
duration: 3min
completed: 2026-02-28
---

# Phase 11 Plan 02: Studieplan Generator Summary

**Rule-based weekstudieplan-generator met bewerkbaar weekraster en persistente opslag in study_plans tabel**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-28T01:12:09Z
- **Completed:** 2026-02-28T01:14:54Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- `generateStudyPlan()` verdeelt sessies correct: stuck (>=2 episodes) = 3/week, assessed = 2/week, niet-assessed = 1/week
- `StudyPlanEditor` rendert een interactief weekraster (Ma-Vr x vakken) met minuten-invoer, gedaan-checkbox, en "Plan opslaan" knop met feedback
- `PUT /api/rapport/study-plan` slaat plan op via upsert op child_id — eigenaarschapscheck via profile.id
- Rapport pagina toont opgeslagen plan bij reload (persistent), of genereert automatisch bij eerste bezoek

## Task Commits

1. **Task 1: study-plan-generator + StudyPlanEditor** - `66ee2db` (feat)
2. **Task 2: study-plan API route + koppeling rapportpagina** - `189c280` (feat)

## Files Created/Modified

- `aruba-leren/src/lib/rapport/study-plan-generator.ts` - Pure generator: StudyPlanEntry interface + generateStudyPlan()
- `aruba-leren/src/components/rapport/StudyPlanEditor.tsx` - Client component: weekraster, edit-state, fetch PUT, feedback
- `aruba-leren/src/app/[locale]/api/rapport/study-plan/route.ts` - PUT route: auth + eigenaarschapscheck + upsert
- `aruba-leren/src/app/[locale]/dashboard/kind/[childId]/rapport/page.tsx` - Integreert StudyPlanEditor, SUBJECT_LABELS, initPlan-logica

## Decisions Made

- `generateStudyPlan()` als pure functie zonder AI: regels zijn deterministisch en testbaar, AI niet nodig voor eenvoudige tijdsallocatie
- Server Component bepaalt `initPlan` (opgeslagen of gegenereerd), geeft als prop aan `StudyPlanEditor` — duidelijke scheiding Server vs. Client
- `upsert` met `onConflict: 'child_id'` — idempotent, geen dubbele rijen per kind, geen extra lookup nodig
- `StudyPlanEditor` gebruikt `useParams()` voor locale in fetch-pad — vermijdt prop-drilling van locale door component-boom
- Stuck-vakken (>= 3 sessies in plan = stuck) krijgen amber kolomkop voor visuele aandacht

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - geen nieuwe external services. SQL migratie 012 (study_plans) was al aangemaakt in plan 11-01 en moet nog handmatig in Supabase SQL Editor worden uitgevoerd (staat als pending todo in STATE.md).

## Next Phase Readiness

- Studieplan volledig functioneel: genereren, bewerken, opslaan, persistent bij reload
- Plan 11-03 (deelbare rapport-link) kan het opgeslagen studieplan meenemen in report_data snapshot
- Plan 11-04 (PDF export) kan de StudyPlanEntry[] data opnemen in PDF layout

## Self-Check: PASSED

All files found on disk. Both task commits verified in git log.

| Check | Result |
|-------|--------|
| study-plan-generator.ts | FOUND |
| StudyPlanEditor.tsx | FOUND |
| study-plan/route.ts | FOUND |
| 11-02-SUMMARY.md | FOUND |
| commit 66ee2db | FOUND |
| commit 189c280 | FOUND |

---
*Phase: 11-rapportages-pdf-deling*
*Completed: 2026-02-28*
