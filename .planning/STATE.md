# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-12)

**Core value:** Kinderen op Aruba krijgen persoonlijke bijles die zich aanpast aan hun niveau, volledig zelfstandig, in hun eigen taal en context.

**Current focus:** Phase 8 — UI/UX Polish (Koko Avatar & Time Timer)

## Current Position

Phase: 8 of 11 IN PROGRESS — UI/UX Polish (Koko Avatar & Time Timer)
Plan: 2/2 complete (so far) — 08-01 KokoAvatar + 08-02 TimeTimer delivered
Status: Phase 8 in progress — TimeTimer visual countdown complete
Last activity: 2026-02-25 — 08-02 complete (TimeTimer SVG + SessionTimer wall-clock fix)

Progress: [████████████████████████████████████████████████████████████████████████████████████████████] 97%

## Performance Metrics

**Velocity:**
- Total plans completed: 15
- Total execution time: ~2.7 hours

**By Phase:**

| Phase | Plans | Status |
|-------|-------|--------|
| 01 - Foundation & Infrastructure | 3/3 | Complete |
| 02 - Authentication & Family Accounts | 3/3 | Complete |
| 03 - Payment Verification System | 3/3 | Complete |
| 04 - AI Tutor Core Foundations | 4/4 | Complete |
| 05 - Baseline Assessment & Progress Tracking | 4/4 | Complete |
| 06 - Advanced AI Features | 5/5 | Complete |

**Recent Executions:**

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 05 | 01 | 6 min | 2 | 5 |
| 05 | 02 | 15 min | 2 | 5 |
| 05 | 03 | 10 min | 2 | 5 |
| 05 | 04 | 45 min | 2+7fixes | 13 |
| 07 | 01 | 5 min | 2 | 3 |
| 07 | 02 | 4 min | 2 | 8 |
| Phase 08 P02 | 15 | 2 tasks | 2 files |
| Phase 08 P01 | 6 | 2 tasks | 5 files |

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
- 04-01: Claude Sonnet 4.5 as primary tutor model (cost-effective at $3/MTok input, ### Decisions

5/MTok output)
- 04-01: Prompt caching architecture (static base + guards first, dynamic parts after) reduces costs by ~90%
- 04-01: 7 Socratic guard scenarios with few-shot examples prevent direct answer giving
- 04-01: IGDI model phases integrated (instructie → geleide inoefening → diagnostische toets → individuele verwerking)
- 04-01: Age-based session duration limits (6 years = 8 min, 12 years = 25 min) match attention spans
- 04-01: Daily token limit of 50K per child controls costs (~$0.50/day max per child)
- 04-01: All 6 subjects have Arubaanse context (Florin currency, Hooiberg, Shoco bird, local examples)
- [Phase 04]: Session manager handles both creation and resumption with 30-minute activity window
- [Phase 04]: Rate limiter queries 24-hour rolling window from tutoring_sessions metadata (not separate table)
- [Phase 04]: Difficulty adjuster as pure functions (no DB calls) — caller controls persistence
- [Phase 04]: Vercel AI SDK v4 API: maxOutputTokens (not maxTokens), toTextStreamResponse() for text streaming
- 04-03: Custom streaming fetch instead of useChat (toTextStreamResponse is plain text, not AI data stream protocol)
- 04-03: Voice-first mode toggle enables large mic button + auto-TTS for younger children
- 04-03: [SPREEK]/[BORD] segment parsing in ChatMessage integrates with system prompt special blocks
- 04-03: SessionTimer uses router.back() for stop action (preserves navigation stack)
- 04-04: Null-as-indeterminate for wasCorrect: skip recordAnswer on neutral Koko responses to avoid false counter increments
- 04-04: Single updateSessionMetadata call in onFinish combines all updates (messages, tokens, answer counters, hints) to minimize DB round-trips
- 05-01: session_type column reuses tutoring_sessions table (not separate assessment_sessions) — avoids schema duplication
- 05-01: Read-then-write for stuck_concept_count instead of RPC — simpler, no Supabase function dependency
- 05-01: finishAssessment is idempotent: checks ended_at before writing to handle onFinish double-fire
- 05-01: LEVEL_NAMES exported from types/progress.ts for reuse across UI and assessment system prompt
- 05-02: isAssessment derived from currentSession.session_type in route.ts closure — captured correctly in onFinish
- 05-02: Assessment sessions skip difficulty adjuster — Koko manages level internally via CAT prompt algorithm
- 05-02: Stuck detection runs for both session types; level change tracking (recordProgressEvent) is tutoring-only
- 05-02: [ASSESSMENT_DONE] signal stripped from ChatInterface visible text using regex-replace (same as [SPREEK])
- 05-03: progressMap keyed by subject string for O(1) lookup — server component fetches, passes to client SubjectSelector
- 05-03: SubjectProgress handles both null and assessment_completed=false with same "Toets nodig" badge — simpler API
- 05-03: renderCard() helper in SubjectSelector deduplicates kern/zaak card rendering
- 05-04: Level names changed to star theme (Kleine Ster → Superster) — monkey theme not appropriate
- 05-04: Zaakvakken bypass assessment gate — direct to /tutor/ with info badge (content upload is Phase 6)
- 05-04: Begrijpend lezen disables TTS entirely — reading aloud defeats reading comprehension purpose
- 05-04: vakOverride placed as LAST section in buildSystemPrompt — highest Claude priority, prevents subject menus
- 05-04: Custom renderMarkdown() in ChatMessage instead of react-markdown — no external dependency
- [Phase 07]: ProgressSummaryCard renders all 6 subjects always — SubjectProgress handles null/no-assessment state
- [Phase 07]: 07-01: Vakantierooster link placed in dashboard header action buttons for persistent visibility
- [Phase 07]: 07-02: SchoolVacation type and getCurrentSchoolYear() in utils.ts (client-safe) — queries.ts re-exports, client components import from utils.ts to avoid next/headers bundler leak
- [Phase 07]: 07-02: Admin vakanties page is pure Server Component — VacationManager client wrapper owns showForm/selectedVacation state
- [Phase 07]: 07-02: revalidatePath('/', 'layout') covers all locale routes in one call after vacation mutations
- [Phase 08]: TimeTimer is a controlled/pure component: elapsed prop from parent, no internal interval
- [Phase 08]: 08-02: Wall-clock timer in SessionTimer: Date.now() - startTimeRef prevents drift
- [Phase 08]: 08-02: onComplete fires once via bellPlayedRef guard in TimeTimer

### Pending Todos

- Open issue: Koko nog steeds "genoeg geoefend" in bestaande sessies — nieuwe sessies (vers vak) zijn OK, maar DB-sessies met oude context blijven het herhalen. Mogelijke fix: session reset functie of MAX_CONTEXT_MESSAGES verlagen.
- SQL migratie 008 (leerstof_items) nog niet uitgevoerd in Supabase (voor productie)
- SQL migratie 009 (school_vacations) nog niet uitgevoerd in Supabase — run handmatig in SQL Editor

### Blockers/Concerns

- Geen harde blockers — alle features werken op nieuwe sessies

## Session Continuity

Last session: 2026-02-25
Stopped at: Completed 08-02-PLAN.md — TimeTimer SVG component + SessionTimer visual timer integration
Resume file: None

**Next action:** Execute Phase 8 Plan 03 (if exists) or check remaining plans in 08-ui-ux-polish-koko-avatar-time-timer
