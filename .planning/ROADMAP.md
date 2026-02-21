# Roadmap: ArubaLeren v1.0 MVP Launch

**Milestone:** v1.0 MVP Launch
**Created:** 2026-02-12
**Depth:** Standard (5-8 phases)
**Status:** In Progress

## Overview

This roadmap delivers a complete AI-powered tutoring platform where Arubaanse kinderen zelfstandig bijles krijgen van Koko in alle 6 vakken, met ouderportaal, admin panel, en drietalige interface. The 37 v1.0 requirements are organized into 7 phases that build on each other, starting with infrastructure and authentication, then delivering the core AI tutoring experience, followed by administrative features and polish.

**Core delivery:** Children receive autonomous, personalized tutoring from Koko (AI tutor) using the Socratic method, adapted to their level, with full parental oversight and manual payment verification suitable for the Arubaanse markt.

## Phases

### Phase 1: Foundation & Infrastructure

**Goal:** Project infrastructure is operational with secure database, trilingual routing, and privacy-compliant data handling.

**Dependencies:** None (starting point)

**Requirements Covered:** PRIV-01, PRIV-02, PRIV-03, PRIV-04, I18N-01, I18N-02

**Plans:** 3 plans

Plans:
- [x] 01-01-PLAN.md -- Wire next-intl routing and create header with language switcher
- [x] 01-02-PLAN.md -- Set up Supabase database with RLS and environment variables
- [x] 01-03-PLAN.md -- Create privacy policy page with trilingual content

**Success Criteria:**
1. Database tables created with Row Level Security (RLS) enabled and policies tested
2. User can switch UI between Nederlands, Papiamento, and Spaans with all labels translated
3. Privacy policy page is accessible and readable at 5th-grade level
4. All API keys stored in .env and excluded from git (verified via .gitignore test)
5. Deployment pipeline (Vercel) successfully builds and deploys with environment variables set

---

### Phase 2: Authentication & Family Accounts

**Goal:** Parents can create accounts, authenticate securely, and manage multiple child profiles.

**Dependencies:** Phase 1 (requires database and privacy infrastructure)

**Requirements Covered:** AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06

**Plans:** 3 plans

Plans:
- [x] 02-01-PLAN.md — Database schema + auth server actions
- [x] 02-02-PLAN.md — Login/signup UI + OAuth + session middleware
- [x] 02-03-PLAN.md — Child management dashboard + verification

**Success Criteria:**
1. Parent can create account via email/password and authenticate successfully
2. Parent can log in via Google OAuth and Facebook OAuth
3. Parent session persists across browser refresh (tested on Chromium, Firefox)
4. Parent can add multiple child profiles with voornaam, klas 1-6, and leeftijd
5. Parent gives explicit consent for AI-bijles via required checkbox during registration

---

### Phase 3: Payment Verification System

**Goal:** Parents can request access via manual payment, and admin can verify and grant access.

**Dependencies:** Phase 2 (requires parent accounts)

**Requirements Covered:** PAY-01, PAY-02, PAY-03, PAY-04, ADMIN-01, ADMIN-02

**Plans:** 3 plans

Plans:
- [ ] 03-01-PLAN.md — Database schema, storage setup, and shared utilities
- [ ] 03-02-PLAN.md — Parent payment request flow (upload proof, cash request, status page)
- [ ] 03-03-PLAN.md — Admin panel and subscription-based access control

**Success Criteria:**
1. Parent can upload betalingsbewijs (foto bankovermaking) with file validation
2. Parent can request contante betaling aanvraag
3. Admin can view openstaande betalingsverzoeken in admin panel
4. Admin can approve payment and activate abonnement
5. Platform access is blocked for families without active abonnement (tested with expired subscription)
6. Parent can select abonnementsperiode: per keer, per week, per maand, or per schooljaar

---

### Phase 4: AI Tutor - Core Foundations

**Goal:** Koko (AI tutor) is operational with Socratic method, Arubaanse context, and language flexibility.

**Dependencies:** Phase 2 (requires child profiles), Phase 1 (requires i18n infrastructure)

**Requirements Covered:** TUTOR-01, TUTOR-02, TUTOR-03, TUTOR-04, TUTOR-05, TUTOR-06, TUTOR-07

**Plans:** 4 plans

Plans:
- [x] 04-01-PLAN.md -- Types, Claude provider, and Koko prompt system (Socratic guards + 6 subjects)
- [x] 04-02-PLAN.md -- Streaming chat API, session manager, difficulty adjuster, rate limiter
- [x] 04-03-PLAN.md -- Child tutoring UI (child/subject selection + chat interface)
- [ ] 04-04-PLAN.md -- Gap closure: wire recordAnswer() + i18n string fixes

**Success Criteria:**
1. Child can select a vak from 6 options (Taal, Rekenen, Begrijpend Lezen, Geschiedenis, Aardrijkskunde, Kennis der Natuur) and start bijlessessie
2. Koko responds using Socratic method - tested with edge cases ("just tell me the answer", "I give up") confirms no direct answers given
3. Koko speaks Nederlands as primary instruction language, can switch to Papiamento or Spaans based on child's language preference
4. Koko uses Arubaanse context in all examples (Hooiberg, Florins, Shoco verified in sample responses)
5. Koko provides immediate feedback on answers (correct/incorrect with uitleg)
6. Koko adjusts moeilijkheidsgraad based on child performance (3 consecutive correct = harder, 3+ hints = easier)

---

### Phase 5: Baseline Assessment & Progress Tracking

**Goal:** Each child completes adaptive baseline assessment per vak, and progress is tracked accurately.

**Dependencies:** Phase 4 (requires AI tutor), Phase 2 (requires child profiles)

**Requirements Covered:** TOETS-01, TOETS-02, TOETS-03, PROG-01, PROG-02, PROG-03

**Plans:** 4 plans

Plans:
- [ ] 05-01-PLAN.md — SQL migration, types, assessment-manager, progress-tracker (data foundation)
- [ ] 05-02-PLAN.md — Assessment prompt, chat API integration, assessment page (assessment flow)
- [ ] 05-03-PLAN.md — Progress UI components and SubjectSelector assessment gate (progress display)
- [ ] 05-04-PLAN.md — Build verification and end-to-end human testing

**Success Criteria:**
1. Child completes beginsituatietoets via chat with Koko for selected vak
2. Assessment adapts moeilijkheid dynamically based on responses (verified with mock student data)
3. Assessment determines startniveau per vak at completion
4. Progress tracking captures data per kind, per vak, per niveau
5. Child sees own voortgang with visuele indicatoren (progress bars, level badges)
6. System flags when child vastloopt 3x achtereen on a concept (triggers notification)

---

### Phase 6: Advanced Tutor Features & Content Management

**Goal:** Extended tutoring capabilities including PDF werkbladen, huiswerk support, targeted hiaten practice, and leerstof uploading.

**Dependencies:** Phase 4 (requires AI tutor core), Phase 5 (requires progress tracking)

**Requirements Covered:** TUTOR-08, TUTOR-09, TUTOR-10, TUTOR-11, TUTOR-12, ADMIN-06

**Plans:** 5 plans

Plans:
- [x] 06-01-PLAN.md — Hiaten selection: topic chips + HIAAT_TOPICS + kerndoelen tussendoelen
- [x] 06-02-PLAN.md — PDF werkblad: [OPDRACHT] tag + react-to-print v3 print button
- [x] 06-03-PLAN.md — Leerstof upload & injection: pdf-parse + migration 008 + admin page
- [x] 06-04-PLAN.md — Huiswerk session mode: buildHuiswerkPrompt + auto-send on image attach
- [x] 06-05-PLAN.md — End-to-end build verification and human testing checkpoint

**Success Criteria:**
1. Koko generates printable PDF-werkbladen after successful practice sessions
2. Child can use Koko to complete huiswerk via app (upload assignment, receive guided support)
3. Child can select specific hiaten (bijv. breuken, ontleden, samenvatten) for targeted practice
4. Kernvakken follow Arubaanse Kerndoelen and leerlijnen for klas 1-6 (verified with curriculum mapping document)
5. Leerkracht/bijlesmeneer can upload leerstof for zaakvakken as text or PDF
6. Admin can view and manage uploaded leerstof in admin panel

---

### Phase 7: Parent Portal & Admin Monitoring

**Goal:** Parents have full visibility into child progress, and admin can monitor platform health and user needs.

**Dependencies:** Phase 5 (requires progress tracking), Phase 3 (requires payment system)

**Requirements Covered:** OUDER-01, OUDER-02, OUDER-03, OUDER-04, OUDER-05, ADMIN-03, ADMIN-04, ADMIN-05

**Plans:** 4 plans

Plans:
- [ ] 07-01-PLAN.md — Parent dashboard with progress cards and per-child detail page (OUDER-01, OUDER-02, OUDER-03)
- [ ] 07-02-PLAN.md — Vacation calendar: migration + parent view + admin CRUD (OUDER-05, ADMIN-05)
- [ ] 07-03-PLAN.md — Admin families overview with stuck alerts + admin landing links (ADMIN-03, ADMIN-04)
- [ ] 07-04-PLAN.md — Weekly progress email via Supabase Edge Function + Resend + pg_cron (OUDER-04)

**Success Criteria:**
1. Parent views dashboard showing voortgang per kind, per vak with visual charts
2. Parent can edit and add kindprofielen from dashboard
3. Parent can view abonnementsstatus and betalingsgeschiedenis
4. Parent receives wekelijks automated voortgangsbericht per kind via email
5. Parent can view vakantierooster with Arubaanse schoolvakanties
6. Admin views overzicht of all families and kinderen
7. Admin receives melding when a child fails to grasp concept 3x achtereen
8. Admin can manage vakantierooster (add/edit Arubaanse schoolvakanties)

---

## Progress Tracking

| Phase | Requirements | Status | Progress |
|-------|--------------|--------|----------|
| Phase 1: Foundation & Infrastructure | 6 | Complete | 100% |
| Phase 2: Authentication & Family Accounts | 6 | Complete | 100% |
| Phase 3: Payment Verification System | 6 | Pending | 0% |
| Phase 4: AI Tutor - Core Foundations | 7 | In Progress | 85% |
| Phase 5: Baseline Assessment & Progress Tracking | 6 | Planning | 0% |
| Phase 6: Advanced Tutor Features & Content Management | 5 | Complete | 100% |
| Phase 7: Parent Portal & Admin Monitoring | 8 | Planning | 0% |

**Total:** 45 requirement mappings (some requirements appear in multiple phases due to incremental delivery)

**Note:** Requirements TUTOR-01 through TUTOR-07 deliver core tutoring in Phase 4; TUTOR-08 through TUTOR-12 add advanced features in Phase 6. This phased approach enables early testing of core AI tutor while deferring complex features.

## Coverage Validation

**Total v1.0 requirements:** 37
**Requirements mapped:** 37
**Unmapped requirements:** 0

All requirements covered across 7 phases.

## Research Integration

Research findings from ARCHITECTURE.md, FEATURES.md, PITFALLS.md, and STACK.md inform the following phase-level decisions:

**Phase 1 (Foundation):**
- RLS must be enabled before any data collection (PITFALLS: Forgetting RLS)
- next-intl 3.x for drietalige support (STACK: i18n recommendation)
- Privacy-first design to meet COPPA compliance (PITFALLS: Data collection violations)

**Phase 4 (AI Tutor Core):**
- Socratic method prompt engineering critical (PITFALLS: AI breaking contract)
- Rate limiting and token budgets required from day 1 (PITFALLS: Uncontrolled Claude costs)
- Age-appropriate language validation (PITFALLS: Adult-level vocabulary)

**Phase 5 (Assessment & Progress):**
- Mastery-based tracking, not just completion (PITFALLS: Progress inaccuracy)
- Adaptive difficulty based on hints, retries, time (FEATURES: Table stakes)

**Phase 6 (Advanced Features):**
- react-to-print v3 for PDF werkbladen (NOT @react-pdf/renderer — crashes in Next.js App Router)
- Text injection into system prompt for leerstof (NOT RAG — simpler for MVP scale)
- huiswerkMode as JSONB flag in session metadata (avoids DB CHECK constraint change)

**Phase 7 (Parent Portal):**
- Mobile-first dashboard (FEATURES: 73% parent access on mobile)
- Automated weekly reports (FEATURES: Parent communication expectation)
- Resend via Supabase Edge Function for emails (no npm install needed)
- pg_cron for weekly scheduling (free, survives deploys)
- Pure Tailwind for progress visualization (no Recharts needed)

---

*Roadmap created: 2026-02-12*
*Last updated: 2026-02-21*
