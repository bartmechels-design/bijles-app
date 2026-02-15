# Phase 04: AI Tutor - Core Foundations - Research

**Researched:** 2026-02-15
**Domain:** AI-powered educational tutoring with Claude API, Socratic method implementation, multilingual support
**Confidence:** HIGH

## Summary

Phase 4 implements Koko, an AI tutor using Anthropic's Claude API to deliver Socratic-style tutoring across 6 subjects (Taal, Rekenen, Begrijpend Lezen, Geschiedenis, Aardrijkskunde, Kennis der Natuur) with multilingual support (Nederlands, Papiamento, Spaans) and Arubaanse context integration.

The technical foundation leverages Claude Sonnet 4.5 or Haiku 4.5 via the Vercel AI SDK (already installed: `@ai-sdk/anthropic` v3.0.43 and `ai` v6.0.84), with prompt caching for cost optimization, streaming responses for better UX, and Supabase for session/conversation persistence. Critical implementation challenges include robust Socratic prompt engineering to prevent AI from giving direct answers, age-appropriate language validation, and rate limiting from day 1 to control costs.

Research reveals that Claude excels at multilingual tasks (96-98% of English performance for Dutch/Spanish), supports automatic language detection with explicit context improvements, and provides production-ready streaming via the AI SDK. Educational research shows immediate feedback (Koko's core feature) is equally effective as delayed feedback for performance, making it ideal for elementary students who benefit from quick validation cycles.

**Primary recommendation:** Use Claude Sonnet 4.5 as primary model with Haiku 4.5 fallback, implement 5-minute prompt caching for system prompts and subject definitions (90% cost savings on cache hits), stream responses via Vercel AI SDK route handlers, persist conversations in Supabase with session management, and validate Socratic behavior with automated tests before launch.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@ai-sdk/anthropic` | ^3.0.43 | Claude API integration via Vercel AI SDK | Official Anthropic SDK wrapper by Vercel, handles streaming, error handling, type safety |
| `ai` (Vercel AI SDK) | ^6.0.84 | Unified AI framework for streaming responses | Industry standard for AI in Next.js, provider-agnostic, built-in streaming hooks |
| `@anthropic-ai/sdk` | Latest | Direct Claude API access (if needed) | Official Anthropic TypeScript SDK for advanced features like prompt caching |
| Supabase (existing) | ^2.95.3 | Database for conversation history, sessions | Already in stack, supports real-time, RLS for security |
| next-intl (existing) | ^4.8.2 | i18n for UI elements | Already configured for nl/pap/es |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` (existing) | ^4.3.6 | Validation for AI responses, user inputs | Form validation, API response parsing |
| `react-hook-form` (existing) | ^7.71.1 | Tutoring session input forms | Answer submission, vak selection |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Claude Sonnet 4.5 | Claude Opus 4.6 | Opus: 67% higher cost ($5 vs $3 input), better reasoning but overkill for elementary education |
| Vercel AI SDK | Direct Anthropic SDK | Direct SDK: more control but loses streaming helpers, provider lock-in |
| Prompt caching (5min) | 1-hour cache | 1h cache: 2x write cost but better for <5min response gaps (unlikely in tutoring) |

**Installation:**
```bash
# Already installed:
# - @ai-sdk/anthropic ^3.0.43
# - ai ^6.0.84
# - @supabase/supabase-js ^2.95.3

# Optional: Direct SDK for advanced prompt caching
npm install @anthropic-ai/sdk
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   └── [locale]/
│       └── api/
│           └── tutor/
│               ├── chat/route.ts              # Streaming chat endpoint
│               └── sessions/route.ts          # Session management
├── lib/
│   ├── ai/
│   │   ├── providers/
│   │   │   └── anthropic.ts                   # Claude client config
│   │   ├── prompts/
│   │   │   ├── system-prompts.ts              # Base Koko personality
│   │   │   ├── subject-prompts.ts             # Per-vak instructions
│   │   │   └── socratic-guards.ts             # Anti-answer-giving rules
│   │   ├── streaming.ts                       # AI SDK streaming setup
│   │   └── rate-limiter.ts                    # Token budget enforcement
│   ├── tutoring/
│   │   ├── session-manager.ts                 # Create/resume sessions
│   │   ├── difficulty-adjuster.ts             # Track performance
│   │   └── language-detector.ts               # Auto-switch nl/pap/es
│   └── supabase/ (existing)
└── types/
    └── tutoring.ts                            # Session, Message, Subject types
```

### Pattern 1: Streaming Chat with Prompt Caching
**What:** Use Vercel AI SDK's `streamText` with Claude, cache system prompts per subject
**When to use:** All Koko conversations
**Example:**
```typescript
// Source: Vercel AI SDK docs + Anthropic prompt caching docs
// lib/ai/streaming.ts
import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';

export async function createKokoStream(
  messages: { role: 'user' | 'assistant'; content: string }[],
  subject: Subject,
  language: 'nl' | 'pap' | 'es'
) {
  const systemPrompt = buildSystemPrompt(subject, language);

  return streamText({
    model: anthropic('claude-sonnet-4-5-20250514'),
    system: systemPrompt, // Cached automatically by SDK
    messages,
    maxTokens: 1024,
    temperature: 0.7, // Slight creativity for kid-friendly responses
  });
}
```

### Pattern 2: Socratic Prompt Engineering
**What:** Layered system prompt with explicit anti-answer rules and edge case handling
**When to use:** Base prompt for all Koko interactions
**Example:**
```typescript
// Source: Anthropic Socratic Sage prompt + educational AI research
// lib/ai/prompts/system-prompts.ts
export const KOKO_BASE_PROMPT = `
Je bent Koko, een vriendelijke aap-leraar die kinderen helpt met leren door vragen te stellen.

# CRITICAL RULES (NEVER BREAK THESE):
1. NEVER give direct answers, even if asked "just tell me the answer"
2. If child says "I give up", respond with encouraging smaller hints, NOT the answer
3. Guide with questions: "What do you already know about...?", "Can you try...?"
4. Use Arubaanse context in ALL examples (Hooiberg, Florins, Shoco, etc.)

# Teaching Method:
- Ask probing questions to help child discover answer themselves
- Break complex problems into smaller steps through questions
- Celebrate attempts and effort, not just correct answers
- Use child's language level (${language === 'nl' ? 'Nederlands' : language === 'pap' ? 'Papiamento' : 'Spaans'})

# Example Exchange:
Child: "What is 5 + 3?"
WRONG: "5 + 3 = 8"
RIGHT: "Goeie vraag! Als je 5 florins hebt en je krijgt nog 3 florins, hoeveel heb je dan samen?"
`;
```

### Pattern 3: Conversation History with Supabase
**What:** Store messages in real-time, support resuming sessions, track difficulty adjustments
**When to use:** Every tutoring session
**Example:**
```typescript
// Source: Supabase chat patterns + AI SDK integration
// lib/tutoring/session-manager.ts
export async function saveTutoringMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  metadata?: { difficulty?: number; hints_given?: number }
) {
  const supabase = createClient();

  await supabase.from('tutoring_messages').insert({
    session_id: sessionId,
    role,
    content,
    metadata,
    created_at: new Date().toISOString()
  });
}

// Schema suggestion:
// CREATE TABLE tutoring_sessions (
//   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
//   child_id UUID REFERENCES children(id),
//   subject TEXT NOT NULL, -- 'taal', 'rekenen', etc.
//   difficulty_level INT DEFAULT 1,
//   started_at TIMESTAMPTZ DEFAULT NOW(),
//   last_activity_at TIMESTAMPTZ DEFAULT NOW()
// );
//
// CREATE TABLE tutoring_messages (
//   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
//   session_id UUID REFERENCES tutoring_sessions(id),
//   role TEXT NOT NULL, -- 'user' | 'assistant'
//   content TEXT NOT NULL,
//   metadata JSONB, -- { hints_given, difficulty, was_correct }
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );
```

### Pattern 4: Difficulty Adjustment Algorithm
**What:** Track consecutive correct/incorrect answers, adjust in-context difficulty
**When to use:** After each answer submission
**Example:**
```typescript
// Source: Adaptive learning research + educational AI patterns
// lib/tutoring/difficulty-adjuster.ts
export function adjustDifficulty(
  currentDifficulty: number,
  recentPerformance: boolean[] // last 3-5 answers
): { newDifficulty: number; instruction: string } {
  const consecutiveCorrect = countConsecutive(recentPerformance, true);
  const consecutiveIncorrect = countConsecutive(recentPerformance, false);

  if (consecutiveCorrect >= 3 && currentDifficulty < 5) {
    return {
      newDifficulty: currentDifficulty + 1,
      instruction: "Kind doet het goed, verhoog moeilijkheidsgraad"
    };
  }

  if (consecutiveIncorrect >= 3 && currentDifficulty > 1) {
    return {
      newDifficulty: currentDifficulty - 1,
      instruction: "Kind heeft moeite, maak het makkelijker"
    };
  }

  return { newDifficulty: currentDifficulty, instruction: "" };
}
```

### Pattern 5: Language Switching with Context
**What:** Explicit language context in system prompt, auto-detect from child profile
**When to use:** Session initialization, when child changes preferred language
**Example:**
```typescript
// Source: Anthropic multilingual docs
// lib/tutoring/language-detector.ts
export function buildLanguageContext(
  preferredLanguage: 'nl' | 'pap' | 'es',
  childAge: number
): string {
  const languageMap = {
    nl: 'Nederlands (gebruik eenvoudige woorden voor kinderen)',
    pap: 'Papiamento (gebruik lokale uitdrukkingen)',
    es: 'Spaans (gebruik Latijns-Amerikaanse uitdrukkingen)'
  };

  return `
# Taal Instructies:
- Primaire instructietaal: ${languageMap[preferredLanguage]}
- Spreek op niveau van ${childAge}-jarige
- Gebruik korte zinnen (max 15 woorden)
- Vermijd moeilijke woorden zonder uitleg
  `.trim();
}
```

### Anti-Patterns to Avoid
- **Client-side API keys:** NEVER expose Anthropic API key in browser. Use Next.js API routes with environment variables.
- **Unbounded streaming:** Always set `maxTokens` to prevent runaway costs (suggested: 1024 for responses, 2048 max).
- **Ignoring rate limits:** Track tokens per child/session to prevent abuse (see Rate Limiter pattern).
- **Cache invalidation on every request:** Use stable system prompts, only vary user messages to maximize cache hits.
- **No conversation truncation:** Limit context window to last 10-15 messages to stay under token limits and maintain focus.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Streaming AI responses | Custom SSE implementation, manual chunking | Vercel AI SDK `streamText` | Handles backpressure, error recovery, protocol edge cases, TypeScript types |
| Prompt caching | DIY caching layer, Redis storage | Anthropic's built-in prompt caching with `cache_control` | Server-side, automatic invalidation, 90% cost savings on hits |
| Rate limiting | Token counters in memory | Anthropic SDK usage headers + Supabase tracking | Response headers include actual token usage, no estimation needed |
| Language detection | Regex patterns, manual NLP | Explicit language context in prompts + child profile | Claude handles multilingual naturally, more reliable than detection |
| Age-appropriate vocabulary | Custom word filtering | Explicit age context in system prompt + testing | Claude trained on educational content, understands "8-year-old level" |
| Conversation summarization | Manual truncation logic | Claude's 200K context window + message windowing | Keep last 10-15 messages, summarize older context if needed |

**Key insight:** Claude's 200K context window and multilingual capabilities handle most educational NLP challenges. Prompt engineering is more effective (and cheaper) than building custom NLP pipelines. Focus engineering effort on Socratic guardrails and testing, not infrastructure.

## Common Pitfalls

### Pitfall 1: AI Breaking Socratic Contract
**What goes wrong:** Despite system prompts, Claude gives direct answers when child says "I give up" or "just tell me"
**Why it happens:** LLMs are trained to be helpful; explicit refusal feels unnatural without strong prompting
**How to avoid:**
- Use multi-layered guards: system prompt + per-message reminders
- Test edge cases explicitly: "just tell me", "I give up", "you're not helping"
- Add examples of CORRECT refusals in system prompt (few-shot learning)
**Warning signs:**
- User feedback: "The monkey just gave me the answer"
- Message content analysis: detect phrases like "The answer is..." in assistant messages

### Pitfall 2: Uncontrolled Costs
**What goes wrong:** Token usage spikes from long conversations, no per-child budgets
**Why it happens:** Streaming feels "free" until AWS bill arrives; children can chat indefinitely
**How to avoid:**
- Set `maxTokens: 1024` per response (hard limit)
- Track cumulative tokens per session in Supabase
- Implement daily/weekly token caps per child (e.g., 50K tokens/week)
- Use prompt caching (5min TTL) for all system prompts (90% savings)
**Warning signs:**
- Session exceeds 20 messages without completion
- Individual responses >1000 tokens (investigating vs tutoring)
- Anthropic usage dashboard shows spikes

### Pitfall 3: Adult-Level Vocabulary
**What goes wrong:** Claude uses words like "analyze", "comprehensive", "nevertheless" for 8-year-olds
**Why it happens:** Claude defaults to educated adult writing style
**How to avoid:**
- Explicit age context: "Je spreekt met een ${age}-jarige. Gebruik woorden die zij/hij kent."
- Few-shot examples of kid-friendly language in system prompt
- Post-processing validation: flag messages with "difficult" words (manual review initially)
**Warning signs:**
- Parent feedback: "My child doesn't understand Koko"
- High rate of "I don't understand" responses from children

### Pitfall 4: Cache Invalidation on Every Request
**What goes wrong:** System prompt changes slightly (e.g., interpolated session ID), breaking cache
**Why it happens:** Template strings with dynamic values in cached content
**How to avoid:**
- Keep system prompts 100% static (no session IDs, timestamps, child names)
- Place dynamic context AFTER cache breakpoint (in user messages or separate system block)
- Use `cache_control: { type: "ephemeral" }` explicitly on static blocks
**Warning signs:**
- `cache_creation_input_tokens` > 0 on every request (should be 0 after first)
- Anthropic usage shows no cache hits despite repeated requests

### Pitfall 5: Language Switching Mid-Session
**What goes wrong:** Child asks in Papiamento but system prompt locked to Nederlands
**Why it happens:** Language set at session start, not dynamically adapted
**How to avoid:**
- Detect language in user message (Claude can auto-detect)
- Explicit fallback instruction: "If child uses Papiamento/Spaans, switch to that language"
- Update session metadata when language changes (for analytics)
**Warning signs:**
- Child repeats question in different language
- Parent reports: "Koko doesn't understand Papiamento"

### Pitfall 6: No Conversation Truncation Strategy
**What goes wrong:** Context window fills with 50+ messages, hitting token limits or slowing responses
**Why it happens:** Naive "append all messages" approach without windowing
**How to avoid:**
- Keep only last 10-15 message pairs in context
- Summarize older context: "Earlier you practiced 3+5, now let's try..."
- Store full history in Supabase, but only send recent context to API
**Warning signs:**
- Request latency increases over session duration
- Token counts grow linearly with session length

## Code Examples

Verified patterns from official sources:

### Streaming Route Handler (Next.js App Router)
```typescript
// Source: Vercel AI SDK docs
// app/[locale]/api/tutor/chat/route.ts
import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const { messages, sessionId, subject } = await req.json();

  // Verify child access to session
  const supabase = await createClient();
  const { data: session } = await supabase
    .from('tutoring_sessions')
    .select('*, child:children(*)')
    .eq('id', sessionId)
    .single();

  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const systemPrompt = buildSystemPrompt(subject, session.child.preferred_language);

  const result = await streamText({
    model: anthropic('claude-sonnet-4-5-20250514'),
    system: systemPrompt,
    messages,
    maxTokens: 1024,
    temperature: 0.7,
    onFinish: async ({ text, usage }) => {
      // Save to Supabase
      await supabase.from('tutoring_messages').insert({
        session_id: sessionId,
        role: 'assistant',
        content: text,
        metadata: {
          tokens_used: usage.totalTokens,
          cached_tokens: usage.cachedTokens
        }
      });
    }
  });

  return result.toDataStreamResponse();
}
```

### Prompt Caching with Direct Anthropic SDK
```typescript
// Source: Anthropic prompt caching docs
// lib/ai/providers/anthropic.ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export async function createCachedMessage(
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250514',
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' } // 5-minute cache
      }
    ],
    messages
  });

  // Check cache performance
  console.log('Cache stats:', {
    cacheWrites: response.usage.cache_creation_input_tokens,
    cacheReads: response.usage.cache_read_input_tokens,
    newTokens: response.usage.input_tokens
  });

  return response;
}
```

### Subject-Specific Prompts
```typescript
// Source: Educational AI research + Anthropic best practices
// lib/ai/prompts/subject-prompts.ts
export const SUBJECT_PROMPTS = {
  taal: `
# Vak: Nederlandse Taal
Je helpt met spelling, grammatica, en woordenschat.

## Arubaanse Context:
- Gebruik voorbeelden met lokale woorden: dushi, awa, pan
- Vergelijk met Papiamento waar nuttig
- Voorbeeldzinnen: "Ik zie de Hooiberg", "We zwemmen bij Baby Beach"

## Socratische Aanpak:
- Bij spelling: "Welke letter hoor je eerst?"
- Bij grammatica: "Is dit een persoon, ding, of actie?"
  `,

  rekenen: `
# Vak: Rekenen
Je helpt met optellen, aftrekken, vermenigvuldigen, delen.

## Arubaanse Context:
- Gebruik Florin als munteenheid (niet Euro)
- Voorbeelden: prijs van pastechi, afstand naar Oranjestad
- Visuele hints: "Stel je 3 flamingo's voor..."

## Socratische Aanpak:
- Bij optellen: "Als je X hebt en Y erbij krijgt, hoeveel heb je dan?"
- Bij fout: "Laten we kleiner beginnen: wat is 2 + 2?"
  `,

  // ... other subjects (begrijpend_lezen, geschiedenis, aardrijkskunde, kennis_der_natuur)
};
```

### Rate Limiter Implementation
```typescript
// Source: Production AI app patterns
// lib/ai/rate-limiter.ts
export async function checkTokenBudget(
  childId: string,
  estimatedTokens: number
): Promise<{ allowed: boolean; remaining: number }> {
  const supabase = createClient();

  // Get usage in last 24 hours
  const { data } = await supabase
    .from('tutoring_messages')
    .select('metadata')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .eq('child_id', childId);

  const tokensUsed = data?.reduce((sum, msg) =>
    sum + (msg.metadata?.tokens_used || 0), 0
  ) || 0;

  const DAILY_LIMIT = 50000; // 50K tokens/day per child
  const remaining = DAILY_LIMIT - tokensUsed;

  return {
    allowed: remaining >= estimatedTokens,
    remaining
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom streaming with `fetch()` | Vercel AI SDK `streamText` | Jan 2024 (AI SDK 3.0) | Built-in error handling, React hooks, unified API |
| Manual prompt optimization | Anthropic prompt caching | Aug 2024 | 90% cost reduction on repeated prompts, automatic cache management |
| Claude Opus 3 | Claude Sonnet 4.5 / Haiku 4.5 | Feb 2026 (Opus 4.6 release) | Sonnet 4.5: 67% cheaper than Opus, sufficient for tutoring |
| Organization-level cache | Workspace-level cache | Feb 5, 2026 | Improved cache isolation, per-workspace billing |
| 200K context window | 1M context window (beta) | Feb 2026 (Opus 4.6) | Longer conversations, but requires Tier 4 API access |

**Deprecated/outdated:**
- `client.beta.promptCaching.messages.create()`: Prompt caching is now GA, use `client.messages.create()` with `cache_control`
- Claude Sonnet 3.7: Deprecated model, use Sonnet 4.5 instead
- `anthropic-version: 2023-06-01` header: Latest is automatic with SDK

## Open Questions

1. **Age-appropriate language validation**
   - What we know: Claude understands "8-year-old level" in prompts, educational research shows grade-specific models exist
   - What's unclear: How to validate in production without manual review; automated readability metrics for Dutch/Papiamento
   - Recommendation: Start with explicit age context in prompts, add post-launch review of flagged messages (parent reports)

2. **IGDI model integration**
   - What we know: IGDI (Individual Growth and Development Indicators) used in early childhood, focuses on screening/assessment
   - What's unclear: How to adapt IGDI principles (instructie, geleide inoefening, diagnostische toets, individuele verwerking) to AI tutoring
   - Recommendation: Map IGDI phases to conversation flow: (1) explain concept, (2) guided questions, (3) assess understanding, (4) adapt difficulty

3. **Optimal session duration by age**
   - What we know: General guideline "younger = shorter sessions", attention spans vary 5-15 minutes for elementary ages
   - What's unclear: Specific durations for 6-year-olds vs 12-year-olds in AI tutoring context
   - Recommendation: Start with 10-minute soft limit (UI prompt), track engagement metrics (response time, message count), adjust per age group

4. **Prompt caching effectiveness with multilingual content**
   - What we know: Cache hits require 100% identical prompts; language-specific system prompts would create 3 separate caches (nl/pap/es)
   - What's unclear: Whether to cache language-specific prompts separately or use one dynamic prompt with language parameter
   - Recommendation: Cache 3 separate system prompts (one per language) to maximize cache hits; language rarely changes mid-session

5. **Tier 4 API access timeline**
   - What we know: Tier 4 required for 1M context window, achieved via $400 cumulative spend
   - What's unclear: Whether 200K context sufficient for typical tutoring sessions, or if 1M needed for long conversations
   - Recommendation: Start with 200K window (available at Tier 1), truncate to last 10-15 message pairs; upgrade to Tier 4 only if user feedback demands longer context

## Sources

### Primary (HIGH confidence)
- [Anthropic Claude API Docs - Prompt Engineering](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview) - Verified prompt engineering best practices
- [Anthropic Claude API Docs - Prompt Caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) - Cache implementation, pricing, TTL options
- [Anthropic Claude API Docs - Rate Limits](https://platform.claude.com/docs/en/api/rate-limits) - Tier structure, token limits, usage tracking
- [Anthropic Claude API Docs - Multilingual Support](https://platform.claude.com/docs/en/build-with-claude/multilingual-support) - Language performance benchmarks, best practices
- [Anthropic Claude API Docs - Socratic Sage Prompt](https://platform.claude.com/docs/en/resources/prompt-library/socratic-sage) - Official Socratic tutoring template
- [Anthropic Claude API Docs - Pricing](https://platform.claude.com/docs/en/about-claude/pricing) - February 2026 pricing: Sonnet 4.5 $3/$15 per MTok
- [Vercel AI SDK Docs](https://sdk.vercel.ai/) - streamText, provider patterns, Next.js integration

### Secondary (MEDIUM confidence)
- [How to Implement Anthropic API Integration (OneUpTime, Jan 2026)](https://oneuptime.com/blog/post/2026-01-25-anthropic-api-integration/view) - Production patterns, security best practices
- [Claude Streaming API with Next.js Edge Guide (Tech Edu Byte)](https://www.techedubyte.com/claude-streaming-api-nextjs-edge-guide/) - Streaming implementation details
- [Claude AI's Learning Style: Socratic Tutor (Medium)](https://medium.com/@CherryZhouTech/claude-ais-learning-style-transform-ai-into-a-socratic-tutor-d4e48f2c9249) - Socratic method in practice
- [Classroom AI: Grade-Specific Teachers (arXiv 2025)](https://arxiv.org/html/2601.06225) - Age-appropriate language research, 35.64% grade-level alignment improvement
- [Adaptive Learning Algorithms 2026 (Afficient Academy)](https://blog.afficienta.com/why-adaptive-learning-delivers-better-results-than-traditional-online-programs-for-kids-in-2026/) - Difficulty adjustment patterns (RL, SVM, k-NN)
- [ManyClasses Immediate vs Delayed Feedback Study (SAGE)](https://journals.sagepub.com/doi/full/10.1177/25152459211027575) - No performance difference between immediate/delayed feedback
- [Supabase Next.js Realtime Chat Template](https://supabase.com/ui/docs/nextjs/realtime-chat) - Conversation storage patterns
- [IGDIs Overview (University of Minnesota)](https://innovation.umn.edu/igdi/) - Individual Growth and Development Indicators for early childhood

### Tertiary (LOW confidence - verify in implementation)
- Web search results on Vercel AI SDK + Anthropic streaming (multiple sources, Feb 2026) - General integration patterns, needs testing
- Community discussions on Next.js server actions + streaming (GitHub, Stack Overflow) - Implementation details vary

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Vercel AI SDK and Anthropic SDK are official, well-documented, actively maintained
- Architecture: HIGH - Patterns verified in official docs, production examples exist
- Pitfalls: MEDIUM-HIGH - Based on documented issues (rate limiting, Socratic breaking) + general AI app experience
- Educational patterns: MEDIUM - Research-backed (IGDI, feedback timing) but not AI-specific
- Arubaanse context: LOW - No specific research on Aruba education, extrapolating from general multilingual AI

**Research date:** 2026-02-15
**Valid until:** ~2026-04-15 (60 days for stable APIs, though Claude models update frequently)

**Next steps for planner:**
1. Design Supabase schema: `tutoring_sessions`, `tutoring_messages`, indexes
2. Create API routes: `/api/tutor/chat` (streaming), `/api/tutor/sessions` (CRUD)
3. Build system prompts: base Koko personality + 6 subject prompts + Socratic guards
4. Implement rate limiter: token tracking, daily caps per child
5. Test Socratic behavior: "just tell me", "I give up", edge cases
6. Validate age-appropriate language: manual review of first 100 responses per age group
7. Set up monitoring: token usage dashboard, cache hit rates, session durations
