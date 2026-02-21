# Phase 07: Parent Portal & Admin Monitoring - Research

**Researched:** 2026-02-21
**Domain:** Parent dashboard (progress visualization, child management, subscription view, vacation calendar, weekly email reports), Admin monitoring (family overview, stuck-child alerts, vacation schedule management)
**Confidence:** HIGH

---

## Summary

Phase 7 builds on a solid foundation already established across Phases 2-6. The parent dashboard page at `/dashboard` already exists and renders children. The admin panel at `/admin` already exists with payments and leerstof sections. The progress data model (`child_subject_progress`, `progress_events`) is fully in place from Phase 5. The subscription data (`subscriptions`, `payment_requests`) is in place from Phase 3. This phase is largely about **surfacing existing data** through new UI surfaces, plus one new external dependency: email delivery.

The most architecturally significant decision is the weekly email report (OUDER-04). No email service is currently configured. **Resend** is the correct choice: it has official Supabase Edge Function integration, a generous free tier (3,000 emails/month, 100/day), and a simple REST API that requires no SDK installation on the Next.js side — the Edge Function calls it directly. The weekly cron job is driven by **Supabase Cron** (pg_cron + pg_net), which calls a Supabase Edge Function that aggregates progress data and emails parents.

Progress charts for the parent dashboard do NOT require Recharts or any chart library. The existing `ProgressBar` and `LevelBadge` components (already in `src/components/progress/`) are sufficient for showing level progression per subject. A simple CSS-based trend line (showing whether the child went up/down in the last week) can be built with Tailwind. This keeps the bundle light and avoids the React 19 override issues with older Recharts versions. If richer charting is needed in future, Recharts 3.7.0 is now React 19 compatible.

**Primary recommendation:** Use Resend via Supabase Edge Function for weekly emails, Supabase Cron (pg_cron) to trigger it weekly, and pure Tailwind CSS for all progress visualization. No new npm packages are needed on the Next.js side.

---

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase PostgreSQL | existing | Progress, subscriptions, families, vacation table | All data already here; RLS pattern established |
| `@supabase/supabase-js` | ^2.95.3 | Data queries from Server Components | Already in project |
| `@supabase/ssr` | ^0.8.0 | Server-side auth with cookies | Already in project |
| Next.js App Router | 16.1.6 | Server Components, Server Actions for all mutations | Already in project |
| Tailwind CSS 4 | ^4 | Progress bars, dashboard cards, charts | Already in project |
| next-intl | ^4.8.2 | nl/pap/en locale support on all new pages | Already in project |
| `react-hook-form` + zod | ^7.71.1 / ^4.3.6 | Child edit forms, vacation schedule forms | Already in project |

### New Dependency: Email

| Library | Version | Purpose | Why This One |
|---------|---------|---------|--------------|
| Resend (via Edge Function, no npm install) | REST API v1 | Weekly progress emails | Free tier 3k/month; official Supabase Edge Function docs; no SDK needed — raw fetch to `https://api.resend.com/emails` |

**No npm install required.** The Supabase Edge Function (Deno runtime) calls Resend's REST API directly using `fetch`. The Next.js application itself does not import Resend.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Resend via Edge Function | SendGrid | SendGrid requires more setup, higher cost, no simpler than Resend |
| Resend via Edge Function | Nodemailer + SMTP | Requires external SMTP server (no free option for transactional); not serverless-friendly |
| Resend via Edge Function | Supabase's built-in email | Supabase email is auth-only (magic links, password resets); cannot send custom content |
| Supabase Cron (pg_cron) | Vercel Cron Jobs | Vercel Cron requires Pro plan; pg_cron is free and already in Supabase |
| Pure Tailwind progress bars | Recharts | Recharts adds ~150KB bundle; requires `'use client'`; React 19 needs `react-is` override; Tailwind is sufficient for level visualization |

**Installation (only one command, for Resend domain setup — no npm):**
```bash
# No npm install needed. Resend account + domain verification required before deploy.
# Resend API key goes in Supabase Edge Function secrets:
supabase secrets set RESEND_API_KEY=re_...
```

---

## Architecture Patterns

### Recommended New File Structure

```
src/
├── app/[locale]/
│   ├── dashboard/
│   │   ├── page.tsx              # EXISTING — extend with progress cards
│   │   └── kind/
│   │       └── [childId]/
│   │           └── page.tsx      # NEW: per-kind voortgang detail page
│   ├── admin/
│   │   ├── layout.tsx            # EXISTING (bg-gray-900 header)
│   │   ├── page.tsx              # EXISTING — add Gebruikers and Statistieken links
│   │   ├── payments/             # EXISTING
│   │   ├── leerstof/             # EXISTING
│   │   ├── gebruikers/
│   │   │   └── page.tsx          # NEW: families + kinderen overzicht (ADMIN-03)
│   │   └── vakanties/
│   │       └── page.tsx          # NEW: vakantierooster beheer (ADMIN-05)
│   └── vakanties/
│       └── page.tsx              # NEW: parent-facing vacation calendar (OUDER-05)
├── lib/
│   ├── progress/
│   │   └── queries.ts            # NEW: getProgressForParent, getAllChildrenProgress
│   ├── email/
│   │   └── weekly-report.ts      # NEW: generateWeeklyReportHTML(childId)
│   └── vacations/
│       └── queries.ts            # NEW: getVacations, upsertVacation, deleteVacation
├── components/
│   ├── progress/                 # EXISTING (LevelBadge, ProgressBar, SubjectProgress)
│   │   └── ProgressSummaryCard.tsx  # NEW: compact card per child for dashboard
│   └── admin/
│       └── VacationForm.tsx      # NEW: add/edit vacation form
└── supabase/
    ├── migrations/
    │   └── 009_vacation_tables.sql  # NEW: school_vacations table
    └── functions/
        └── weekly-progress-report/
            └── index.ts          # NEW: Supabase Edge Function (Deno)
```

### Pattern 1: Server Component Data Fetching for Parent Dashboard

**What:** The existing `/dashboard/page.tsx` Server Component already fetches `profile`, `children`, and `subscription`. Phase 7 extends it to also fetch progress data per child.

**When to use:** For any page that reads data without user interaction on load.

**Example:**
```typescript
// Extension to src/app/[locale]/dashboard/page.tsx
// After fetching children, also fetch progress per child

const childIds = (children || []).map(c => c.id);

// Batch query: all progress rows for all this parent's children
const { data: progressRows } = await supabase
  .from('child_subject_progress')
  .select('child_id, subject, current_level, assessment_completed, is_stuck, last_session_at')
  .in('child_id', childIds);

// Build a map: childId -> subject -> progress
const progressByChild: Record<string, Record<string, ChildSubjectProgress>> = {};
for (const row of (progressRows || [])) {
  if (!progressByChild[row.child_id]) progressByChild[row.child_id] = {};
  progressByChild[row.child_id][row.subject] = row;
}

// Pass to ProgressSummaryCard (client component)
```

**Note:** Use `.in('child_id', childIds)` for a single query across all children. Do NOT do N+1 queries (one per child).

### Pattern 2: Admin Service Role for Cross-Family Queries

**What:** Admin pages need to read data across all families. The existing `createAdminClient()` in `src/lib/auth/admin.ts` creates a service-role client that bypasses RLS.

**When to use:** Any admin page that must see all families, not just the current user's.

**Example:**
```typescript
// src/app/[locale]/admin/gebruikers/page.tsx
import { createAdminClient } from '@/lib/auth/admin'

const adminClient = createAdminClient()

// Fetch all profiles with their children and progress
const { data: families } = await adminClient
  .from('profiles')
  .select(`
    id,
    user_id,
    display_name,
    created_at,
    children (
      id,
      first_name,
      grade,
      child_subject_progress (
        subject,
        current_level,
        is_stuck,
        last_session_at
      )
    ),
    subscriptions (
      status,
      expires_at
    )
  `)
  .order('created_at', { ascending: false })
```

**Note:** Nested selects with Supabase work via foreign key relationships. The `children` → `child_subject_progress` nesting works because the FK exists.

### Pattern 3: Server Actions for Vacation CRUD

**What:** Admin adds/edits/deletes vacation entries via Server Actions. Parent views read-only.

**Example:**
```typescript
// src/lib/vacations/actions.ts
'use server'
import { createAdminClient } from '@/lib/auth/admin'
import { isAdmin } from '@/lib/auth/admin'
import { revalidatePath } from 'next/cache'

export async function upsertVacation(formData: FormData) {
  const adminOk = await isAdmin()
  if (!adminOk) return { error: 'Geen toegang' }

  const adminClient = createAdminClient()

  const id = formData.get('id') as string | null
  const name = formData.get('name') as string
  const start_date = formData.get('start_date') as string
  const end_date = formData.get('end_date') as string
  const school_year = formData.get('school_year') as string // e.g. '2025-2026'

  const record = { name, start_date, end_date, school_year }

  if (id) {
    await adminClient.from('school_vacations').update(record).eq('id', id)
  } else {
    await adminClient.from('school_vacations').insert(record)
  }

  revalidatePath('/nl/admin/vakanties')
  revalidatePath('/nl/vakanties')
  return { success: true }
}
```

### Pattern 4: Supabase Edge Function for Weekly Emails

**What:** A Deno Edge Function reads all active families, generates per-child HTML progress summaries, and sends emails via Resend REST API. Triggered weekly by pg_cron.

**Example:**
```typescript
// supabase/functions/weekly-progress-report/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

Deno.serve(async (_req) => {
  // 1. Fetch all active families with children and progress
  const { data: families } = await supabase
    .from('profiles')
    .select(`
      display_name,
      user_id,
      children (
        first_name,
        grade,
        child_subject_progress (subject, current_level, is_stuck, last_session_at, total_sessions)
      )
    `)
    .not('children', 'is', null)

  // 2. For each family, get the parent email from auth
  for (const family of families ?? []) {
    const { data: authUser } = await supabase.auth.admin.getUserById(family.user_id)
    const email = authUser?.user?.email
    if (!email) continue

    // Skip families with no active subscription
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('status, expires_at')
      .eq('profile_id', family.id)  // Note: profiles.id, not user_id
      .eq('status', 'active')
      .maybeSingle()

    if (!sub || new Date(sub.expires_at) < new Date()) continue

    // 3. Generate HTML for this family's children
    const html = generateReportHTML(family.display_name, family.children)

    // 4. Send via Resend
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'ArubaLeren <voortgang@aruba-leren.com>',
        to: [email],
        subject: 'Wekelijks voortgangsbericht',
        html,
      }),
    })
  }

  return new Response(JSON.stringify({ sent: families?.length ?? 0 }))
})

function generateReportHTML(parentName: string, children: any[]): string {
  // Pure HTML string — no React-email needed in Edge Function
  const childRows = children.map(child => {
    const subjects = (child.child_subject_progress ?? [])
      .map((p: any) => `<li>${p.subject}: Niveau ${p.current_level}/5${p.is_stuck ? ' ⚠️ Vastgelopen' : ''}</li>`)
      .join('')
    return `<h3>${child.first_name} (Klas ${child.grade})</h3><ul>${subjects}</ul>`
  }).join('')

  return `
    <html><body style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Voortgangsbericht voor ${parentName}</h2>
      <p>Hier is het wekelijkse overzicht van uw kinderen:</p>
      ${childRows}
      <p><a href="https://aruba-leren.com/nl/dashboard">Bekijk uw dashboard</a></p>
    </body></html>
  `
}
```

**Cron SQL to schedule weekly on Sunday at 7:00 AM Aruba time (UTC-4, so 11:00 UTC):**
```sql
-- Run in Supabase SQL Editor after enabling pg_cron extension
select cron.schedule(
  'weekly-progress-report',
  '0 11 * * 0',  -- Every Sunday at 11:00 UTC (= 7:00 AM Aruba time)
  $$
    select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
                || '/functions/v1/weekly-progress-report',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'publishable_key')
        ),
        body := '{"trigger": "cron"}'::jsonb
    );
  $$
);
```

### Pattern 5: Mobile-First Dashboard Cards

**What:** The parent dashboard is the primary mobile surface. Cards must be full-width on mobile, 2-col on tablet+. Progress data is shown per child using existing `SubjectProgress` component.

**Example layout:**
```typescript
// Mobile-first grid — 1 col on mobile, 2 on md+
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  {children.map(child => (
    <ProgressSummaryCard
      key={child.id}
      child={child}
      progress={progressByChild[child.id] ?? {}}
      locale={locale}
    />
  ))}
</div>
```

### Anti-Patterns to Avoid

- **N+1 database queries per child:** Always batch-fetch progress with `.in('child_id', childIds)`, not one query per child.
- **Using `user.id` instead of `profile.id` for child lookups:** Children reference `profile.id` (the auto-generated UUID), not `user.id`. This is a known source of bugs per project memory.
- **Sending emails from Next.js Server Actions:** Email send must happen in the Supabase Edge Function (triggered by cron), not in a Server Action. Server Actions are synchronous per HTTP request and cannot run on a schedule.
- **Storing the service role key in Next.js env:** The `SUPABASE_SERVICE_ROLE_KEY` is already in the Next.js environment (needed for admin operations in the existing codebase). For the Edge Function, it is available automatically as `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` — no additional secrets setup needed.
- **Querying `auth.users` from a regular Supabase client:** Getting parent emails for weekly reports requires `supabase.auth.admin.getUserById()`, which needs the service role key. Only call this from the Edge Function or Server-side with `createAdminClient()`.
- **Recharts in Server Components:** Recharts is a client-side library. If used at all, wrap in a `'use client'` component and pass data as props. For this phase, pure Tailwind is sufficient and preferred.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Weekly email scheduling | setTimeout, Vercel route polling | Supabase Cron (pg_cron) | pg_cron runs in Postgres, survives deploys, free on all Supabase plans |
| Email delivery | Custom SMTP integration, Nodemailer | Resend REST API (fetch) | Domain reputation, DKIM/SPF handled, free tier 3k/month |
| Progress trend charts | D3.js, Chart.js, custom SVG | Existing ProgressBar + LevelBadge Tailwind components | Already built in Phase 5; sufficient for level 1-5 display |
| Admin authentication gate | Custom middleware | Existing `isAdmin()` + admin layout pattern | Already in `/admin/layout.tsx`; defense-in-depth already implemented |
| Vacation calendar UI | Full calendar component library | Simple HTML table or card list with Tailwind | No interaction needed for parents (read-only list); admin CRUD is a simple form |
| Email HTML template | React-email, MJML | Plain HTML string in Edge Function | React-email requires React runtime; Edge Function is Deno; plain HTML is sufficient for simple reports |

**Key insight:** The most complex engineering challenge in this phase is the weekly email pipeline (Supabase Cron + Edge Function + Resend). Everything else is Server Component data fetching + forms that directly follow existing patterns in the codebase.

---

## Common Pitfalls

### Pitfall 1: profiles.id vs user.id Confusion

**What goes wrong:** Querying children with `.eq('parent_id', user.id)` instead of `.eq('parent_id', profile.id)`. This returns zero results silently.

**Why it happens:** `profiles.id` is a separate auto-generated UUID. `profiles.user_id` references `auth.users`. Children reference `profiles.id` as their `parent_id`.

**How to avoid:** Always fetch `profile.id` first (via `.eq('user_id', user.id)`), then use `profile.id` for all child and progress queries. This pattern is already correct in the existing dashboard page.

**Warning signs:** Admin family overview shows empty children lists; parent dashboard shows no progress data.

### Pitfall 2: Admin Nested Join Returns Progress for All Children

**What goes wrong:** When doing `profiles.select('..., children(id, child_subject_progress(...))')`, Supabase follows all FK relationships — which means ALL subjects for ALL children are returned. For large families, this could be a large payload.

**Why it happens:** Supabase nested selects are unlimited by default.

**How to avoid:** For the admin overview, only fetch the last 7 days of progress events (use `last_session_at > now() - interval '7 days'` filter). For the detailed per-family view, fetch full progress only when drilling into a single family.

**Warning signs:** Admin page loads slowly; page payload is very large.

### Pitfall 3: Edge Function Cannot Import from Next.js Codebase

**What goes wrong:** Trying to reuse TypeScript types or utility functions from `src/lib/` inside the Edge Function.

**Why it happens:** Edge Functions run in the Deno runtime, not Node.js. They cannot import from `src/`.

**How to avoid:** Keep the Edge Function self-contained. Duplicate any necessary type definitions inline. The function's logic should be simple enough not to need shared utilities.

**Warning signs:** Edge Function deploy fails with module import errors.

### Pitfall 4: pg_cron Not Enabled by Default

**What goes wrong:** The SQL `cron.schedule(...)` call fails with "function cron.schedule does not exist".

**Why it happens:** The `pg_cron` extension must be explicitly enabled in Supabase Dashboard → Database → Extensions.

**How to avoid:** Enable pg_cron extension first. Also ensure `pg_net` is enabled (needed for HTTP requests from pg_cron). Both are available on all Supabase plans.

**Warning signs:** Migration 009 or cron setup SQL fails immediately with "schema cron not found".

### Pitfall 5: Resend Free Tier Daily Limit

**What goes wrong:** Weekly report cron fires on Sunday, tries to send 200+ emails, hits the 100/day free tier limit, and some parents never receive their report.

**Why it happens:** Resend free tier caps at 100 emails/day (3,000/month).

**How to avoid:** For the current scale of ArubaLeren (small island school platform), 100 emails/day is unlikely to be exceeded. If the platform grows, the Resend Pro plan ($20/month for 50k emails) is the straightforward upgrade path. Implement a small delay between emails (`await new Promise(r => setTimeout(r, 100))`) to avoid rate limits.

**Warning signs:** Some parents report not receiving weekly emails; Resend dashboard shows "rate limited" errors.

### Pitfall 6: Vacation Calendar Without School Year Scoping

**What goes wrong:** Admin adds vacations for 2025-2026 and 2026-2027 into the same table. Parent calendar shows all vacation entries including past school years.

**Why it happens:** No `school_year` column or filtering.

**How to avoid:** Add `school_year TEXT NOT NULL` column (e.g. `'2025-2026'`). Parent calendar page filters by current school year. Admin can switch between school years for management.

**Warning signs:** Parent vacation calendar shows dates from previous years.

### Pitfall 7: is_stuck Flag Already Set Means Admin Alert Fires Weekly

**What goes wrong:** ADMIN-04 says "admin receives alert when child fails 3x". If implemented as "show all children where `is_stuck = true`", the same child stays in the alert list indefinitely even after the parent addressed it.

**Why it happens:** The `is_stuck` flag in `child_subject_progress` is cleared only when the child gets a correct answer in tutoring. If the child hasn't had a session since being flagged, `is_stuck` stays `true`.

**How to avoid:** The admin "stuck children" view should show `is_stuck = true` with `stuck_since` timestamp. Add a column for when the flag was last seen by admin (acknowledged). This can be a simple `admin_notified_at` column added in migration 009, so admin can mark alerts as "seen". Alternatively, show `is_stuck = true AND stuck_since > now() - interval '7 days'` to limit to recent episodes.

**Warning signs:** Admin alert list never shrinks; same children appear week after week.

---

## Code Examples

Verified patterns based on existing codebase:

### Migration 009: school_vacations Table

```sql
-- supabase/migrations/009_vacation_tables.sql

-- School vacations table for OUDER-05 (parent view) and ADMIN-05 (admin management)
CREATE TABLE IF NOT EXISTS school_vacations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                   -- e.g. 'Kerstvakantie', 'Groot Vakantie'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  school_year TEXT NOT NULL,            -- e.g. '2025-2026'
  is_public_holiday BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_school_vacations_school_year
  ON school_vacations(school_year, start_date);

ALTER TABLE school_vacations ENABLE ROW LEVEL SECURITY;

-- Parents and all authenticated users can read vacation schedule
CREATE POLICY "Authenticated users can view vacations"
  ON school_vacations FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins can modify (enforced in Server Action, not RLS — service role bypasses RLS)
-- RLS is read-only for regular users; write operations go through createAdminClient()
```

### Progress Summary Card Component (New)

```typescript
// src/components/progress/ProgressSummaryCard.tsx
'use client'

import type { ChildSubjectProgress } from '@/types/progress'
import { SUBJECTS } from '@/types/tutoring'
import SubjectProgress from './SubjectProgress'
import Link from 'next/link'

interface Child {
  id: string
  first_name: string
  grade: number
}

interface ProgressSummaryCardProps {
  child: Child
  progress: Record<string, ChildSubjectProgress>
  locale: string
}

export default function ProgressSummaryCard({ child, progress, locale }: ProgressSummaryCardProps) {
  const kernVakken = SUBJECTS.filter(s => s.category === 'kern')
  const hasAnyProgress = Object.keys(progress).length > 0

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-sky-100">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-sky-700">{child.first_name}</h3>
          <p className="text-sm text-gray-500">Klas {child.grade}</p>
        </div>
        <Link
          href={`/${locale}/dashboard/kind/${child.id}`}
          className="text-sm text-sky-600 font-semibold hover:underline"
        >
          Details
        </Link>
      </div>

      {hasAnyProgress ? (
        <div className="space-y-3">
          {kernVakken.map(subject => (
            <div key={subject.id}>
              <p className="text-sm font-medium text-gray-700 mb-1">{subject.labelNl}</p>
              <SubjectProgress
                progress={progress[subject.id] ?? null}
                locale={locale}
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 italic">Nog geen lessen gevolgd</p>
      )}
    </div>
  )
}
```

### Admin Gebruikers Page Pattern

```typescript
// src/app/[locale]/admin/gebruikers/page.tsx (Server Component)
import { isAdmin, createAdminClient } from '@/lib/auth/admin'
import { redirect } from 'next/navigation'

export default async function AdminGebruikersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params

  const userIsAdmin = await isAdmin()
  if (!userIsAdmin) redirect(`/${locale}`)

  const adminClient = createAdminClient()

  // Fetch all families (profiles) with their children and subscription status
  const { data: families } = await adminClient
    .from('profiles')
    .select(`
      id,
      display_name,
      created_at,
      children ( id, first_name, grade, child_subject_progress ( subject, is_stuck ) ),
      subscriptions ( status, expires_at )
    `)
    .order('created_at', { ascending: false })

  // Identify stuck children for ADMIN-04
  const stuckAlerts = (families ?? []).flatMap(family =>
    (family.children ?? []).flatMap(child =>
      (child.child_subject_progress ?? [])
        .filter((p: any) => p.is_stuck)
        .map((p: any) => ({
          familyName: family.display_name,
          childName: child.first_name,
          subject: p.subject,
          familyId: family.id
        }))
    )
  )

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-900 mb-8">Families & Kinderen</h2>

      {/* Stuck children alerts */}
      {stuckAlerts.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-4 mb-8">
          <h3 className="font-bold text-red-900 mb-2">
            Kinderen die vastgelopen zijn ({stuckAlerts.length})
          </h3>
          <ul className="space-y-1">
            {stuckAlerts.map((alert, i) => (
              <li key={i} className="text-sm text-red-800">
                {alert.childName} ({alert.familyName}) — {alert.subject}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Families table */}
      <div className="space-y-4">
        {(families ?? []).map(family => (
          <div key={family.id} className="bg-white rounded-xl shadow-md p-6 border-l-4 border-sky-500">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{family.display_name}</h3>
                <p className="text-sm text-gray-500">
                  {family.children?.length ?? 0} kind(eren) |{' '}
                  Abonnement: {(family.subscriptions as any)?.[0]?.status ?? 'geen'}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(family.children ?? []).map((child: any) => (
                <span key={child.id} className="px-3 py-1 bg-sky-100 text-sky-800 rounded-full text-sm font-medium">
                  {child.first_name} (klas {child.grade})
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### Vacation Calendar (Parent View)

```typescript
// src/app/[locale]/vakanties/page.tsx (Server Component)
import { createClient } from '@/lib/supabase/server'

export default async function VacationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const supabase = await createClient()

  // Determine current school year (Aruba school year starts in August)
  const now = new Date()
  const year = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1
  const currentSchoolYear = `${year}-${year + 1}`

  const { data: vacations } = await supabase
    .from('school_vacations')
    .select('name, start_date, end_date, is_public_holiday')
    .eq('school_year', currentSchoolYear)
    .order('start_date', { ascending: true })

  const formatDate = (d: string) => new Date(d).toLocaleDateString('nl-NL', {
    day: 'numeric', month: 'long', year: 'numeric'
  })

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        Vakantierooster {currentSchoolYear}
      </h1>
      <div className="space-y-3">
        {(vacations ?? []).map(v => (
          <div key={v.name + v.start_date}
            className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-sky-400 flex justify-between items-center">
            <div>
              <p className="font-semibold text-gray-900">{v.name}</p>
              <p className="text-sm text-gray-600">
                {formatDate(v.start_date)} t/m {formatDate(v.end_date)}
              </p>
            </div>
            {v.is_public_holiday && (
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-medium">
                Feestdag
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## New Database Tables Required

### Migration 009: school_vacations

```sql
-- Only new table needed for Phase 7
-- child_subject_progress and progress_events already exist from Phase 5
-- subscriptions and payment_requests already exist from Phase 3

CREATE TABLE IF NOT EXISTS school_vacations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  school_year TEXT NOT NULL,             -- '2025-2026', '2026-2027', etc.
  is_public_holiday BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_school_vacations_year
  ON school_vacations(school_year, start_date ASC);

ALTER TABLE school_vacations ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read the vacation schedule
CREATE POLICY "Authenticated users can view school vacations"
  ON school_vacations FOR SELECT
  USING (auth.role() = 'authenticated');

-- Admin writes bypass RLS via service role (createAdminClient)
-- No write policy needed — admin operations use service role key

-- Trigger for updated_at
CREATE TRIGGER update_school_vacations_updated_at
  BEFORE UPDATE ON school_vacations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Seed data for initial Aruba vacations (2025-2026 school year):**
The official Aruba vacation schedule is published at ea.aw as a PDF. The admin can enter this via the admin interface in ADMIN-05, or it can be seeded via a SQL INSERT after the planner tasks are complete. Do not hardcode dates in application code — store all dates in the database.

---

## Supabase Cron Setup

Supabase Cron is a managed abstraction over pg_cron. To set up the weekly email cron:

1. Enable `pg_cron` extension: Supabase Dashboard → Database → Extensions → search "pg_cron" → Enable
2. Enable `pg_net` extension: same flow (needed for HTTP requests from pg_cron)
3. Store project URL and publishable key in Vault (or use hardcoded URL — simpler for small project)
4. Run the cron schedule SQL (shown in Pattern 4 above)
5. Deploy the Edge Function: `supabase functions deploy weekly-progress-report`
6. Set Edge Function secret: `supabase secrets set RESEND_API_KEY=re_...`

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Scheduled jobs on Vercel (Pro only) | Supabase Cron (pg_cron, free) | Supabase introduced managed Cron in 2024 | No Vercel Pro required for scheduled work |
| Recharts for all charts | Pure Tailwind CSS for simple progress bars | N/A — always an option | Zero bundle cost for level 1-5 visualization |
| Recharts 2.x with React 18 | Recharts 3.7.0 supports React 19 | mid-2025 | Compatible if charts are ever needed |
| SendGrid/Mailchimp for transactional email | Resend (developer-first, free tier, Supabase native) | 2023-2024 | Simpler setup, better DX, free at small scale |
| Admin queries with separate admin DB user | Service role key via createAdminClient() | Existing pattern in codebase | Consistent with existing Phase 3 admin pattern |

**Deprecated/outdated:**
- Using Vercel Cron Jobs for scheduled email: requires Pro plan; Supabase Cron is free
- React-email in Edge Functions: Deno runtime has no React; use plain HTML strings instead

---

## Existing Codebase What's Already Done

To avoid re-implementing what Phase 2-6 already built:

| Feature | Status | Location |
|---------|--------|----------|
| Parent dashboard page | EXISTS (extend it) | `src/app/[locale]/dashboard/page.tsx` |
| Child list + edit + delete | EXISTS (reuse) | `src/components/ChildList.tsx` + `src/lib/children/actions.ts` |
| AddChildForm | EXISTS (reuse) | `src/components/AddChildForm.tsx` |
| Subscription status page | EXISTS (keep as-is) | `src/app/[locale]/subscription/status/page.tsx` |
| Payment request history | EXISTS in subscription/status (keep as-is) | Same page as above |
| Admin layout (bg-gray-900, isAdmin gate) | EXISTS | `src/app/[locale]/admin/layout.tsx` |
| Admin payments page | EXISTS | `src/app/[locale]/admin/payments/page.tsx` |
| `createAdminClient()` | EXISTS | `src/lib/auth/admin.ts` |
| `isAdmin()` | EXISTS | `src/lib/auth/admin.ts` |
| `child_subject_progress` table + RLS | EXISTS | Migration 007 |
| `progress_events` table + RLS | EXISTS | Migration 007 |
| `ProgressBar`, `LevelBadge`, `SubjectProgress` components | EXISTS | `src/components/progress/` |
| `ChildSubjectProgress` TypeScript type | EXISTS | `src/types/progress.ts` |
| `SUBJECTS` array with labelNl/labelPap | EXISTS | `src/types/tutoring.ts` |

What OUDER-03 requires (subscription status + payment history) is already complete at `/subscription/status`. The Phase 7 work for OUDER-03 is only to add a link to this page from the new enhanced dashboard, and verify the data is correct. No new implementation needed.

---

## Open Questions

1. **Resend domain verification**
   - What we know: Resend requires a verified domain to send from (cannot send from generic addresses without verification). The project needs a domain (e.g., aruba-leren.com).
   - What's unclear: Does the user have a domain set up? What DNS access do they have?
   - Recommendation: During Edge Function implementation task, include step to register a domain on Resend and add DNS records. If domain is not yet available, use Resend's onboarding@resend.dev test sender for development.

2. **Aruba vacation dates for initial seed**
   - What we know: Official dates are published at ea.aw as a PDF (school year 2025-2026 is approved). The PDF is not machine-readable via web fetch.
   - What's unclear: Exact dates for each vacation period in 2025-2026.
   - Recommendation: Admin enters initial vacation dates manually via the admin UI built in ADMIN-05. Alternatively, obtain the PDF from ea.aw and seed via SQL INSERT during migration. Do not hardcode in application code.

3. **Profile ID join for Edge Function**
   - What we know: The Edge Function needs `profile.id` (not `user.id`) to query subscriptions. The `profiles` table has both columns. To get parent email, need `auth.users` via `user_id`.
   - What's unclear: The Edge Function uses service role, so it can query both. But the join sequence matters.
   - Recommendation: In the Edge Function, query `profiles` (get `id` and `user_id`), then call `supabase.auth.admin.getUserById(profile.user_id)` to get the email. Do not query `auth.users` directly via SQL.

4. **pg_cron timezone for Aruba**
   - What we know: Aruba is UTC-4 (AST, no daylight saving). A Sunday 11:00 UTC cron means 7:00 AM local Aruba time.
   - What's unclear: Whether Supabase's pg_cron uses UTC or a configurable timezone.
   - Recommendation: Always express cron in UTC. Sunday 11:00 UTC = 7:00 AM Aruba time. This is a reasonable morning delivery time.

5. **Recharts for future trend charts**
   - What we know: Recharts 3.7.0 supports React 19. The project uses React 19.2.3. Would need a `'use client'` wrapper and possibly `npm install recharts`. React-redux (a Recharts peer dep) may need `@reduxjs/toolkit v2` for React 19.
   - What's unclear: Whether trend charts will ever be needed. Phase 7 requirements do not explicitly require trend charts — only "voortgang per kind, per vak with visual charts".
   - Recommendation: Do NOT install Recharts for Phase 7. The existing ProgressBar (level 1-5) with session count is sufficient for "visual charts". If future stakeholders request trend lines, Recharts can be added then. This avoids React 19 dependency management complexity now.

---

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis (read directly):
  - `aruba-leren/src/app/[locale]/dashboard/page.tsx` — confirmed existing dashboard structure
  - `aruba-leren/src/app/[locale]/admin/layout.tsx` — confirmed bg-gray-900 header, isAdmin gate
  - `aruba-leren/src/app/[locale]/admin/page.tsx` — confirmed placeholder "Gebruikers" and "Statistieken" cards
  - `aruba-leren/src/app/[locale]/subscription/status/page.tsx` — confirmed OUDER-03 already complete
  - `aruba-leren/src/lib/auth/admin.ts` — confirmed createAdminClient() + isAdmin() exist
  - `aruba-leren/src/types/progress.ts` — confirmed ChildSubjectProgress type
  - `aruba-leren/src/types/tutoring.ts` — confirmed Subject type, SUBJECTS array
  - `aruba-leren/src/components/progress/SubjectProgress.tsx` — confirmed reusable component exists
  - `aruba-leren/supabase/migrations/007_assessment_progress_tables.sql` — confirmed progress schema
  - `aruba-leren/package.json` — confirmed no Recharts/email library installed

- [Supabase Cron Quickstart](https://supabase.com/docs/guides/cron/quickstart) — confirmed scheduling options, pg_cron + pg_net HTTP pattern
- [Supabase Schedule Functions docs](https://supabase.com/docs/guides/functions/schedule-functions) — confirmed weekly cron SQL with net.http_post pattern

### Secondary (MEDIUM confidence)
- [Resend official Next.js docs](https://resend.com/docs/send-with-nextjs) — confirmed App Router integration, `resend.emails.send()` API
- [Resend Supabase Edge Function docs](https://resend.com/docs/send-with-supabase-edge-functions) — confirmed fetch-based approach for Deno runtime
- [Resend pricing page](https://resend.com/pricing) — confirmed 3,000/month free tier, 100/day limit
- Recharts npm page + GitHub issue tracker — confirmed version 3.7.0, React 19 compatible (as of late 2025)

### Tertiary (LOW confidence — verify in implementation)
- Aruba school vacation specific dates: PDF only available via download from ea.aw; specific dates for 2025-2026 not machine-readable. Admin must seed manually.
- pg_cron timezone behavior on Supabase: stated to use UTC based on documentation pattern, but verify via Supabase Dashboard after enabling.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all existing packages confirmed; Resend + Supabase Cron confirmed via official docs
- Architecture: HIGH — directly follows existing codebase patterns (createAdminClient, isAdmin, Server Components, Server Actions)
- Email pipeline: MEDIUM — Resend + Edge Function pattern confirmed by official docs; Resend domain setup is user-dependent
- Pitfalls: HIGH — based on existing codebase analysis and confirmed patterns (profiles.id vs user.id is documented in project memory)
- Vacation calendar: HIGH — simple CRUD; only data gap is actual Aruba dates (which go in DB, not code)

**Research date:** 2026-02-21
**Valid until:** 2026-04-21 (60 days — stable APIs, no fast-moving dependencies)
