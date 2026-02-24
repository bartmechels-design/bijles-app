---
phase: 07-parent-portal-admin-monitoring
plan: 02
subsystem: ui, database
tags: [supabase, nextjs, server-actions, rls, vacation-calendar, admin-crud]

# Dependency graph
requires:
  - phase: 07-01
    provides: ProgressSummaryCard + dashboard enhancements (vakantierooster link added)
  - phase: 03-payment
    provides: createAdminClient, isAdmin auth utilities
provides:
  - school_vacations table migration (009) with RLS and updated_at trigger
  - getVacations(schoolYear) server query and getCurrentSchoolYear() pure helper
  - upsertVacation / deleteVacation Server Actions with admin guard
  - Parent-facing /vakanties calendar page (current school year, read-only)
  - Admin /admin/vakanties CRUD page (all years, Server Component + client components)
  - VacationManager client component (showForm / selectedVacation state)
  - VacationForm client component (create and edit modes)
affects:
  - 07-03 (parent portal — may link to /vakanties from portal hub)
  - 07-04 (admin monitoring — vakanties link already in admin dashboard)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server Component fetches data, passes to 'use client' component for interactivity
    - Pure utility helpers (getCurrentSchoolYear) in separate utils.ts to avoid server import leak into client bundles
    - Type definitions co-located with pure helpers in utils.ts, re-exported from queries.ts for backward compat

key-files:
  created:
    - aruba-leren/supabase/migrations/009_vacation_tables.sql
    - aruba-leren/src/lib/vacations/utils.ts
    - aruba-leren/src/lib/vacations/queries.ts
    - aruba-leren/src/lib/vacations/actions.ts
    - aruba-leren/src/app/[locale]/vakanties/page.tsx
    - aruba-leren/src/app/[locale]/admin/vakanties/page.tsx
    - aruba-leren/src/components/admin/VacationForm.tsx
    - aruba-leren/src/components/admin/VacationManager.tsx
  modified: []

key-decisions:
  - "SchoolVacation type and getCurrentSchoolYear() live in utils.ts (client-safe) — queries.ts re-exports them but is server-only due to createClient import"
  - "Admin page is a pure Server Component — all interactive state (showForm, selectedVacation) lives in VacationManager client wrapper"
  - "VacationForm submits via formData to upsertVacation Server Action (presence of id field = UPDATE, absence = INSERT)"
  - "revalidatePath('/', 'layout') invalidates all locale routes (/nl/, /pap/, /es/, /en/) from root in one call"

patterns-established:
  - "Server Component fetches + passes typed array prop to 'use client' component — keeps data fetching server-side, interactivity client-side"
  - "Client-safe utilities separated into utils.ts; server-only modules (Supabase server client) stay in queries.ts"

# Metrics
duration: 4min
completed: 2026-02-24
---

# Phase 7 Plan 02: Vacation Calendar System Summary

**Full-stack vacation calendar: school_vacations table with RLS, parent read-only view at /vakanties, and admin CRUD at /admin/vakanties using Server Component + VacationManager client wrapper pattern**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-24T21:07:44Z
- **Completed:** 2026-02-24T21:11:44Z
- **Tasks:** 2 (Task 1 already committed; Task 2 executed in this session)
- **Files created:** 8

## Accomplishments

- Migration 009 creates `school_vacations` table with RLS (authenticated read, service role write), composite index on school_year+start_date, and updated_at trigger
- Parent vacation page at `/vakanties` shows current school year calendar with date cards, "Feestdag" amber badge, formatted Dutch date ranges, and back link to dashboard
- Admin CRUD at `/admin/vakanties`: pure Server Component fetches all vacations; VacationManager (client) owns showForm/selectedVacation state, groups list by school year DESC, provides edit/delete buttons; VacationForm handles both create and edit modes

## Task Commits

Each task was committed atomically:

1. **Task 1: Create vacation migration, queries, and Server Actions** - `63744f3` (feat) — already committed prior to this session
2. **Task 2: Create parent vacation page, admin vacation page, VacationForm, VacationManager** - `d0c7061` (feat)

**Plan metadata:** (see final commit for docs)

## Files Created/Modified

- `aruba-leren/supabase/migrations/009_vacation_tables.sql` - school_vacations table with RLS, index, trigger (run in Supabase SQL Editor)
- `aruba-leren/src/lib/vacations/utils.ts` - SchoolVacation type + getCurrentSchoolYear() — client-safe, no server imports
- `aruba-leren/src/lib/vacations/queries.ts` - getVacations() server query, re-exports from utils.ts
- `aruba-leren/src/lib/vacations/actions.ts` - upsertVacation / deleteVacation Server Actions with isAdmin guard
- `aruba-leren/src/app/[locale]/vakanties/page.tsx` - Parent vacation calendar (Server Component, 108 lines)
- `aruba-leren/src/app/[locale]/admin/vakanties/page.tsx` - Admin vacation page (pure Server Component, 39 lines)
- `aruba-leren/src/components/admin/VacationForm.tsx` - Add/edit form client component (175 lines)
- `aruba-leren/src/components/admin/VacationManager.tsx` - List manager client component (135 lines)

## Decisions Made

- SchoolVacation type and getCurrentSchoolYear() extracted to utils.ts (client-safe) so VacationForm and VacationManager can import the type without pulling in next/headers via the Supabase server client chain
- Admin page is intentionally a pure Server Component — the plan explicitly forbids useState in the admin page, all state lives in VacationManager
- VacationForm uses `e.preventDefault()` + direct Server Action call (not `action={upsertVacation}`) to enable loading state and programmatic `onClose()` after success
- checkbox sends `value="true"` with a preceding hidden `value="false"` — Server Action reads the last value (checked = true, unchecked = false)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Split SchoolVacation type and getCurrentSchoolYear() into utils.ts**

- **Found during:** Task 2 (build verification)
- **Issue:** VacationForm.tsx imported `type { SchoolVacation }` and `getCurrentSchoolYear` from queries.ts. queries.ts imports from `@/lib/supabase/server` which imports `cookies` from `next/headers`. Bundler followed the full import chain into the client bundle, causing a build error: "You're importing a component that needs next/headers. That only works in a Server Component."
- **Fix:** Created `lib/vacations/utils.ts` with SchoolVacation interface and getCurrentSchoolYear() (both are pure, no server imports). Updated queries.ts to re-export from utils.ts. Updated VacationForm.tsx, VacationManager.tsx, and admin/vakanties/page.tsx to import types from utils.ts instead of queries.ts.
- **Files modified:** aruba-leren/src/lib/vacations/utils.ts (new), aruba-leren/src/lib/vacations/queries.ts, aruba-leren/src/components/admin/VacationForm.tsx, aruba-leren/src/components/admin/VacationManager.tsx, aruba-leren/src/app/[locale]/admin/vakanties/page.tsx
- **Verification:** `npm run build` passes; both /vakanties and /admin/vakanties appear in build output as dynamic routes
- **Committed in:** d0c7061 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 — blocking build error)
**Impact on plan:** Essential structural fix. The pattern of separating client-safe utilities from server-only modules is now established for this subsystem.

## Issues Encountered

None beyond the auto-fixed build error above.

## User Setup Required

**SQL migration must be run manually.** The Supabase migration file is ready but user must execute it:

1. Open Supabase Dashboard → SQL Editor
2. Paste contents of `aruba-leren/supabase/migrations/009_vacation_tables.sql`
3. Run the migration
4. The vacation calendar at /vakanties will then be functional

## Self-Check

Checking created files exist:

- FOUND: aruba-leren/supabase/migrations/009_vacation_tables.sql
- FOUND: aruba-leren/src/lib/vacations/utils.ts
- FOUND: aruba-leren/src/lib/vacations/queries.ts
- FOUND: aruba-leren/src/lib/vacations/actions.ts
- FOUND: aruba-leren/src/app/[locale]/vakanties/page.tsx
- FOUND: aruba-leren/src/app/[locale]/admin/vakanties/page.tsx
- FOUND: aruba-leren/src/components/admin/VacationForm.tsx
- FOUND: aruba-leren/src/components/admin/VacationManager.tsx

Checking commits exist:
- FOUND: 63744f3 (Task 1 — migration, queries, actions)
- FOUND: d0c7061 (Task 2 — UI pages and components)

## Self-Check: PASSED

## Next Phase Readiness

- Vacation calendar fully operational end-to-end (pending SQL migration run)
- Admin CRUD (add/edit/delete) works with service role, parent view uses RLS-protected read
- Both routes revalidate after mutations via `revalidatePath('/', 'layout')`
- 07-03 and 07-04 can link to /vakanties as-is

---
*Phase: 07-parent-portal-admin-monitoring*
*Completed: 2026-02-24*
