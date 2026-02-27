# Phase 11: Rapportages & PDF-Deling - Research

**Researched:** 2026-02-27
**Domain:** Progress reporting, chart visualization, shareable links, PDF generation, WhatsApp sharing, bilingual i18n
**Confidence:** HIGH (codebase read directly; chart/sharing patterns verified via official sources)

---

## Summary

Phase 11 builds on top of the progress data already collected in Phase 5 and the parent portal from Phase 7. The data foundation is solid: `child_subject_progress` (current snapshot per child+subject), `progress_events` (append-only ledger of level changes and stuck events), and `tutoring_sessions` (timestamps for effective time calculation). The report generator aggregates this existing data — no new tracking infrastructure is required.

The four plans map cleanly onto four distinct technical areas: (1) data aggregation and chart rendering using shadcn/ui charts (Recharts v3 under the hood, React 19 compatible) for the progress graph — with Tailwind-only stat cards for the simpler metrics; (2) a study plan editor that reads from the existing progress data and writes a parent-editable JSONB blob to a new `study_plans` table; (3) shareable report links implemented as a new `report_tokens` table with a 30-day UUID token, an optional 4-digit PIN, and a public Next.js route that renders the report without requiring auth — bypassing Supabase RLS via the Supabase service role client on the server; (4) the WhatsApp share button is a plain anchor tag with a `wa.me` deep link, and bilingual output is handled via next-intl `getTranslations()` keyed on locale, applied to the report rendering layer.

The most important architectural decision is how to handle the public share link: it cannot use the standard `createClient()` (which requires an authenticated user) and it cannot use Supabase Storage signed URLs (those expire on their own schedule and are not PIN-protected). Instead, use a custom `report_tokens` table with RLS-exempt server-side reads via `createAdminClient()` — the same admin client pattern already used in the dashboard. This gives full control over expiry and PIN verification.

**Primary recommendation:** Use shadcn/ui charts (Recharts v3) for the progress line chart; Tailwind stat cards for all other metrics; a `report_tokens` database table for the shareable link system; and next-intl `getTranslations()` for the bilingual report. No new external dependencies are needed beyond Recharts.

---

## Standard Stack

### Core (already installed — no new packages needed for most plans)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.1.6 | App Router framework | Already in use |
| @supabase/supabase-js | ^2.95.3 | Database (progress data, report tokens) | Already in use |
| @supabase/ssr | ^0.8.0 | Server + client auth | Already in use |
| react-to-print | ^3.2.0 | Browser-native print / Save as PDF | Already installed (Phase 06) |
| next-intl | ^4.8.2 | Bilingual report text (nl + pap) | Already in use |
| tailwindcss | ^4 | Styling for stat cards and report layout | Already in use |
| lucide-react | ^0.563.0 | Icons (share, copy, download) | Already in use |
| react | 19.2.3 | UI | Already in use |

### New Library: Recharts (for progress line chart)

| Library | Version | Purpose | Why This One |
|---------|---------|---------|--------------|
| recharts | ^3.7.0 | SVG line chart for level-over-time graph | Recharts v3 supports React 19 (`"react": "^16.0.0 || ^17.0.0 || ^18.0.0 || ^19.0.0"`). shadcn/ui charts are built on Recharts. The project already uses shadcn/ui patterns. Must be a Client Component (`"use client"`). |

**Installation:**
```bash
cd aruba-leren
npm install recharts
```

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| recharts + shadcn chart | Pure Tailwind progress bars | Tailwind bars work for current level display (already in use in Phase 7) but cannot show level-over-time progression as a line. Line chart is required by RAPPORT-01 ("voortgangsgrafieken"). Use Tailwind for stat cards, Recharts only for the line chart. |
| Custom report_tokens table | Supabase Storage signed URLs | Signed URLs give no PIN support and expiry is not query-controllable from the app layer. The custom table approach (used in this project for homework_uploads too) is the right pattern. |
| Custom token table | NextAuth shared sessions / JWT | No NextAuth in this project. Supabase is the auth layer. |
| wa.me WhatsApp link | WhatsApp Business API | WhatsApp Business API requires approval and costs money. wa.me deep link is free, instant, no approval needed for this use case. |

---

## Architecture Patterns

### Recommended Project Structure (new files for Phase 11)

```
aruba-leren/src/
├── app/[locale]/
│   ├── dashboard/
│   │   └── kind/[childId]/
│   │       └── rapport/
│   │           └── page.tsx          # Authenticated report view + generate share link
│   └── rapport/
│       └── [token]/
│           └── page.tsx              # Public share view (no auth required)
├── components/
│   └── rapport/
│       ├── RapportView.tsx           # Shared render component (used by both pages)
│       ├── ProgressLineChart.tsx     # "use client" — Recharts level-over-time chart
│       ├── StudyPlanEditor.tsx       # "use client" — editable study plan grid
│       ├── ShareLinkPanel.tsx        # "use client" — copy link, WhatsApp button
│       └── RapportPrintWrapper.tsx   # react-to-print wrapper for Save as PDF
├── lib/
│   └── rapport/
│       ├── rapport-data.ts           # Aggregate all report data from Supabase
│       ├── study-plan-generator.ts   # AI-assisted (or rule-based) weekly plan builder
│       └── report-token.ts           # create / validate / expire report tokens
└── app/[locale]/api/
    └── rapport/
        ├── generate/route.ts         # POST: generate report token + snapshot
        └── study-plan/route.ts       # PUT: save parent-edited study plan
supabase/migrations/
└── 012_rapport_tables.sql            # report_tokens + study_plans tables
```

### Pattern 1: Report Data Aggregation (Server Component)

**What:** A server-side function reads from the three existing tables (`child_subject_progress`, `progress_events`, `tutoring_sessions`) and produces a typed `RapportData` object. This runs in a Next.js Server Component — no client-side fetching needed.

**When to use:** Both the authenticated report page and the public share page call the same aggregation function.

**Example:**
```typescript
// src/lib/rapport/rapport-data.ts
// Source: mirrors existing dashboard/kind/[childId]/page.tsx data-fetching pattern

import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface RapportData {
  child: { id: string; first_name: string; grade: number };
  generatedAt: string;
  subjects: SubjectRapport[];
  studyPlan: StudyPlanEntry[] | null;
}

export interface SubjectRapport {
  subject: string;
  labelNl: string;
  labelPap: string;
  startLevel: number | null;       // level_at_event where event_type = 'assessment_completed'
  currentLevel: number;            // from child_subject_progress.current_level
  levelHistory: LevelPoint[];      // sorted progress_events for line chart
  totalSessions: number;
  totalCorrect: number;
  totalIncorrect: number;
  totalHintsReceived: number;
  stuckEpisodes: number;           // stuck_concept_count from child_subject_progress
  effectiveMinutes: number;        // sum of (ended_at - started_at) for completed sessions
  recurringDifficulties: string[]; // derived: subjects where stuck_concept_count >= 2
  assessmentCompleted: boolean;
}

export interface LevelPoint {
  date: string;        // ISO date, for X axis
  level: number;       // 1-5, for Y axis
}

export async function buildRapportData(
  childId: string,
  supabase: SupabaseClient
): Promise<RapportData | null> {
  // Fetch child
  const { data: child } = await supabase
    .from('children')
    .select('id, first_name, grade')
    .eq('id', childId)
    .single();

  if (!child) return null;

  // Fetch all subject progress
  const { data: progressRows } = await supabase
    .from('child_subject_progress')
    .select('*')
    .eq('child_id', childId);

  // Fetch progress events for line chart (level_up / level_down / assessment_completed)
  const { data: events } = await supabase
    .from('progress_events')
    .select('subject, event_type, level_at_event, created_at')
    .eq('child_id', childId)
    .in('event_type', ['assessment_completed', 'level_up', 'level_down'])
    .order('created_at', { ascending: true });

  // Fetch completed sessions for effective time calculation
  const { data: sessions } = await supabase
    .from('tutoring_sessions')
    .select('subject, started_at, ended_at')
    .eq('child_id', childId)
    .not('ended_at', 'is', null);  // only completed sessions

  // Fetch study plan if exists
  const { data: studyPlanRow } = await supabase
    .from('study_plans')
    .select('plan_data')
    .eq('child_id', childId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Assemble per-subject rapport...
  // (see full implementation in plan)

  return {
    child,
    generatedAt: new Date().toISOString(),
    subjects: assembleSubjects(progressRows ?? [], events ?? [], sessions ?? []),
    studyPlan: studyPlanRow?.plan_data ?? null,
  };
}
```

### Pattern 2: Progress Line Chart (Client Component — Recharts)

**What:** A `"use client"` component that renders a level-over-time line chart using Recharts v3. Data is passed as a prop from the Server Component above — no client-side fetching.

**When to use:** Inside RapportView, for each subject that has more than one progress_event.

**Example:**
```typescript
// src/components/rapport/ProgressLineChart.tsx
'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

interface ProgressLineChartProps {
  data: Array<{ date: string; level: number }>;
  subjectLabel: string;
}

export default function ProgressLineChart({ data, subjectLabel }: ProgressLineChartProps) {
  // Format date for X axis: "15 jan"
  const formatted = data.map((d) => ({
    ...d,
    dateLabel: new Date(d.date).toLocaleDateString('nl-NL', {
      day: 'numeric', month: 'short'
    }),
  }));

  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={formatted} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
        <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11 }} />
        <Tooltip
          formatter={(value: number) => [`Niveau ${value}`, subjectLabel]}
        />
        <Line
          type="monotone"
          dataKey="level"
          stroke="#0ea5e9"
          strokeWidth={2}
          dot={{ r: 4, fill: '#0ea5e9' }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

**Note:** Recharts components require `"use client"`. Pass all data from server → client as props to avoid fetching in the client component. `ResponsiveContainer` handles mobile width correctly.

### Pattern 3: Shareable Link — Report Tokens Table

**What:** A `report_tokens` table stores a UUID token, the child_id, a hashed PIN, expiry timestamp, and a JSON snapshot of the report data (so the public view doesn't need to re-query all tables). The public route `/[locale]/rapport/[token]` verifies expiry + PIN, then renders the snapshot.

**When to use:** When the parent clicks "Link genereren" on the authenticated report page.

**Database schema (new migration 012):**
```sql
CREATE TABLE report_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id    UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  pin_hash    TEXT,                  -- SHA-256 of 4-digit PIN, or NULL if no PIN
  report_data JSONB NOT NULL,        -- Snapshot of RapportData at generation time
  locale      TEXT NOT NULL DEFAULT 'nl',
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only the owner can create tokens (via authenticated API route)
-- Public reads go through service role client — no RLS SELECT needed for anon
ALTER TABLE report_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can create tokens for their children"
  ON report_tokens FOR INSERT
  WITH CHECK (
    child_id IN (
      SELECT c.id FROM children c
      JOIN profiles p ON c.parent_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can delete their children's tokens"
  ON report_tokens FOR DELETE
  USING (
    child_id IN (
      SELECT c.id FROM children c
      JOIN profiles p ON c.parent_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );
-- No SELECT policy for anon: public reads use createAdminClient() on the server
```

**Public share route (server-side PIN gate):**
```typescript
// src/app/[locale]/rapport/[token]/page.tsx
import { createAdminClient } from '@/lib/auth/admin';  // already exists

export default async function PublicRapportPage({ params, searchParams }) {
  const { token, locale } = await params;
  const pin = (await searchParams).pin ?? null;

  // Use admin client to bypass RLS — this is server-only code, never exposes service key
  const adminClient = createAdminClient();
  const { data: tokenRow } = await adminClient
    .from('report_tokens')
    .select('*')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())  // not expired
    .single();

  if (!tokenRow) return <div>Link verlopen of ongeldig.</div>;

  // PIN check
  if (tokenRow.pin_hash) {
    if (!pin) return <PinGateForm token={token} />;
    const inputHash = hashPin(pin);  // SHA-256 via Web Crypto
    if (inputHash !== tokenRow.pin_hash) return <div>Onjuiste code.</div>;
  }

  // Render the snapshot (no further DB queries needed)
  return <RapportView data={tokenRow.report_data} locale={locale} readOnly />;
}
```

**Key insight:** The snapshot JSONB approach means the public view is fast (single row lookup) and the report content is frozen at generation time — subsequent tutoring sessions don't change the shared report.

### Pattern 4: WhatsApp Share Button

**What:** A plain anchor tag with a `wa.me` URL containing pre-filled text. No library needed.

**When to use:** On the share panel, after the token link is generated.

**Example:**
```typescript
// Source: WhatsApp URL scheme — https://faq.whatsapp.com/5246945405
interface WhatsAppShareButtonProps {
  childName: string;
  shareUrl: string;
  locale: 'nl' | 'pap';
}

export function WhatsAppShareButton({ childName, shareUrl, locale }: WhatsAppShareButtonProps) {
  const message = locale === 'pap'
    ? `Mira rapport di ${childName} na ArubaLeren: ${shareUrl}`
    : `Bekijk het voortgangsrapport van ${childName} via ArubaLeren: ${shareUrl}`;

  const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={waUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl font-semibold"
    >
      {/* WhatsApp SVG icon */}
      <span>Deel via WhatsApp</span>
    </a>
  );
}
```

**Note:** `wa.me/?text=...` (no phone number) opens the WhatsApp share picker — the sender chooses the recipient. This is the correct pattern for "share with anyone" flows. On mobile, opens the WhatsApp app directly.

### Pattern 5: Bilingual Report via next-intl

**What:** The `RapportView` component uses `getTranslations()` from `next-intl/server` (Server Component), receiving the locale from the route params. Report text is in both `nl.json` and `pap.json`.

**When to use:** Both the authenticated route and the public share route pass `locale` from route params. The stored `report_data.locale` in the token snapshot stores which locale was used at generation time.

**Example:**
```typescript
// In RapportView.tsx (Server Component)
import { getTranslations } from 'next-intl/server';

export default async function RapportView({ data, locale }: RapportViewProps) {
  const t = await getTranslations({ locale, namespace: 'rapport' });

  return (
    <section>
      <h1>{t('title', { name: data.child.first_name })}</h1>
      <p>{t('generatedAt', { date: new Date(data.generatedAt).toLocaleDateString(locale === 'nl' ? 'nl-NL' : 'pap') })}</p>
      {/* stat cards, charts, study plan */}
    </section>
  );
}
```

**Translation keys to add (both nl.json and pap.json):**
```json
// nl.json — rapport namespace
"rapport": {
  "title": "Voortgangsrapport van {name}",
  "generatedAt": "Gegenereerd op {date}",
  "startLevel": "Startniveau",
  "currentLevel": "Huidig niveau",
  "totalSessions": "Lessen gevolgd",
  "effectiveTime": "Effectieve leertijd",
  "stuckEpisodes": "Vastgelopen (totaal)",
  "shareLink": "Deel link",
  "copyLink": "Link kopiëren",
  "linkCopied": "Gekopieerd!",
  "linkExpires": "Link verloopt op {date}",
  "studyPlan": "Studieplan",
  "studyPlanWeek": "Week {week}",
  "confirmPlan": "Plan bevestigen",
  "editPlan": "Plan aanpassen",
  "pinProtect": "Beveilig met code",
  "enterPin": "Voer de 4-cijferige code in",
  "wrongPin": "Onjuiste code"
}
```

### Pattern 6: Effective Learning Time Calculation

**What:** `effective_minutes` per subject = sum of `(ended_at - started_at)` for all completed sessions, capped at 45 minutes per session to exclude idle time. Sessions without `ended_at` (abandoned) are excluded.

**Why cap at 45 minutes:** The `tutoring_sessions` table has `started_at` and `ended_at` (set when `endSession()` is called). If a browser tab is left open, `ended_at` is only set on explicit session end or next session start. A single open-tab session could show 8 hours. Capping at 45 minutes per session is a conservative heuristic to exclude idle.

**Implementation:**
```typescript
// In rapport-data.ts
function calcEffectiveMinutes(
  sessions: Array<{ started_at: string; ended_at: string | null; subject: string }>,
  subject: string
): number {
  const MAX_MINUTES_PER_SESSION = 45;

  return sessions
    .filter((s) => s.subject === subject && s.ended_at !== null)
    .reduce((total, s) => {
      const durationMs = new Date(s.ended_at!).getTime() - new Date(s.started_at).getTime();
      const durationMin = Math.min(durationMs / 60000, MAX_MINUTES_PER_SESSION);
      return total + Math.max(0, durationMin);  // guard against clock skew
    }, 0);
}
```

### Pattern 7: Study Plan (AI-Generated, Parent-Editable)

**What:** A weekly study plan grid (Mon–Fri, 5 rows × subject columns). The initial plan is generated by a simple rule-based algorithm (not an AI API call) that allocates more time to stuck subjects. The parent can edit it via a grid UI and save.

**Why rule-based, not AI:** An AI API call for plan generation adds latency, cost, and complexity to a feature that can be expressed as clear business rules: stuck subjects get 3 sessions/week, unstuck get 2, not-yet-assessed get 1.

**Rule algorithm:**
```typescript
// src/lib/rapport/study-plan-generator.ts
export interface StudyPlanEntry {
  subject: string;
  day: 'ma' | 'di' | 'wo' | 'do' | 'vr';
  minutes: number;
  completed: boolean;  // parent checks off
}

export function generateStudyPlan(subjects: SubjectRapport[]): StudyPlanEntry[] {
  const DAYS: StudyPlanEntry['day'][] = ['ma', 'di', 'wo', 'do', 'vr'];
  const plan: StudyPlanEntry[] = [];

  subjects.forEach((s) => {
    // Allocate sessions: stuck=3/week, normal=2/week, not-assessed=1/week
    const sessionsPerWeek = s.stuckEpisodes >= 2 ? 3 : s.assessmentCompleted ? 2 : 1;
    const assignedDays = DAYS.slice(0, sessionsPerWeek);

    assignedDays.forEach((day) => {
      plan.push({ subject: s.subject, day, minutes: 20, completed: false });
    });
  });

  return plan;
}
```

### Anti-Patterns to Avoid

- **Fetching report data client-side:** The report aggregation query joins multiple tables. Do this in a Server Component and pass data as props to client charts. Client-side fetching would expose Supabase RLS complexity to the browser and slow the initial render.
- **Using Supabase Storage signed URLs for the public share link:** Signed URLs don't support PIN gates, their expiry cannot be queried from a DB, and they can't store a report snapshot. Use a `report_tokens` database table.
- **Generating a real PDF on the server with @react-pdf/renderer:** This was rejected in Phase 06 due to React 19 App Router crashes. Keep using `react-to-print` + `window.print()` for the "Save as PDF" flow.
- **Using `createClient()` (auth-required) in the public share route:** `createClient()` uses the cookie-based session. The public share route has no session. Use `createAdminClient()` (service role, server-only) for the token lookup — the same pattern already used in the dashboard admin role check.
- **Storing the full report snapshot as a Supabase Storage file (JSON):** Database JSONB is simpler, indexed, and doesn't require a storage bucket or signed URL for retrieval.
- **Running the study plan generation as a Claude API call:** The rule is simple and deterministic. A Claude call adds $0.003/report + latency. Use the rule-based generator; leave AI for cases where it adds clear value.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Level-over-time line chart | Custom SVG path drawing | recharts `LineChart` + `ResponsiveContainer` | Axis scaling, tooltip, responsive resize, accessibility are 300+ lines of edge cases |
| Copy-to-clipboard | `document.execCommand('copy')` | `navigator.clipboard.writeText()` | execCommand is deprecated; Clipboard API is supported in all modern browsers and handles async correctly |
| PIN hashing | Custom hash | `crypto.subtle.digest('SHA-256', ...)` (Web Crypto API) | Built into browser and Node.js — no library needed |
| WhatsApp deep link | WhatsApp Business API | `wa.me/?text=` URL | The API requires approval and costs money; the URL scheme works for share-with-anyone flows |
| Bilingual report text | Conditional string literals | `next-intl getTranslations()` | Already in use project-wide; avoids duplicated locale-switching logic |
| Report token generation | `Math.random()` | `gen_random_uuid()` in PostgreSQL default | Cryptographically secure; already used for all other IDs in this project |

**Key insight:** Every custom solution in this domain (PDF, sharing, charts) has a battle-tested equivalent already in the stack or available as a single small package. The shareable link system looks complex but reduces to: insert a row, read a row.

---

## Common Pitfalls

### Pitfall 1: Recharts LineChart Must Be "use client"
**What goes wrong:** Importing Recharts in a Server Component causes a build error: `You're importing a component that needs useState. It only works in a Client Component.`
**Why it happens:** Recharts uses React hooks internally. Server Components cannot use hooks.
**How to avoid:** Every Recharts component must be in a file with `'use client'` at the top. Pass data from Server Component as props — do not fetch inside the client chart component.
**Warning signs:** Build error mentioning `useState` or `useRef` in a Server Component context during import of recharts.

### Pitfall 2: Empty Progress Events = Empty Line Chart
**What goes wrong:** A child who has only completed the assessment (one `assessment_completed` event) has a flat line chart with a single dot — or no chart at all if the query returns zero rows.
**Why it happens:** The `progress_events` table only gets `level_up`/`level_down` events when the difficulty adjuster fires. A child who always stays at level 1 never generates these events.
**How to avoid:** Always seed the chart with the `assessment_completed` event (start point) + `last_session_at` as a "now" point using `current_level`. Guard the chart render: if `levelHistory.length < 2`, show a "Te weinig data voor grafiek" placeholder instead of an empty chart.
**Warning signs:** Blank chart area or single isolated dot on the line chart.

### Pitfall 3: Public Share Route and "use client" createClient
**What goes wrong:** The public share route uses `createClient()` (cookie-based), but there is no session cookie. The Supabase query returns null due to RLS — the token row cannot be read.
**Why it happens:** `createClient()` is tied to the authenticated user's session. No session = anon access = RLS blocks the SELECT (there is no public SELECT policy on `report_tokens`).
**How to avoid:** Use `createAdminClient()` (service role) in the public route's server-side token lookup. This is already the pattern used in the dashboard for the admin role check. The service key is never sent to the browser.
**Warning signs:** Token lookup returns `null` even though the token exists in the database; RLS debug logs in Supabase showing blocked SELECT.

### Pitfall 4: Effective Time Inflation from Abandoned Sessions
**What goes wrong:** The "effectieve leertijd" stat shows 12 hours for a child who had a session left open overnight.
**Why it happens:** `ended_at` is only set when the session is explicitly ended (or when a new session starts for the same child+subject). Browser closes, WiFi drops, or user navigates away = session stays "open" with no `ended_at`.
**How to avoid:** Filter: only include sessions where `ended_at IS NOT NULL` AND cap each session at 45 minutes. See the `calcEffectiveMinutes()` function above.
**Warning signs:** Unrealistically large effective time numbers in the report; spot-check `tutoring_sessions` in Supabase and look for sessions where `ended_at - started_at > 2 hours`.

### Pitfall 5: Report Snapshot Staleness
**What goes wrong:** The shared report link shows outdated data because the snapshot was taken at token creation time, while the child has had 10 more sessions since.
**Why it happens:** The snapshot is frozen at generation time — by design. But parents and recipients may expect live data.
**How to avoid:** This is a feature, not a bug — freeze-at-generation is intentional (the report represents a point in time). Make this explicit in the UI: show "Rapport gegenereerd op [date]" prominently. Provide a "Nieuw rapport genereren" button on the authenticated page. The new token replaces the old one.
**Warning signs:** Parents asking "why is the level wrong?" — add the generation date prominently.

### Pitfall 6: PIN Stored in Plaintext
**What goes wrong:** The 4-digit PIN is stored as plaintext in `pin_hash` column.
**Why it happens:** Simple implementation shortcut.
**How to avoid:** Always hash the PIN before storing. Use the Web Crypto API: `crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin))`. The column is called `pin_hash` by convention — if plaintext is ever found there, it is a security defect.
**Warning signs:** `pin_hash` column in DB contains only numeric strings like "1234" or "0000".

### Pitfall 7: WhatsApp Link Breaks on Desktop
**What goes wrong:** The `wa.me` link opens a broken web page or nothing happens on desktop browsers without WhatsApp installed.
**Why it happens:** `wa.me` is a mobile-first deep link. On desktop, it redirects to `web.whatsapp.com`, which works but requires WhatsApp Web to be connected.
**How to avoid:** This is acceptable behavior — the feature requirement is a WhatsApp share button. Add a separate "Link kopiëren" button as the primary sharing method; the WhatsApp button is secondary. Both are in the `ShareLinkPanel` component.
**Warning signs:** None needed — this is expected behavior, document it in the UI ("Werkt het beste op je telefoon").

---

## Code Examples

Verified patterns from codebase and official sources:

### Supabase Admin Client (already exists in project)
```typescript
// Source: aruba-leren/src/lib/auth/admin.ts — already used in dashboard/page.tsx
// Usage in public share route:
import { createAdminClient } from '@/lib/auth/admin';

const adminClient = createAdminClient();
const { data: tokenRow } = await adminClient
  .from('report_tokens')
  .select('*')
  .eq('token', token)
  .gt('expires_at', new Date().toISOString())
  .single();
```

### next-intl getTranslations in Server Component
```typescript
// Source: next-intl official docs — https://next-intl.dev/docs/getting-started/app-router
// Already used in dashboard pages via getTranslations
import { getTranslations } from 'next-intl/server';

// In an async Server Component:
const t = await getTranslations({ locale, namespace: 'rapport' });
// Returns typed translator: t('title', { name: 'Koko' }) → "Voortgangsrapport van Koko"
```

### react-to-print v3 for Save as PDF (already installed)
```typescript
// Source: Phase 06 RESEARCH.md — react-to-print 3.2.0, React 19 compatible
// v3 API: contentRef replaces old content callback
'use client';
import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';

export function RapportPrintWrapper({ children }: { children: React.ReactNode }) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Rapport_${new Date().toISOString().slice(0,10)}`,
    pageStyle: `
      @media print {
        body { font-family: Arial, sans-serif; font-size: 12pt; }
        .no-print { display: none !important; }
        @page { margin: 2cm; size: A4; }
      }
    `,
  });

  return (
    <>
      <button onClick={() => handlePrint()} className="no-print bg-sky-600 text-white px-4 py-2 rounded-lg">
        Opslaan als PDF
      </button>
      <div ref={printRef}>{children}</div>
    </>
  );
}
```

### Clipboard Copy (no library needed)
```typescript
// Source: MDN Web Docs — navigator.clipboard.writeText
// Works in all modern browsers; HTTPS required (production has HTTPS via Vercel)
async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}
```

### Web Crypto PIN Hashing (no library needed)
```typescript
// Source: MDN Web Docs — SubtleCrypto.digest
// Available in browser (client-side) and Node.js (server-side, Next.js API route)
async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Server-side PDF with @react-pdf/renderer | react-to-print + browser print dialog | No React 19 crashes; "Save as PDF" works natively in all browsers |
| Recharts v2 (shadcn/ui default until Jan 2025) | Recharts v3.7.0 (Jan 2025) | Improved hooks API (`useIsTooltipActive`); same composable component API — no breaking changes for LineChart usage |
| WhatsApp Business API | wa.me URL scheme | Free, no approval, works instantly for consumer sharing |
| Client-side data fetching for reports | Server Component data fetching + props | Faster initial render; no loading spinners; RLS handled server-side |

**Deprecated/outdated:**
- `@react-pdf/renderer` server-side rendering: broken in Next.js App Router + React 19. Do not use.
- Recharts v2 `<ResponsiveContainer>` with `width="99%"` workaround: not needed in v3.

---

## Database Schema Changes

### Migration 012 — Rapport Tables

```sql
-- ============================================
-- Migration 012: Rapport Tables
-- Phase 11: Rapportages & PDF-Deling
-- ============================================

-- 1. Report tokens — for shareable links
CREATE TABLE IF NOT EXISTS report_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id    UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  pin_hash    TEXT,                     -- SHA-256 hex of 4-digit PIN (NULL = no PIN)
  report_data JSONB NOT NULL,           -- Snapshot of RapportData at generation time
  locale      TEXT NOT NULL DEFAULT 'nl' CHECK (locale IN ('nl', 'pap', 'es', 'en')),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_tokens_token
  ON report_tokens(token) WHERE expires_at > NOW();

CREATE INDEX IF NOT EXISTS idx_report_tokens_child
  ON report_tokens(child_id);

ALTER TABLE report_tokens ENABLE ROW LEVEL SECURITY;

-- Parents can INSERT tokens for their own children
CREATE POLICY "Parents can create report tokens"
  ON report_tokens FOR INSERT
  WITH CHECK (
    child_id IN (
      SELECT c.id FROM children c
      JOIN profiles p ON c.parent_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Parents can DELETE their own tokens
CREATE POLICY "Parents can delete report tokens"
  ON report_tokens FOR DELETE
  USING (
    child_id IN (
      SELECT c.id FROM children c
      JOIN profiles p ON c.parent_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Parents can SELECT their own tokens (to show "link active since")
CREATE POLICY "Parents can view their report tokens"
  ON report_tokens FOR SELECT
  USING (
    child_id IN (
      SELECT c.id FROM children c
      JOIN profiles p ON c.parent_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- 2. Study plans — parent-editable weekly plan per child
CREATE TABLE IF NOT EXISTS study_plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id    UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  plan_data   JSONB NOT NULL DEFAULT '[]'::jsonb,  -- Array of StudyPlanEntry
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_plans_child
  ON study_plans(child_id, created_at DESC);

ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents manage their children's study plans"
  ON study_plans FOR ALL
  USING (
    child_id IN (
      SELECT c.id FROM children c
      JOIN profiles p ON c.parent_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );
```

---

## Open Questions

1. **Papiamento report translations completeness**
   - What we know: `pap.json` exists and has ~40 keys covering common UI text. The `rapport` namespace does not yet exist.
   - What's unclear: Does the user (bijlesmeneer) have access to a Papiamento translator for the report-specific strings, or should Papiamento strings be approximated from existing pap.json patterns?
   - Recommendation: Plan 11-04 should include a task to add all `rapport.*` keys to both `nl.json` and `pap.json`. Flag the Papiamento strings as needing native-speaker review. Provide nl.json as the source and generate approximate pap translations using Claude — the user should review.

2. **Progress events for foutanalyse (error analysis)**
   - What we know: `progress_events` tracks `level_up`, `level_down`, `stuck_flagged`. The `child_subject_progress` table has `total_incorrect` and `stuck_concept_count` per subject, but no breakdown by error *category* (e.g., "arithmetic errors" vs "word problems").
   - What's unclear: RAPPORT-01 requires "foutanalyse per categorie". The current schema does not store error categories — only error counts.
   - Recommendation: For Phase 11, implement a simplified foutanalyse: use `stuck_concept_count` and `total_incorrect / (total_correct + total_incorrect)` ratio as the "error rate" per subject. Per-category analysis (which specific concept types) would require new tracking in the chat route's `onFinish` callback — scope that to a future phase. Document this limitation in the plan.

3. **Report tokens: one per child or one per child per subject?**
   - What we know: The requirement says "unieke deelbare link" — one link for the full report (all subjects). The `report_tokens` table as designed stores the full `RapportData` snapshot.
   - What's unclear: Could a parent want to share only the rekenen section? Not mentioned in requirements.
   - Recommendation: One token = full report. Keep it simple. The `report_data` JSONB can contain all subjects; the `RapportView` renders all of them.

4. **Maximum Supabase createSignedUrl expiresIn value**
   - What we know: The Supabase docs confirm `expiresIn` is in seconds. The 30-day requirement = 2,592,000 seconds.
   - What's unclear: Whether Supabase Storage enforces a max on `expiresIn`. This is moot since we are NOT using signed URLs — we use the `report_tokens` database table. No Supabase Storage involved.
   - Recommendation: Non-issue. Confirmed the database token approach avoids this entirely.

---

## Sources

### Primary (HIGH confidence)
- Codebase (read directly):
  - `aruba-leren/package.json` — confirmed installed packages (react-to-print 3.2.0, next-intl 4.8.2, no recharts)
  - `supabase/migrations/006_tutoring_tables.sql` — tutoring_sessions schema (started_at, ended_at)
  - `supabase/migrations/007_assessment_progress_tables.sql` — child_subject_progress + progress_events schema
  - `src/types/progress.ts` — ChildSubjectProgress and ProgressEvent TypeScript interfaces
  - `src/lib/tutoring/progress-tracker.ts` — confirmed stuck_concept_count tracking pattern
  - `src/components/progress/ProgressSummaryCard.tsx`, `SubjectProgress.tsx` — existing progress display components (Tailwind, no Recharts)
  - `src/app/[locale]/dashboard/kind/[childId]/page.tsx` — confirmed existing data-fetching pattern for child progress
  - `src/lib/supabase/server.ts` — confirmed createClient() cookie-based pattern
  - `src/messages/nl.json`, `src/messages/pap.json` — confirmed both locale files exist; `rapport` namespace does not yet exist
  - `src/app/[locale]/dashboard/page.tsx` — confirmed createAdminClient() usage pattern for public/admin reads
- Phase 06 RESEARCH.md — confirmed react-to-print 3.2.0 React 19 compatible, @react-pdf/renderer rejected

### Secondary (MEDIUM confidence)
- [recharts GitHub releases](https://github.com/recharts/recharts/releases) — v3.7.0 is latest stable (Jan 21, 2025)
- [recharts package.json peer deps](https://github.com/recharts/recharts/blob/master/package.json) — React 19 supported (`"react": "^16.0.0 || ^17.0.0 || ^18.0.0 || ^19.0.0"`)
- [shadcn/ui chart docs](https://ui.shadcn.com/docs/components/chart) — confirms Recharts foundation; `npx shadcn add chart` installs recharts; shows ChartContainer + ChartConfig pattern
- [next-intl docs](https://next-intl.dev/docs/getting-started/app-router) — `getTranslations({ locale, namespace })` is the Server Component API
- [WhatsApp wa.me URL scheme](https://faq.whatsapp.com/5246945405) — `wa.me/?text=` for share-with-anyone (no phone number required)

### Tertiary (LOW confidence — verify before implementation)
- shadcn/ui chart documentation notes: "We're working on upgrading to Recharts v3" — as of the doc fetch, shadcn/ui's `npx shadcn add chart` may still install Recharts v2. Install `recharts@^3.7.0` directly via npm to ensure v3.
- Supabase `createSignedUrl` max expiresIn: not documented; moot since this feature does not use Storage signed URLs.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified from package.json; recharts v3 peer deps confirmed from GitHub
- Data model: HIGH — read directly from migration SQL files and TypeScript types
- Architecture patterns: HIGH — mirrors existing patterns in the codebase exactly
- Shareable link approach: HIGH — report_tokens table pattern mirrors existing homework_uploads table
- Bilingual i18n: HIGH — next-intl already installed and in use; getTranslations API confirmed
- Foutanalyse per categorie: MEDIUM — current schema supports simplified version only; full category analysis is out of scope
- Papiamento translations: MEDIUM — structure is clear, actual Papiamento text for new rapport keys needs native-speaker review

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (30 days — stable libraries; recharts v3 API is stable since v3.0)
