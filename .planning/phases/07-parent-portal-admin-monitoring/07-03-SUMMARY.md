---
plan: 07-03
phase: 07-parent-portal-admin-monitoring
status: complete
completed_at: 2026-02-24
duration_minutes: 8
tasks_completed: 2
commits:
  - "4dea819 feat(07-03): add admin families overview with stuck-child alerts"
  - "37daf5c feat(07-03): replace placeholder admin cards with active Gebruikers and Vakanties links"
---

# 07-03 Summary: Admin Families Overview + Stuck Alerts

## One-liner
Admin can now monitor all families and receive prominent stuck-child alerts, with active navigation links to all admin sections.

## What was built

### Task 1: Admin Families Overview (`/admin/gebruikers`)
- Server Component using `createAdminClient()` for cross-family RLS bypass
- **Stuck alerts (ADMIN-04)**: Red alert box at top listing all children with `is_stuck=true`, showing child name, family, subject, and stuck-since date
- **Green success box** when no children are stuck
- **Summary stats row**: total families, total children, active subscriptions count
- **Family cards** with subscription status badge (Actief/Verlopen/Geen), member-since date, child pills showing assessment progress count and stuck indicator

### Task 2: Admin Landing Page (`/admin`)
- Replaced "Gebruikers" placeholder (opacity-50, gray) with active Link card → `/admin/gebruikers` (sky-500 border)
- Replaced "Statistieken" placeholder with "Vakanties" active Link card → `/admin/vakanties` (purple-500 border)
- All 4 admin cards now active: Betalingen, Leerstof, Gebruikers, Vakanties

## Key files
- `aruba-leren/src/app/[locale]/admin/gebruikers/page.tsx` (new, 234 lines)
- `aruba-leren/src/app/[locale]/admin/page.tsx` (updated)

## Verification
- `npx tsc --noEmit` — no type errors
- `npm run build` — passes, `/[locale]/admin/gebruikers` and `/[locale]/admin/vakanties` both in build output
- Stuck alerts derived from `is_stuck = true` in child_subject_progress
- All admin data via `createAdminClient()` (bypasses RLS)

## Issues
- None
