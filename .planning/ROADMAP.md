# Roadmap: ArubaLeren

## Milestones

- ✅ **v1.0 MVP Launch** — Phases 1–11 (shipped 2026-03-01)
- 🔄 **v1.1 Production Launch** — Phases 12–13 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP Launch (Phases 1–11) — SHIPPED 2026-03-01</summary>

- [x] Phase 1: Foundation & Infrastructure (3 plans) — completed 2026-02-14
- [x] Phase 2: Authentication & Family Accounts (3 plans) — completed 2026-02-16
- [x] Phase 3: Payment Verification System (3 plans) — completed 2026-02-18
- [x] Phase 4: AI Tutor Core Foundations (4 plans) — completed 2026-02-20
- [x] Phase 5: Baseline Assessment & Progress Tracking (4 plans) — completed 2026-02-22
- [x] Phase 6: Advanced Tutor Features & Content Management (5 plans) — completed 2026-02-24
- [x] Phase 7: Parent Portal & Admin Monitoring (4 plans) — completed 2026-02-25
- [x] Phase 8: UI/UX Polish — Koko Avatar & Time Timer (2 plans) — completed 2026-02-26
- [x] Phase 9: Visuele Leerondersteuning (4 plans) — completed 2026-02-27
- [x] Phase 10: Neural TTS & Uitspraak (4 plans) — completed 2026-02-28
- [x] Phase 11: Rapportages & PDF-Deling (4 plans) — completed 2026-02-28

Full details: [.planning/milestones/v1.0-ROADMAP.md](.planning/milestones/v1.0-ROADMAP.md)

</details>

---

## v1.1 — Production Launch

### Overview

Twee fasen brengen het volledige v1.0 platform naar productie. Fase 12 richt de infrastructuur in zodat de app draait. Fase 13 verifieert dat elke feature werkt zoals bedoeld voor echte gebruikers en lost kritieke bugs op voor go-live.

### Phases

| # | Phase | Goal | Requirements |
|---|-------|------|--------------|
| 12 | Productie Deployment | App draait live op Vercel met werkende database en OAuth | DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-04 |
| 13 | QA & Bug Fixes | Alle user flows zijn geverifieerd op productie en kritieke bugs zijn opgelost | QA-01 t/m QA-20, FIX-01, FIX-02 |

### Phase Details

---

**Phase 12: Productie Deployment**

Goal: Het platform is live op Vercel, de Supabase productiedatabase heeft alle benodigde tabellen, en OAuth-logins werken via de productie-URL.

Requirements: DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-04

Dependencies: Geen (startpunt v1.1)

Success criteria:
1. De app is bereikbaar op de productie-URL (vercel.app) en toont de landingspagina zonder build- of runtime-fouten.
2. Alle 4 pending SQL migrations (008, 009, 011, 012) zijn uitgevoerd — de tabellen `leerstof_items`, `school_vacations`, `scratchpads` en `report_tokens` bestaan in de productiedatabase.
3. Inloggen via Google OAuth op de productie-URL leidt correct terug naar de app (geen OAuth-redirect fout).
4. Inloggen via Facebook OAuth op de productie-URL leidt correct terug naar de app (geen OAuth-redirect fout).
5. De Vercel environment variables zijn compleet — Claude API, OpenAI API, en Supabase keys geven geen 500-errors op API-routes.

---

**Phase 13: QA & Bug Fixes**

Goal: Elke user flow van account aanmaken tot actieve bijlessessie is end-to-end geverifieerd op productie, en geen enkele kritieke bug blokkeert een echte gebruiker.

Requirements: QA-01, QA-02, QA-03, QA-04, QA-05, QA-06, QA-07, QA-08, QA-09, QA-10, QA-11, QA-12, QA-13, QA-14, QA-15, QA-16, QA-17, QA-18, QA-19, QA-20, FIX-01, FIX-02

Dependencies: Phase 12 (live deployment + database vereist)

Success criteria:
1. Een ouder kan op productie een account aanmaken, een kindprofiel toevoegen, betalingsbewijs uploaden, en nadat de admin het abonnement activeert kan het kind direct een bijlessessie starten — de volledige onboarding-flow werkt zonder handmatige interventie.
2. Koko reageert correct in alle 6 vakken: Socratische aanpak, correcte taal (nl/pap/es/en), TTS-spraak hoorbaar, whiteboard-animaties zichtbaar, en KaTeX-formules correct gerenderd.
3. Het ouderportaal toont actuele voortgangskaarten per vak, het rapport genereert met Recharts-grafieken, en de deelbare rapport-link met PIN-gate is bereikbaar voor derden.
4. Het admin panel toont alle families, betalingen en stuck-kind-alerts — de admin kan een betaling goedkeuren en het abonnement activeren zonder directe database-toegang.
5. De "genoeg geoefend" bug is onderzocht: oorzaak vastgesteld en ofwel opgelost, ofwel gedocumenteerd als beperkt tot oude DB-sessies en daarmee geaccepteerd.

---

### Coverage

| Requirement | Phase |
|-------------|-------|
| DEPLOY-01 | 12 |
| DEPLOY-02 | 12 |
| DEPLOY-03 | 12 |
| DEPLOY-04 | 12 |
| QA-01 | 13 |
| QA-02 | 13 |
| QA-03 | 13 |
| QA-04 | 13 |
| QA-05 | 13 |
| QA-06 | 13 |
| QA-07 | 13 |
| QA-08 | 13 |
| QA-09 | 13 |
| QA-10 | 13 |
| QA-11 | 13 |
| QA-12 | 13 |
| QA-13 | 13 |
| QA-14 | 13 |
| QA-15 | 13 |
| QA-16 | 13 |
| QA-17 | 13 |
| QA-18 | 13 |
| QA-19 | 13 |
| QA-20 | 13 |
| FIX-01 | 13 |
| FIX-02 | 13 |

Total v1.1 requirements: 26/26 mapped.

---

## Progress

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1. Foundation & Infrastructure | v1.0 | 3/3 | ✅ Complete | 2026-02-14 |
| 2. Authentication & Family Accounts | v1.0 | 3/3 | ✅ Complete | 2026-02-16 |
| 3. Payment Verification System | v1.0 | 3/3 | ✅ Complete | 2026-02-18 |
| 4. AI Tutor Core Foundations | v1.0 | 4/4 | ✅ Complete | 2026-02-20 |
| 5. Baseline Assessment & Progress Tracking | v1.0 | 4/4 | ✅ Complete | 2026-02-22 |
| 6. Advanced Tutor Features & Content Management | v1.0 | 5/5 | ✅ Complete | 2026-02-24 |
| 7. Parent Portal & Admin Monitoring | v1.0 | 4/4 | ✅ Complete | 2026-02-25 |
| 8. UI/UX Polish — Koko Avatar & Time Timer | v1.0 | 2/2 | ✅ Complete | 2026-02-26 |
| 9. Visuele Leerondersteuning | v1.0 | 4/4 | ✅ Complete | 2026-02-27 |
| 10. Neural TTS & Uitspraak | v1.0 | 4/4 | ✅ Complete | 2026-02-28 |
| 11. Rapportages & PDF-Deling | v1.0 | 4/4 | ✅ Complete | 2026-02-28 |
| 12. Productie Deployment | v1.1 | 0/? | Pending | — |
| 13. QA & Bug Fixes | v1.1 | 0/? | Pending | — |

---

*Roadmap created: 2026-02-12*
*Last updated: 2026-03-01 — v1.1 milestone added, phases 12–13 defined*
