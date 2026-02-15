# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-12)

**Core value:** Kinderen op Aruba krijgen persoonlijke bijles die zich aanpast aan hun niveau, volledig zelfstandig, in hun eigen taal en context.

**Current focus:** Phase 4 in progress — AI Tutor Core Foundations

## Current Position

Phase: 4 of 7 (AI Tutor Core Foundations)
Plan: 1 of 4 (04-01 complete)
Status: In progress
Last activity: 2026-02-15 — Completed 04-01 (tutoring types, Claude provider, Koko prompts)

Progress: [████████████████████████████████░░░░░░░░░░░░░░░░░░░░] 43%

## Performance Metrics

**Velocity:**
- Total plans completed: 10
- Total execution time: ~1.4 hours

**By Phase:**

| Phase | Plans | Status |
|-------|-------|--------|
| 01 - Foundation & Infrastructure | 3/3 | Complete |
| 02 - Authentication & Family Accounts | 3/3 | Complete |
| 03 - Payment Verification System | 3/3 | Complete |
| 04 - AI Tutor Core Foundations | 1/4 | In progress |

**Recent Executions:**

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 03 | 02 | 7 min | 2 | 8 |
| 03 | 03 | 8 min | 2 | 7 |
| 04 | 01 | 6 min | 2 | 6 |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Roadmap: Use 7-phase structure (foundation → core features → advanced features → polish)
- Roadmap: Split AI tutor into Phase 4 (core) and Phase 6 (advanced) for early validation
- Roadmap: Payment system in Phase 3 before AI tutor (revenue model operational first)
- Roadmap: Drietalige support in Phase 1 (infrastructure cannot be retrofitted)
- 01-01: Use getTranslations instead of useTranslations in async Server Components
- 01-01: Root layout minimal pass-through, [locale]/layout handles providers
- 01-01: Header Server Component, LanguageSwitcher Client Component pattern
- 01-02: Supabase with profiles + children tables, RLS enabled
- 01-03: Privacy page uses getTranslations (server component)
- UI: Kid-friendly design with Koko monkey mascot, sky-blue/amber theme, SVG icons
- 02-01: All signups default to 'parent' role, children added later by parent
- 02-01: Consent tracking stored at profile level with boolean + timestamp
- 02-01: Auth trigger creates profile automatically on auth.users INSERT
- 02-01: Server actions translate Supabase errors to Dutch for user-facing messages
- 02-02: Client components for forms to handle server action errors with local state
- 02-02: Middleware refreshes Supabase session before next-intl routing (layered approach)
- 02-02: OAuth redirects to /dashboard on success, /login on error
- 02-02: Consent checkbox renders in amber-highlighted section for visibility
- 02-03: Client-side redirect after auth (router.push) instead of server-side redirect() to preserve cookies
- 02-03: profiles.id is auto-generated UUID, user_id references auth.users — all lookups must use user_id
- 02-03: Disable email confirmation for development (re-enable for production)
- 03-02: Two-step form UX (period first, then method) reduces cognitive load for parents
- 03-02: File validation on both client (UX) and server (security with magic bytes)
- 03-03: Server-side subscription check in dashboard (not client-side guard) avoids hydration issues and provides defense-in-depth
- 03-03: Admin users bypass subscription check (isAdmin flag from app_metadata)
- 03-03: Payment proof images use signed URLs with 1-hour expiry for security
- 03-03: Approve action upserts subscription (handles both new and renewal cases)
- 03-03: Admin panel uses dark header (bg-gray-900) for visual distinction from parent UI
- 04-01: Claude Sonnet 4.5 as primary tutor model (cost-effective at $3/MTok input, $15/MTok output)
- 04-01: Prompt caching architecture (static base + guards first, dynamic parts after) reduces costs by ~90%
- 04-01: 7 Socratic guard scenarios with few-shot examples prevent direct answer giving
- 04-01: IGDI model phases integrated (instructie → geleide inoefening → diagnostische toets → individuele verwerking)
- 04-01: Age-based session duration limits (6 years = 8 min, 12 years = 25 min) match attention spans
- 04-01: Daily token limit of 50K per child controls costs (~$0.50/day max per child)
- 04-01: All 6 subjects have Arubaanse context (Florin currency, Hooiberg, Shoco bird, local examples)

### Pending Todos

- Phase 4: ✅ DONE (04-01) — Koko hints/suggesties voor spellingcorrectie (phonetic hints in Socratic guards)
- Phase 4: ✅ DONE (04-01) — IGDI-model geïntegreerd in prompt system
- Phase 4: ✅ DONE (04-01) — Lesduur per leeftijd (SESSION_DURATION_BY_AGE constants)

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-15
Stopped at: Completed 04-01 (AI tutor foundation: types, Claude provider, Koko prompt system)
Resume file: None

**Next action:** Continue Phase 4 — Execute plan 04-02 (tutoring session API and conversation flow)
