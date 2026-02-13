# Phase 1: Foundation & Infrastructure - Research

**Researched:** 2026-02-13
**Domain:** Next.js App Router with Supabase, multi-language routing, privacy compliance
**Confidence:** HIGH

## Summary

Phase 1 establishes a Next.js 16 App Router project with Supabase database (RLS-protected), trilingual routing (NL/PAP/ES) via next-intl, environment variable management, and Vercel deployment pipeline. The technical foundation must support privacy-first data handling (COPPA compliance) with minimal data collection.

The standard stack is mature and well-documented: Next.js 16 with App Router, Supabase with @supabase/ssr for authentication, next-intl 3.x for i18n routing, and Tailwind CSS 4. All libraries support TypeScript with strict mode. The architecture follows Next.js conventions with [locale] dynamic segments, middleware-based locale detection, and RLS policies for data isolation.

Critical implementation requirements: RLS must be enabled on all tables before any data collection (deny-by-default security model), Aruban Papiamento spelling differs from Curaçaoan Papiamentu (use "o" endings and "c" instead of "k"), privacy policy must target Grade 5-8 readability (current industry average is Grade 12+), and all API keys must use NEXT_PUBLIC_ prefix for client-side access or remain server-only.

**Primary recommendation:** Enable RLS on all tables immediately after creation, use next-intl's routing middleware with locale-in-path strategy (/nl/, /pap/, /es/), store environment variables in .env.local (gitignored) with Vercel dashboard for production, and structure translation JSON by feature namespaces.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Taalswitch UX:**
- Default taal via browser-detectie (Accept-Language header), fallback naar Nederlands
- Taalswitch altijd zichtbaar in de header/navbar op elke pagina
- Locale in URL-pad: `/nl/`, `/pap/`, `/es/` (next-intl routing)
- Taalkeuze wordt opgeslagen in gebruikersprofiel na inloggen

**Privacy Policy:**
- Doelgroep: ouders — formeel maar begrijpelijk Nederlands (groep 8 leesniveau)
- Beschikbaar in alle 3 talen (NL/PAP/ES)
- Data-disclosures: voornaam + leeftijd + klas, chatgesprekken met Koko, voortgangsdata per vak — alleen wat de requirements vereisen, geen extra dataverzameling
- Toestemming: checkbox met link naar volledige privacy policy tekst bij registratie

**Vertalingen Scope:**
- Alle UI-tekst volledig vertaald in NL/PAP/ES in Phase 1 — niet alleen framework, ook alle labels, knoppen, meldingen
- AI genereert vertalingen, maar specifiek **Arubaans Papiamento** (NIET Curaçaos Papiamentu)
- Technische termen zonder Papiamento-equivalent blijven in het Nederlands (login, dashboard, etc.) — gangbaar op Aruba
- Spaans is gelijkwaardig aan NL en PAP, niet secundair

### Claude's Discretion

- Exacte header/navbar layout en taalswitch-component design
- Database schema structuur en RLS policies
- Vercel deployment configuratie
- .env structuur en environment variable naming

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16+ | App Router framework | Official React framework, Server Components, built-in optimization |
| @supabase/ssr | Latest | Supabase client for SSR | Official Supabase package for cookie-based auth with App Router |
| next-intl | 3.x | Internationalization | De-facto standard for Next.js i18n with App Router support |
| Tailwind CSS | 4.x | Styling | CSS-first config (no tailwind.config.js), auto-scanning, Next.js integration |
| TypeScript | 5.x | Type safety | Next.js default, strict mode recommended |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @next/env | Latest | Load env vars outside Next.js runtime | ORM configs, test runners, tooling |
| @supabase/supabase-js | Latest | Supabase client SDK | Installed with @supabase/ssr as dependency |
| @formatjs/intl-localematcher | Latest | Locale matching | Bundled with next-intl for Accept-Language parsing |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| next-intl | next-translate | next-translate lacks middleware-based routing, requires manual setup |
| Supabase | Firebase | Firebase lacks Postgres RLS, requires Firestore security rules (different model) |
| Tailwind CSS 4 | Tailwind CSS 3 | v3 uses JS config (tailwind.config.js), v4 is CSS-first with better DX |

**Installation:**
```bash
# Next.js project (skip Tailwind during init, install v4 manually)
npx create-next-app@latest bijles-app --typescript --app --src-dir --no-tailwind

# Core dependencies
npm install next-intl @supabase/ssr @supabase/supabase-js

# Tailwind CSS 4
npm install tailwindcss @tailwindcss/postcss postcss

# TypeScript already included in Next.js 16+ by default
```

## Architecture Patterns

### Recommended Project Structure
```
bijles-app/
├── .env.local                    # Local environment variables (GITIGNORED)
├── .env.example                  # Environment variable documentation
├── .gitignore                    # Must include .env* files
├── next.config.ts                # Next.js config with next-intl plugin
├── postcss.config.mjs            # Tailwind CSS 4 PostCSS config
├── tsconfig.json                 # TypeScript strict mode enabled
├── middleware.ts                 # next-intl locale routing middleware
├── src/
│   ├── app/
│   │   ├── [locale]/             # Locale dynamic segment
│   │   │   ├── layout.tsx        # Root layout with NextIntlClientProvider
│   │   │   ├── page.tsx          # Home page
│   │   │   ├── privacy/          # Privacy policy route
│   │   │   │   └── page.tsx
│   │   │   ├── loading.tsx       # Loading skeleton
│   │   │   ├── error.tsx         # Error boundary
│   │   │   └── not-found.tsx     # 404 page
│   │   └── globals.css           # Tailwind CSS imports
│   ├── i18n/
│   │   └── request.ts            # next-intl request config
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts         # Browser client (createBrowserClient)
│   │   │   └── server.ts         # Server client (createServerClient)
│   │   └── routing.ts            # next-intl routing config
│   └── components/
│       └── LanguageSwitcher.tsx  # Locale switching component
├── messages/
│   ├── nl.json                   # Dutch translations
│   ├── pap.json                  # Papiamento translations
│   └── es.json                   # Spanish translations
└── supabase/
    └── migrations/
        └── 20260213_initial_schema.sql  # Database schema with RLS
```

### Pattern 1: Locale-Based Routing with next-intl
**What:** URL-path locale prefix (/nl/, /pap/, /es/) with middleware-based detection
**When to use:** All user-facing routes requiring i18n
**Example:**
```typescript
// src/lib/routing.ts
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['nl', 'pap', 'es'],
  defaultLocale: 'nl',
  localePrefix: 'always' // Always show locale in URL
});
```

```typescript
// middleware.ts
import createMiddleware from 'next-intl/middleware';
import { routing } from './src/lib/routing';

export default createMiddleware(routing);

export const config = {
  // Match all pathnames except API routes and static files
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
```

### Pattern 2: Supabase Client Separation (Browser vs Server)
**What:** Separate client creation for Client Components (browser) and Server Components (server)
**When to use:** All Supabase database access
**Example:**
```typescript
// src/lib/supabase/client.ts (Browser)
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

```typescript
// src/lib/supabase/server.ts (Server)
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component (can't write cookies)
          }
        },
      },
    }
  );
}
```

### Pattern 3: Row Level Security (RLS) Policies
**What:** Postgres RLS policies for data isolation using auth.uid()
**When to use:** Every table exposed via Supabase API
**Example:**
```sql
-- Enable RLS on table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Index auth.uid() column for performance (CRITICAL)
CREATE INDEX idx_profiles_user_id ON profiles(user_id);

-- SELECT policy: users can view own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT policy: users can create own profile
CREATE POLICY "Users can create own profile" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE policy: users can update own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE policy: users can delete own profile
CREATE POLICY "Users can delete own profile" ON profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

### Pattern 4: Environment Variable Management
**What:** .env.local for local dev, Vercel dashboard for production, NEXT_PUBLIC_ prefix for client access
**When to use:** All API keys, database credentials, configuration
**Example:**
```bash
# .env.local (GITIGNORED)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # Server-only

# .env.example (COMMITTED)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

```bash
# .gitignore (MUST include)
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
```

### Pattern 5: Translation JSON Organization by Namespace
**What:** Structured JSON with nested namespaces per feature/domain
**When to use:** All UI text requiring i18n
**Example:**
```json
// messages/nl.json
{
  "common": {
    "appName": "Bijles App",
    "loading": "Laden...",
    "error": "Er is iets misgegaan"
  },
  "auth": {
    "login": "Inloggen",
    "logout": "Uitloggen",
    "register": "Registreren"
  },
  "privacy": {
    "title": "Privacyverklaring",
    "lastUpdated": "Laatst bijgewerkt: {date}",
    "dataCollection": {
      "title": "Welke gegevens verzamelen we?",
      "items": [
        "Voornaam van je kind",
        "Leeftijd en klas",
        "Voortgang per vak",
        "Chatgesprekken met Koko (onze AI tutor)"
      ]
    }
  },
  "languageSwitcher": {
    "label": "Taal",
    "nl": "Nederlands",
    "pap": "Papiamento",
    "es": "Español"
  }
}
```

```json
// messages/pap.json (Aruban Papiamento - note "o" endings)
{
  "common": {
    "appName": "Bijles App",
    "loading": "Ta karga...",
    "error": "Algu a bai robes"
  },
  "auth": {
    "login": "Login",        // Technical term - keep Dutch
    "logout": "Log out",     // Technical term - keep Dutch
    "register": "Registrá"
  },
  "privacy": {
    "title": "Deklarashon di privacidad",
    "lastUpdated": "Último aktualisashon: {date}",
    "dataCollection": {
      "title": "Kua dato nos ta kolektá?",
      "items": [
        "Nòmber di bo yu",
        "Edat i klas",
        "Progreso pa materia",
        "Konversashonnan ku Koko (nos AI tutor)"
      ]
    }
  },
  "languageSwitcher": {
    "label": "Idioma",
    "nl": "Hulandes",
    "pap": "Papiamento",
    "es": "Spaño"
  }
}
```

### Anti-Patterns to Avoid
- **Forgetting RLS on tables:** Every table without RLS is publicly accessible via Supabase API. Enable RLS immediately after CREATE TABLE.
- **Using getSession() in Server Components:** getSession() doesn't revalidate JWT. Use getUser() or getClaims() for server-side auth.
- **Hardcoding locales in components:** Use next-intl's createNavigation() wrappers (Link, useRouter) instead of Next.js primitives.
- **NEXT_PUBLIC_ prefix on secrets:** Service role keys and private API keys must never have NEXT_PUBLIC_ prefix (client-accessible).
- **Curaçaoan Papiamentu spelling for Aruba:** Use "Papiamento" spelling (ends with "o", uses "c" not "k") for Aruba, not "Papiamentu".
- **College-level privacy policy:** Target Grade 5-8 readability (Flesch-Kincaid 8 or lower), not college level (industry average is Grade 12+).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Locale routing | Custom middleware with URL parsing | next-intl createMiddleware | Handle Accept-Language header, cookie persistence, locale prefix strategies, edge cases |
| Database security | Application-level data filtering | Postgres RLS policies | Database-enforced security, prevents SQL injection, works across all clients |
| Auth token refresh | Manual JWT validation/refresh | @supabase/ssr with cookies | Handles token refresh, cookie security, SSR compatibility, cross-domain sessions |
| Environment variable loading | Custom .env parser | Next.js built-in support + @next/env | Handles .env hierarchy, NEXT_PUBLIC_ inlining at build time, type safety |
| Locale detection | IP geolocation or manual selection | next-intl middleware with Accept-Language | Uses browser preferences, "best fit" algorithm, respects user settings |
| Translation JSON management | Custom i18n solution | next-intl with nested JSON | Type-safe keys, Server Component support, loading optimization, ICU message format |

**Key insight:** Infrastructure-level concerns (auth, i18n, database security) have mature, battle-tested solutions. Custom implementations miss edge cases discovered over years of production use. Postgres RLS is database-enforced (bypassing it requires SQL Editor access), while app-level filtering can be circumvented via API manipulation.

## Common Pitfalls

### Pitfall 1: RLS Enabled Without Policies
**What goes wrong:** Enable RLS on table, forget to create policies. All queries return empty results with no error messages. Application appears broken.
**Why it happens:** RLS defaults to "deny all" when no policies exist. This is correct security behavior, but surprising.
**How to avoid:** Immediately create at least one policy after ALTER TABLE ... ENABLE ROW LEVEL SECURITY. Test with client SDK (not SQL Editor, which bypasses RLS).
**Warning signs:** Empty query results after enabling RLS. No error in logs (empty result is valid response).

### Pitfall 2: Forgetting to Enable RLS on New Tables
**What goes wrong:** Create table via SQL Editor or migration, forget ALTER TABLE ... ENABLE ROW LEVEL SECURITY. Every row is publicly accessible via Supabase API using anon key.
**Why it happens:** RLS is opt-in per table, not global. Default state is "disabled" (public access).
**How to avoid:** Add ALTER TABLE ... ENABLE ROW LEVEL SECURITY to every CREATE TABLE migration. Use Supabase Performance Advisor to detect tables without RLS.
**Warning signs:** Unauthenticated API calls return data. Database Advisors lint check 0013_rls_disabled_in_public triggers.

### Pitfall 3: Missing Indexes on RLS Policy Columns
**What goes wrong:** Policy like user_id = auth.uid() causes full table scan. Query times 50ms on 10k rows instead of 2ms. Timeouts on 1M+ rows.
**Why it happens:** RLS policies are SQL WHERE clauses. Without index, Postgres scans entire table for every query.
**How to avoid:** CREATE INDEX on every column referenced in USING or WITH CHECK clauses. Index auth.uid() comparison columns.
**Warning signs:** Slow queries after adding RLS. EXPLAIN ANALYZE shows Seq Scan instead of Index Scan.

### Pitfall 4: Using getSession() in Server Components
**What goes wrong:** Use supabase.auth.getSession() to protect server-side routes. Auth token isn't revalidated, allows stale/compromised tokens.
**Why it happens:** getSession() reads from local cache, doesn't verify JWT signature on server.
**How to avoid:** Always use supabase.auth.getUser() or supabase.auth.getClaims() in Server Components. These validate JWT every request.
**Warning signs:** Logged-out users can still access protected routes. Security audit flags unvalidated JWTs.

### Pitfall 5: NEXT_PUBLIC_ Variables Frozen at Build Time
**What goes wrong:** Use NEXT_PUBLIC_ environment variables in client code. Deploy to multiple environments (dev/staging/prod) with same build artifact. All environments use values from original build environment.
**Why it happens:** Next.js inlines NEXT_PUBLIC_ variables at build time (next build). Values are hardcoded into JavaScript bundles.
**How to avoid:** For multi-environment deployments, rebuild for each environment or use server-side API to fetch runtime config. Only use NEXT_PUBLIC_ for truly public, build-time constants (Supabase URL, analytics ID).
**Warning signs:** Staging environment connects to production database. Environment variables don't change after redeployment without rebuild.

### Pitfall 6: Curaçaoan Papiamentu Spelling for Aruba
**What goes wrong:** Use AI translation with generic "Papiamento" prompt. Get Curaçaoan Papiamentu spelling ("bu", "bunita", "kontentu", words with "k"). Arubans notice immediately.
**Why it happens:** AI models default to Curaçao variant (larger population, more training data). Aruba uses different orthography since 1977.
**How to avoid:** Explicitly specify "Aruban Papiamento" or "Papiamento di Aruba" in translation prompts. Check for "o" endings (not "u") and "c" (not "k"). Example: "bo" not "bu", "kontentu" → "kontento", "bunita" → "bonito".
**Warning signs:** Translation has "u" endings on adjectives, uses "k" in words like "kier" (should be "quier").

### Pitfall 7: Technical Jargon in Privacy Policy
**What goes wrong:** Write privacy policy in formal legal language. Flesch-Kincaid Grade Level 12+ (college level). Parents struggle to understand, don't read, click checkbox without comprehension.
**Why it happens:** Copy privacy policy templates from other apps. Templates use legal/technical terms to satisfy compliance (but miss readability).
**How to avoid:** Target Grade 5-8 reading level (Flesch-Kincaid 8 or lower). Use short sentences (10-15 words), common words (avoid "utilize" → use "use"), active voice. Test with readability checker.
**Warning signs:** Sentences with 25+ words, words like "utilize", "aforementioned", "pursuant to". Grade level calculators show 12+.

### Pitfall 8: Locale Not in generateStaticParams
**What goes wrong:** Use [locale] dynamic segment but forget generateStaticParams in layout.tsx. All routes render dynamically on every request (slow, no static optimization).
**Why it happens:** Next.js requires explicit generateStaticParams for dynamic segments to enable static rendering.
**How to avoid:** Add generateStaticParams to app/[locale]/layout.tsx returning routing.locales. Call setRequestLocale(locale) in every layout and page for static optimization.
**Warning signs:** Build output shows 0 static pages, all routes are "Dynamic". Build doesn't pre-render locale variants.

### Pitfall 9: Committing .env.local to Git
**What goes wrong:** Create .env.local with API keys, forget to add to .gitignore, commit to repo. Secrets exposed in git history.
**Why it happens:** Default create-next-app includes .env.local in .gitignore, but manual .env files aren't auto-ignored.
**How to avoid:** Verify .gitignore includes .env, .env.local, .env.*.local before first commit. Use git status to check .env files aren't staged. Add .env.example (no secrets) to document required variables.
**Warning signs:** GitHub shows .env file in repo. git status shows .env.local as untracked (should be ignored, not shown).

### Pitfall 10: Vercel Environment Variables Not Set for Preview
**What goes wrong:** Set environment variables in Vercel for Production only. Preview deployments (PR branches) fail with "NEXT_PUBLIC_SUPABASE_URL is not defined".
**Why it happens:** Vercel requires separate configuration for Production, Preview, Development environments.
**How to avoid:** Set environment variables for all three environments in Vercel dashboard. Use same values for all environments, or separate Supabase projects for prod/preview.
**Warning signs:** Production works, Preview deployments fail. Build logs show "Error: Environment variable NEXT_PUBLIC_SUPABASE_URL is not defined".

## Code Examples

Verified patterns from official sources:

### Next.js App Router with next-intl Layout
```typescript
// src/app/[locale]/layout.tsx
// Source: https://next-intl.dev/docs/getting-started/app-router
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/lib/routing';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Validate locale
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Get messages for locale
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

### Supabase RLS Policy with Performance Index
```sql
-- Source: https://supabase.com/docs/guides/database/postgres/row-level-security
-- Create table
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  age INTEGER,
  grade TEXT,
  locale TEXT DEFAULT 'nl',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (CRITICAL: do immediately after CREATE TABLE)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Index for RLS performance (99% improvement)
CREATE INDEX idx_profiles_user_id ON profiles(user_id);

-- Policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own profile" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### Language Switcher Component
```typescript
// src/components/LanguageSwitcher.tsx
'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/lib/navigation';
import { routing } from '@/lib/routing';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleLocaleChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div className="flex gap-2">
      {routing.locales.map((loc) => (
        <button
          key={loc}
          onClick={() => handleLocaleChange(loc)}
          className={locale === loc ? 'font-bold' : ''}
          aria-label={`Switch to ${loc}`}
        >
          {loc.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
```

### Tailwind CSS 4 Setup
```typescript
// postcss.config.mjs
// Source: https://tailwindcss.com/docs/guides/nextjs
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

```css
/* src/app/globals.css */
/* Source: https://tailwindcss.com/docs/guides/nextjs */
@import "tailwindcss";

/* Custom theme (Tailwind 4 CSS-first config) */
@theme {
  --color-primary: #3b82f6;
  --color-secondary: #8b5cf6;
  --font-sans: 'Inter', system-ui, sans-serif;
}
```

### Server-Side User Authentication
```typescript
// src/app/[locale]/dashboard/page.tsx
// Source: https://supabase.com/docs/guides/auth/server-side/creating-a-client
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const supabase = await createClient();

  // IMPORTANT: Use getUser(), NOT getSession()
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {user.email}</p>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tailwind config.js | Tailwind CSS 4 CSS-first (@theme) | Jan 2025 (v4.0) | No tailwind.config.js needed, auto-scanning, better DX |
| next-translate | next-intl 3.x | 2024 | Official Next.js team recommendation, App Router native |
| Pages Router i18n | App Router with [locale] segment | Next.js 13 (Oct 2022) | Server Components, better routing, streaming |
| supabase-js with custom SSR | @supabase/ssr package | Aug 2023 | Simplified cookie management, official SSR support |
| Manual locale detection | next-intl middleware | next-intl 3.0 (2024) | @formatjs/intl-localematcher "best fit" algorithm |
| COPPA original rule | Amended COPPA Rule | Effective June 23, 2025, compliance by April 22, 2026 | Expanded "personal information" definition, stricter consent |

**Deprecated/outdated:**
- **next-translate:** Lacks middleware-based routing, requires manual locale setup. Replaced by next-intl.
- **Tailwind CSS 3 tailwind.config.js:** Still works, but v4 CSS-first config is recommended for new projects.
- **getSession() for server-side auth:** Doesn't revalidate JWT. Use getUser() or getClaims() in Server Components.
- **Pages Router i18n config:** Next.js 13+ App Router uses [locale] dynamic segments with middleware instead of next.config.js i18n field.
- **Papiamentu generic spelling:** Specify Aruban Papiamento vs Curaçaoan Papiamentu. Orthographies diverged in 1976-1977.

## Open Questions

1. **Supabase Project Organization**
   - What we know: Can use single Supabase project for all environments, or separate projects for prod/preview/dev
   - What's unclear: Cost/performance tradeoffs for single vs multi-project. RLS testing complexity with shared project.
   - Recommendation: Start with single project, separate via RLS policies. Consider separate projects if preview deployments need isolated data.

2. **Aruban Papiamento Translation Verification**
   - What we know: Aruba uses "o" endings and "c" spelling (not "u" and "k"). Technical terms often stay in Dutch.
   - What's unclear: No authoritative Papiamento style guide found. Spelling variation between sources.
   - Recommendation: Use AI for initial translation with explicit "Aruban Papiamento" prompt. Have native Aruban speaker review before production. Accept Dutch technical terms (login, dashboard).

3. **Privacy Policy Legal Compliance**
   - What we know: COPPA applies to children under 13. Privacy policy must be readable (Grade 5-8 target). Verifiable parental consent required.
   - What's unclear: Aruba-specific privacy regulations (beyond COPPA). Whether GDPR applies to Aruban users.
   - Recommendation: Implement COPPA compliance (stricter standard). Consult legal expert for Aruba/Netherlands privacy law applicability. Use checkbox consent with explicit link to full policy.

4. **Locale Cookie Persistence vs User Profile**
   - What we know: next-intl can store locale in cookie (NEXT_LOCALE). User profile will store locale after login.
   - What's unclear: Should cookie persist after login (redundant with profile)? Or clear cookie and only use profile?
   - Recommendation: Keep both. Cookie for anonymous users, profile for authenticated. Profile overrides cookie after login.

5. **Environment Variable Limits on Vercel**
   - What we know: Vercel allows 64KB total environment variables per deployment. Edge Functions/Middleware limited to 5KB per variable.
   - What's unclear: Does middleware locale detection hit 5KB limit with large translation JSON? Or only if variables used in middleware code?
   - Recommendation: Keep translation JSON in /messages directory (not env vars). Only use env vars for API keys/config. Should stay well under 64KB limit.

## Sources

### Primary (HIGH confidence)
- next-intl official docs (https://next-intl.dev/docs/getting-started/app-router) - Setup, routing, middleware, translations
- Supabase RLS docs (https://supabase.com/docs/guides/database/postgres/row-level-security) - Policy syntax, auth.uid(), performance
- Supabase SSR docs (https://supabase.com/docs/guides/auth/server-side/creating-a-client) - createBrowserClient, createServerClient, cookie handling
- Next.js Environment Variables (https://nextjs.org/docs/pages/guides/environment-variables) - .env files, NEXT_PUBLIC_ prefix, Vercel deployment
- Next.js Project Structure (https://nextjs.org/docs/app/getting-started/project-structure) - App Router conventions, folder organization
- Tailwind CSS Next.js Guide (https://tailwindcss.com/docs/guides/nextjs) - Tailwind 4 setup, PostCSS config

### Secondary (MEDIUM confidence)
- DesignRevision Supabase RLS Guide (https://designrevision.com/blog/supabase-row-level-security) - Common pitfalls, RLS patterns verified with official docs
- ProsperaSoft RLS Misconfigurations (https://prosperasoft.com/blog/database/supabase/supabase-rls-issues/) - Pitfall examples verified with Supabase docs
- Vercel Environment Variables Docs (https://vercel.com/docs/environment-variables) - Environment-specific config, limits (64KB, 5KB for Edge)
- COPPA Compliance Guide 2025 (https://blog.promise.legal/startup-central/coppa-compliance-in-2025-a-practical-guide-for-tech-edtech-and-kids-apps/) - Updated rule effective June 23, 2025, compliance by April 22, 2026
- FTC COPPA Rule (https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa) - Official federal regulations

### Tertiary (LOW confidence - needs validation)
- Papiamento vs Papiamentu differences (https://en.wikipedia.org/wiki/Papiamento, https://fluent.travel/papiamento-vs-papiamentu/) - Orthography differences (1976-1977), "o" vs "u" endings, "c" vs "k". Needs native speaker verification.
- Privacy policy readability research (https://www.researchgate.net/figure/Privacy-policy-reading-grade-level-RGL-N64-The-RGL-was-an-average-of_fig3_322258386) - Industry average Grade 12+, recommendation Grade 5-8. Academic research, not regulatory requirement.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries have official Next.js 15/16 documentation updated in 2025/2026
- Architecture: HIGH - Patterns verified with official docs and Context7, widely adopted in production
- Pitfalls: HIGH - RLS pitfalls documented in Supabase official troubleshooting, verified with multiple sources
- Papiamento spelling: MEDIUM - Wikipedia and travel guides agree on orthography differences, but no official style guide found
- Privacy policy readability: MEDIUM - Academic research consensus on Grade 5-8 target, but COPPA doesn't specify grade level

**Research date:** 2026-02-13
**Valid until:** 2026-03-15 (30 days - stable infrastructure stack)

**Note:** Tailwind CSS 4 released Jan 2025, next-intl 3.x stable, @supabase/ssr mature. Stack is current and stable. COPPA amendments effective June 23, 2025 with compliance deadline April 22, 2026 (future change, track regulatory updates).
