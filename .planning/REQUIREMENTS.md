# Requirements: v1.1 — Production Launch

**Milestone:** v1.1 Production Launch
**Status:** Defining
**Created:** 2026-03-01

---

## v1.1 Requirements

### Deployment

- [ ] **DEPLOY-01**: Admin kan de app importeren in Vercel en een succesvolle build triggeren
- [ ] **DEPLOY-02**: Alle benodigde environment variables zijn geconfigureerd in Vercel (ANTHROPIC_API_KEY, OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, etc.)
- [ ] **DEPLOY-03**: Alle 4 pending SQL migrations zijn uitgevoerd in Supabase productie (008 leerstof_items, 009 school_vacations, 011 scratchpads, 012 report_tokens)
- [ ] **DEPLOY-04**: Google OAuth en Facebook OAuth zijn geconfigureerd met de productie callback URL in hun respectievelijke developer consoles

### QA — Authenticatie

- [ ] **QA-01**: Ouder kan een nieuw account aanmaken via email/wachtwoord op de productie-URL
- [ ] **QA-02**: Ouder kan inloggen via Google OAuth op de productie-URL
- [ ] **QA-03**: Ouder kan inloggen via Facebook OAuth op de productie-URL
- [ ] **QA-04**: Sessie blijft actief na browser refresh op de productie-URL

### QA — Betaling & Activering

- [ ] **QA-05**: Ouder kan een kindprofiel aanmaken en betalingsbewijs uploaden
- [ ] **QA-06**: Admin kan betaling goedkeuren en abonnement activeren in het admin panel
- [ ] **QA-07**: Kind krijgt na activering toegang tot de tutor

### QA — AI Tutor & Koko

- [ ] **QA-08**: Kind kan een bijlessessie starten voor elk van de 6 vakken
- [ ] **QA-09**: Koko geeft correcte Socratische responses (Claude API werkt in productie)
- [ ] **QA-10**: TTS spraak werkt correct (OpenAI TTS API werkt in productie)
- [ ] **QA-11**: Kind doorloopt de beginsituatietoets en krijgt een startniveau toegewezen
- [ ] **QA-12**: Whiteboard animaties werken correct in de browser
- [ ] **QA-13**: KaTeX wiskundige weergave werkt correct
- [ ] **QA-14**: Kladblaadje canvas werkt op mobiel (touch/pointer events)

### QA — Ouderportaal & Rapporten

- [ ] **QA-15**: Ouder ziet correcte voortgangskaarten per kind per vak
- [ ] **QA-16**: Voortgangsrapport genereert correct (Recharts grafieken zichtbaar)
- [ ] **QA-17**: Deelbare rapport-link met PIN-gate werkt correct
- [ ] **QA-18**: WhatsApp-deelknop werkt op mobiel

### QA — Admin Panel

- [ ] **QA-19**: Admin panel is bereikbaar en toont alle families en betalingen
- [ ] **QA-20**: Stuck-kind alerting is zichtbaar in het admin panel

### Bug Fixes

- [ ] **FIX-01**: "Genoeg geoefend" bug is onderzocht — oorzaak vastgesteld en opgelost of gedocumenteerd als out-of-scope (alleen in oude DB-sessies)
- [ ] **FIX-02**: Alle kritieke bugs gevonden tijdens de QA-ronde zijn opgelost vóór go-live

---

## Future Requirements (Deferred to v2.0)

- Offline oefenmodus
- Geavanceerde leeranalytics
- Milestone-vieringen en badges
- WhatsApp/Facebook community-integratie
- Leerkrachtportaal
- Volledige voice/audio-first modus

---

## Out of Scope (v1.1)

- Custom domeinnaam — vercel.app subdomein is voldoende voor nu
- Performance optimalisaties — die komen na echte gebruikersdata
- Monitoring/alerting systeem — te vroeg voor schaal
- Automatische SQL migration runner — handmatig uitvoeren is acceptabel voor eenpersoonsoperatie

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DEPLOY-01 | Phase 12 | Pending |
| DEPLOY-02 | Phase 12 | Pending |
| DEPLOY-03 | Phase 12 | Pending |
| DEPLOY-04 | Phase 12 | Pending |
| QA-01 | Phase 13 | Pending |
| QA-02 | Phase 13 | Pending |
| QA-03 | Phase 13 | Pending |
| QA-04 | Phase 13 | Pending |
| QA-05 | Phase 13 | Pending |
| QA-06 | Phase 13 | Pending |
| QA-07 | Phase 13 | Pending |
| QA-08 | Phase 13 | Pending |
| QA-09 | Phase 13 | Pending |
| QA-10 | Phase 13 | Pending |
| QA-11 | Phase 13 | Pending |
| QA-12 | Phase 13 | Pending |
| QA-13 | Phase 13 | Pending |
| QA-14 | Phase 13 | Pending |
| QA-15 | Phase 13 | Pending |
| QA-16 | Phase 13 | Pending |
| QA-17 | Phase 13 | Pending |
| QA-18 | Phase 13 | Pending |
| QA-19 | Phase 13 | Pending |
| QA-20 | Phase 13 | Pending |
| FIX-01 | Phase 13 | Pending |
| FIX-02 | Phase 13 | Pending |

Coverage: 26/26 v1.1 requirements mapped.

---

*Requirements created: 2026-03-01*
