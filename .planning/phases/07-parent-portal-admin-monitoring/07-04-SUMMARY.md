---
plan: 07-04
phase: 07-parent-portal-admin-monitoring
status: complete
completed_at: 2026-02-24
duration_minutes: 10
tasks_completed: 3
commits:
  - "43c67f8 feat(07-04): add weekly progress email Edge Function (Resend + Deno)"
  - "b3694b9 feat(07-04): add pg_cron migration for weekly email schedule (migration 010)"
---

# 07-04 Summary: Weekly Progress Email (Edge Function + Resend + pg_cron)

## One-liner
Deno Edge Function generates and sends weekly HTML progress reports to parents via Resend, scheduled by pg_cron every Sunday 7:00 AM Aruba time.

## What was built

### Task 1: Supabase Edge Function (`weekly-progress-report/index.ts`)
- Self-contained Deno code — no imports from `src/`, no Node.js modules
- Fetches all families with children + `child_subject_progress` via nested Supabase select
- Subscription check: queries `subscriptions` by `profile.id` (not `user_id`) for active, non-expired rows
- Parent email retrieval via `supabase.auth.admin.getUserById(profile.user_id)`
- `generateReportHTML()`: per-child sections with subject levels (1-5), session counts, ⚠️ stuck warnings
- Inline CSS only (email clients strip external stylesheets)
- Resend REST API: `fetch('https://api.resend.com/emails', ...)` with Bearer auth
- 100ms delay between sends to respect rate limits
- Per-family try/catch: one failure doesn't abort the batch
- Returns `{ sent, skipped, errors, total }` JSON response

### Task 2: pg_cron Migration (`010_weekly_email_cron.sql`)
- `cron.schedule('weekly-progress-report', '0 11 * * 0', ...)` — Sunday 11:00 UTC = 7:00 AM Aruba
- Uses `net.http_post` to trigger Edge Function via HTTP
- Full prerequisite documentation in SQL comments (pg_cron, pg_net, deploy, secrets)

### Task 3: Human Checkpoint — Approved ✓
Human reviewed Edge Function code and confirmed setup steps are understood.

## Key files
- `aruba-leren/supabase/functions/weekly-progress-report/index.ts` (new, 203 lines)
- `aruba-leren/supabase/migrations/010_weekly_email_cron.sql` (new, 48 lines)

## Setup required (production activation)
1. Enable pg_cron + pg_net in Supabase Dashboard → Database → Extensions
2. Create Resend account + API key at resend.com
3. `supabase secrets set RESEND_API_KEY=re_...`
4. `supabase functions deploy weekly-progress-report`
5. Run migration 010 SQL in Supabase SQL Editor

## Issues
- None
