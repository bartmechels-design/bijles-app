---
phase: 04
plan: 02
subsystem: ai-tutor-core
tags: [api, streaming, session-management, rate-limiting, difficulty-adjustment, supabase]
dependency_graph:
  requires: [tutoring-types, ai-provider, koko-prompts, socratic-guards]
  provides: [chat-api, session-manager, difficulty-adjuster, rate-limiter]
  affects: [future-chat-ui, conversation-flow, cost-control]
tech_stack:
  added: [vercel-ai-sdk-streaming, supabase-rls]
  patterns: [streaming-response, token-budget-enforcement, adaptive-difficulty, session-resumption]
key_files:
  created:
    - aruba-leren/src/lib/tutoring/session-manager.ts
    - aruba-leren/src/lib/tutoring/difficulty-adjuster.ts
    - aruba-leren/src/lib/ai/rate-limiter.ts
    - aruba-leren/src/app/[locale]/api/tutor/chat/route.ts
  modified: []
decisions:
  - decision: "Session manager handles both creation and resumption with 30-minute activity window"
    rationale: "30 minutes balances user convenience (can pause and resume) with data freshness (stale sessions auto-expire)"
    alternatives: ["Always create new session (loses context)", "Never expire (memory bloat)", "5-minute window (too aggressive)"]
  - decision: "Rate limiter queries 24-hour rolling window from tutoring_sessions metadata"
    rationale: "Simpler than separate token_usage table, accurate for budget enforcement, leverages existing data"
    alternatives: ["Separate token_usage table (overkill)", "Per-session limit (interrupts mid-conversation)", "No limit (cost risk)"]
  - decision: "Difficulty adjuster is pure function (no DB calls)"
    rationale: "Separates logic from persistence — testable, composable, caller controls when to persist changes"
    alternatives: ["Integrated with session manager (tight coupling)", "Auto-persist (side effects hidden)"]
  - decision: "Chat API extracts locale from URL path params for language detection"
    rationale: "Next.js [locale] route provides natural language context, aligns with rest of app routing"
    alternatives: ["Request header (inconsistent)", "Query param (ugly URLs)", "Body param (redundant with locale)"]
  - decision: "Streaming uses toTextStreamResponse() for standard text streaming"
    rationale: "Vercel AI SDK v4 changed API from toDataStreamResponse to toTextStreamResponse for simple text streams"
    alternatives: ["toDataStreamResponse (deprecated for text-only)", "Custom streaming (reinventing wheel)"]
metrics:
  duration_minutes: 5
  tasks_completed: 2
  files_created: 4
  commits: 2
  completed_at: "2026-02-15"
---

# Phase 04 Plan 02: Tutoring Session API and Conversation Flow

**One-liner**: Streaming chat API route with Supabase session management, adaptive 3-correct-up/3-incorrect-down difficulty adjustment, 50K daily token budget per child, and full authentication/ownership verification.

## What Was Built

### Session Manager (session-manager.ts)

Complete CRUD operations for tutoring sessions and messages with Supabase persistence:

**Exported functions:**
- `createSession(childId, subject)` — Creates new session with default metadata (difficulty 1, IGDI instructie phase)
- `getSession(sessionId)` — Fetches session by ID
- `getActiveSession(childId, subject)` — Finds resumable session (not ended, active within 30 min)
- `saveMessage(sessionId, role, content, metadata)` — Persists message and updates session activity timestamp
- `getRecentMessages(sessionId, limit=15)` — Loads conversation context for AI (ordered chronologically)
- `updateSessionMetadata(sessionId, metadata)` — Updates performance counters, IGDI phase, difficulty
- `endSession(sessionId)` — Sets ended_at timestamp

**Supabase schema:**
- `tutoring_sessions` table: id, child_id, subject, difficulty_level (1-5), started_at, last_activity_at, ended_at, metadata (JSONB)
- `tutoring_messages` table: id, session_id, role (user/assistant), content, metadata (JSONB), created_at
- Indexes on child_id, (child_id, subject), session_id, (session_id, created_at) for query performance
- RLS policies: Parents can only access sessions/messages for their own children (via children → profiles → auth.uid() join)

**Key design patterns:**
- Server-side only (uses `createClient` from `@/lib/supabase/server`)
- Validates child existence before creating session (prevents orphaned records)
- 30-minute activity window for session resumption (balances UX and data freshness)
- Metadata stored as JSONB for flexibility (consecutive_correct, consecutive_incorrect, total_hints_given, total_messages, tokens_used, igdi_phase)

### Difficulty Adjuster (difficulty-adjuster.ts)

Pure functions implementing adaptive difficulty algorithm:

**`adjustDifficulty(session)`:**
- Increase difficulty: 3 consecutive correct AND difficulty < 5 → +1 level
- Decrease difficulty: 3 consecutive incorrect OR 3+ hints given AND difficulty > 1 → -1 level
- No change: Otherwise
- Returns `DifficultyAdjustment` with newDifficulty, Dutch instruction for AI prompt, and reason

**`recordAnswer(session, wasCorrect)`:**
- If correct: increment consecutive_correct, reset consecutive_incorrect, reset hints
- If incorrect: increment consecutive_incorrect, reset consecutive_correct
- Returns partial metadata to merge (caller persists to DB)

**Design rationale:**
- Pure functions (no side effects, no DB calls) — easy to test, composable
- Caller controls when to persist changes (separation of concerns)
- Dutch instructions injected into AI prompt to guide next question difficulty

### Rate Limiter (rate-limiter.ts)

Token budget enforcement per child per day:

**`checkTokenBudget(childId)`:**
- Queries `tutoring_sessions` for last 24 hours (rolling window)
- Sums `metadata.tokens_used` across all sessions
- Compares against `DAILY_TOKEN_LIMIT` (50K from anthropic.ts)
- Returns `TokenBudget` with allowed (boolean), remaining, dailyLimit, used

**`recordTokenUsage(sessionId, tokensUsed)`:**
- Fetches current session metadata
- Increments `tokens_used` by new amount
- Updates session in Supabase

**Cost control:**
- 50K tokens/day ≈ $0.50/day max per child at Claude Sonnet 4.5 pricing
- Rolling 24-hour window (not midnight-reset) for smoother limits
- On error, allows request (fail-open to prevent blocking users)

### Streaming Chat API Route (route.ts)

POST `/[locale]/api/tutor/chat` — Full request lifecycle:

**1. Authentication & Authorization:**
- Parse JSON body: messages, sessionId (optional), subject, childId
- Validate required fields (400 if missing)
- Authenticate user via `supabase.auth.getUser()` (401 if not logged in)
- Fetch parent profile by user_id (401 if no profile)
- Verify child ownership: child.parent_id === profile.id (403 if not owned)
- Fetch child info (first_name, age, grade) for prompt context

**2. Rate Limiting:**
- Call `checkTokenBudget(childId)`
- If not allowed, return 429 with Dutch error message

**3. Session Management:**
- If sessionId provided: fetch session, validate it belongs to childId
- Else: try `getActiveSession(childId, subject)` to resume
- Else: create new session with `createSession(childId, subject)`

**4. Context Loading:**
- Fetch last 15 messages with `getRecentMessages(sessionId, MAX_CONTEXT_MESSAGES)`
- Extract latest user message from request
- Save user message to DB immediately (before AI call)

**5. Difficulty Adjustment:**
- Call `adjustDifficulty(session)`
- If adjustment needed, append Dutch instruction to system prompt
- Reset performance counters in session metadata

**6. System Prompt Building:**
- Extract locale from URL path params (Next.js [locale] route)
- Call `buildSystemPrompt(subject, locale, childAge, childName, difficultyLevel, igdiPhase)`
- Append difficulty adjustment instruction if applicable

**7. AI Streaming:**
- Call `streamText()` with:
  - `model: TUTOR_MODEL` (Claude Sonnet 4.5)
  - `system: systemPrompt` (Koko personality + guards + subject + language + context)
  - `messages: conversationMessages` (last 15 + new user message)
  - `maxOutputTokens: MAX_TOKENS_PER_RESPONSE` (1024)
  - `temperature: TEMPERATURE` (0.7)
  - `onFinish: async ({ text, usage })` → save assistant message, record token usage, update session metadata

**8. Response:**
- Return `result.toTextStreamResponse()` for streaming text to client

**Error handling:**
- 400: Invalid request (missing fields, invalid session)
- 401: Not authenticated or profile not found
- 403: Child ownership verification failed
- 404: Child not found
- 429: Daily token budget exceeded
- 500: Generic server error
- 502: Anthropic API error (don't expose API details)

**Key patterns:**
- Vercel AI SDK v4 API: `maxOutputTokens` (not `maxTokens`), `toTextStreamResponse()` (not `toDataStreamResponse()`)
- Locale extracted from URL path params (Next.js [locale] directory structure)
- Token usage tracked in onFinish callback after streaming completes
- All DB operations use server-side Supabase client (RLS enforced)
- Ownership check prevents parents from accessing other parents' children

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

All verification criteria passed:

1. ✅ TypeScript compilation: `npx tsc --noEmit` — no errors
2. ✅ SQL schema comments present at top of session-manager.ts
3. ✅ All 7 exported functions in session manager have correct signatures
4. ✅ Rate limiter uses DAILY_TOKEN_LIMIT constant (not hardcoded value)
5. ✅ Difficulty adjuster is pure function (no side effects, no DB calls)
6. ✅ Session manager uses `createClient` from supabase/server (not client)
7. ✅ Route exports POST function
8. ✅ Auth check returns 401 for unauthenticated requests
9. ✅ Ownership check returns 403 for non-owned children
10. ✅ Rate limit check returns 429 when budget exceeded
11. ✅ streamText is called with TUTOR_MODEL (not hardcoded model string)
12. ✅ onFinish callback saves message and records token usage
13. ✅ Error handling returns appropriate HTTP status codes

## Key Technical Decisions

### 1. 30-Minute Session Activity Window
**Decision**: `getActiveSession()` considers sessions active if `last_activity_at > now - 30min` AND `ended_at IS NULL`.

**Why**: Balances user convenience with data freshness. Kids can take a bathroom break or get a snack without losing context, but sessions don't linger forever.

**Alternative considered**: 5-minute window (too aggressive, frustrating UX) or never expire (memory bloat, stale context).

### 2. Pure Difficulty Adjuster Functions
**Decision**: `adjustDifficulty()` and `recordAnswer()` are pure functions that return new values without persisting.

**Why**: Separation of concerns. Logic is testable without DB mocks. Caller decides when to persist (e.g., only on successful AI response, not on every answer).

**Implementation**: Chat API calls adjuster, gets instruction, then explicitly calls `updateSessionMetadata()` to persist.

### 3. Rate Limiter Queries Sessions Table (Not Separate Table)
**Decision**: Sum `metadata.tokens_used` from `tutoring_sessions` instead of creating dedicated `token_usage` table.

**Why**: Simpler architecture, fewer tables, accurate for budget enforcement. Token usage is already tracked per session.

**Trade-off**: Slightly more complex query (join sessions for 24-hour window), but Supabase indexes make it fast enough.

**Future**: If we need per-message token tracking for analytics, can add separate table later.

### 4. Streaming API Uses Vercel AI SDK v4
**Decision**: Use `maxOutputTokens` (not `maxTokens`) and `toTextStreamResponse()` (not `toDataStreamResponse()`).

**Why**: Vercel AI SDK v4 changed parameter names and method names. Following latest API prevents deprecation warnings.

**Evidence**: TypeScript errors guided us to correct API (maxTokens → maxOutputTokens, toDataStreamResponse → toTextStreamResponse).

### 5. Locale from URL Path Params (Not Request Header or Body)
**Decision**: Extract locale from `context.params.locale` (Next.js [locale] route param).

**Why**: Consistent with rest of app routing. Next.js already handles locale extraction via next-intl. No need to pass locale in request body (redundant).

**Pattern**: Request to `/nl/api/tutor/chat` automatically has `locale = 'nl'`.

### 6. Immediate User Message Persistence
**Decision**: Save user message to DB **before** calling AI (not after).

**Why**: If AI call fails, we don't lose the user's question. Can retry later or show error without asking user to re-type.

**Trade-off**: Orphaned user messages if AI call fails, but that's better than losing user input.

### 7. Session Metadata as JSONB (Not Separate Columns)
**Decision**: Store `consecutive_correct`, `consecutive_incorrect`, `total_hints_given`, `tokens_used`, `igdi_phase` in JSONB metadata column.

**Why**: Flexibility for future additions without schema migrations. Supabase JSONB indexes are fast. TypeScript types provide compile-time safety despite DB flexibility.

**Pattern**: Best of both worlds — structured types in code, flexible storage in DB.

## Testing Notes

**TypeScript compilation verified:** All types correctly defined and imported.

**Manual verification performed:**
- ✅ Session manager has 7 exported functions (grep count)
- ✅ Rate limiter imports DAILY_TOKEN_LIMIT from anthropic.ts (no hardcoded 50000)
- ✅ Difficulty adjuster has no DB calls (pure functions)
- ✅ Chat API returns 401, 403, 429 status codes (grep confirmed)
- ✅ streamText called with TUTOR_MODEL (not hardcoded "claude-sonnet-4-5-20250514")
- ✅ onFinish callback saves message and records token usage (grep confirmed)

**SQL schema ready:** Comments at top of session-manager.ts include full CREATE TABLE statements with RLS policies. User needs to run in Supabase SQL Editor before first use.

## Impact on System

**Immediate:**
- Backend infrastructure complete for AI tutor conversations
- Session persistence enables conversation context across multiple exchanges
- Rate limiting prevents cost overruns
- Adaptive difficulty improves learning outcomes

**Future plans enabled:**
- 04-03: Chat UI (will call POST /[locale]/api/tutor/chat with streaming)
- 04-04: Session history (uses tutoring_sessions and tutoring_messages tables)
- Phase 6: Advanced tutoring features (performance analytics, parent dashboard)

**Cost implications:**
- 50K token daily limit = ~$0.50/day max per child
- Context window limited to 15 messages = 5-10 back-and-forth exchanges
- Prompt caching (from 04-01) reduces costs by ~90% after first session

**Security:**
- RLS policies ensure parents can only access their own children's data
- Ownership verification in API route provides defense-in-depth (even if RLS fails)
- Server-side Supabase client prevents client-side auth bypass

## Next Steps

Plan 04-03 will:
1. Create chat UI component with streaming message display
2. Add subject selection interface
3. Implement real-time typing indicators
4. Add session end/restart controls
5. Show remaining daily token budget to parent

## SQL Migration Required

**IMPORTANT:** Run the following SQL in Supabase Dashboard > SQL Editor before using the chat API:

```sql
-- Run this in Supabase SQL Editor
CREATE TABLE IF NOT EXISTS tutoring_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  subject TEXT NOT NULL CHECK (subject IN ('taal', 'rekenen', 'begrijpend_lezen', 'geschiedenis', 'aardrijkskunde', 'kennis_der_natuur')),
  difficulty_level INT NOT NULL DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{"consecutive_correct": 0, "consecutive_incorrect": 0, "total_hints_given": 0, "total_messages": 0, "tokens_used": 0, "igdi_phase": "instructie"}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tutoring_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES tutoring_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tutoring_sessions_child_id ON tutoring_sessions(child_id);
CREATE INDEX IF NOT EXISTS idx_tutoring_sessions_child_subject ON tutoring_sessions(child_id, subject);
CREATE INDEX IF NOT EXISTS idx_tutoring_messages_session_id ON tutoring_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_tutoring_messages_session_created ON tutoring_messages(session_id, created_at);

-- RLS policies
ALTER TABLE tutoring_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutoring_messages ENABLE ROW LEVEL SECURITY;

-- Parents can view/create sessions for their own children
CREATE POLICY "Parents can manage their children's sessions"
  ON tutoring_sessions
  FOR ALL
  USING (
    child_id IN (
      SELECT c.id FROM children c
      JOIN profiles p ON c.parent_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Parents can view/create messages for their children's sessions
CREATE POLICY "Parents can manage their children's messages"
  ON tutoring_messages
  FOR ALL
  USING (
    session_id IN (
      SELECT ts.id FROM tutoring_sessions ts
      JOIN children c ON ts.child_id = c.id
      JOIN profiles p ON c.parent_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );
```

## Self-Check: PASSED

All created files verified to exist:
```
FOUND: aruba-leren/src/lib/tutoring/session-manager.ts
FOUND: aruba-leren/src/lib/tutoring/difficulty-adjuster.ts
FOUND: aruba-leren/src/lib/ai/rate-limiter.ts
FOUND: aruba-leren/src/app/[locale]/api/tutor/chat/route.ts
```

All commits verified to exist:
```
FOUND: ca998b6 (Task 1: session manager, difficulty adjuster, rate limiter)
FOUND: f2fff66 (Task 2: streaming chat API route)
```

TypeScript compilation verified:
```
npx tsc --noEmit --pretty
(no output = success)
```
