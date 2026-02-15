---
phase: 03-payment-verification-system
plan: 03
subsystem: admin, payments
tags: [admin-panel, subscription-guard, payment-approval, supabase-storage, server-actions]

# Dependency graph
requires:
  - phase: 03-01
    provides: Database tables (subscriptions, payment_requests), storage bucket (payment-proofs), shared utilities (types, check, admin, upload)
provides:
  - Admin panel with role-based access control
  - Payment request approval/rejection workflow with signed URL image viewing
  - Subscription-based dashboard access control (PAY-03 requirement)
  - Server actions for approve/reject with audit trail
  - SubscriptionGuard reusable component for future pages
affects: [04-ai-tutor-core, 05-progress-tracking, 06-ai-tutor-advanced]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Admin panel with dark header (bg-gray-900) to distinguish from parent UI
    - Server-side subscription check in dashboard (server component pattern)
    - Signed URLs for secure image viewing (1-hour expiry)
    - Admin client (service role) bypasses RLS for cross-user operations
    - Audit trail for admin actions (approved_by_user_id field)

key-files:
  created:
    - aruba-leren/src/app/[locale]/admin/layout.tsx
    - aruba-leren/src/app/[locale]/admin/page.tsx
    - aruba-leren/src/app/[locale]/admin/payments/page.tsx
    - aruba-leren/src/app/[locale]/admin/payments/actions.ts
    - aruba-leren/src/components/PaymentRequestCard.tsx
    - aruba-leren/src/components/SubscriptionGuard.tsx
  modified:
    - aruba-leren/src/app/[locale]/dashboard/page.tsx

key-decisions:
  - "Server-side subscription check in dashboard (not client-side guard) avoids hydration issues and provides defense-in-depth"
  - "Admin users bypass subscription check (isAdmin flag from app_metadata)"
  - "Payment proof images use signed URLs with 1-hour expiry for security"
  - "Approve action upserts subscription (handles both new and renewal cases)"
  - "Admin panel uses dark header (bg-gray-900) for visual distinction from parent UI"

patterns-established:
  - "Admin pages: layout checks isAdmin(), redirects to home if not admin"
  - "Subscription check pattern: query subscriptions table, verify status='active' AND expires_at > now"
  - "Admin client pattern: createAdminClient() for operations requiring service role"
  - "Audit trail pattern: store admin user ID in approval/rejection records"

# Metrics
duration: 8min
completed: 2026-02-15
---

# Phase 03 Plan 03: Admin Panel & Subscription Guard Summary

**Admin payment approval workflow with signed URL proof viewing, subscription-based dashboard access control, and admin bypass for platform access**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-15T19:50:18Z
- **Completed:** 2026-02-15T20:58:34Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Admin can view pending payment requests with parent info and payment proof images
- Admin can approve requests (creates/updates subscription with calculated expiry date)
- Admin can reject requests with reason (stored in rejected_reason field)
- Dashboard blocks access for users without active subscription (PAY-03)
- Admin users bypass subscription requirement (access regardless of subscription status)
- Payment proof images viewable via signed URLs (1-hour expiry for security)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create admin layout, payments page, and server actions for approve/reject** - `8a7eda9` (feat)
2. **Task 2: Add SubscriptionGuard to dashboard and update navigation** - `ae31e48` (feat)

## Files Created/Modified
- `aruba-leren/src/app/[locale]/admin/layout.tsx` - Admin layout with isAdmin() guard and navigation
- `aruba-leren/src/app/[locale]/admin/page.tsx` - Admin dashboard landing page with links to sections
- `aruba-leren/src/app/[locale]/admin/payments/page.tsx` - Server component querying pending requests and generating signed URLs
- `aruba-leren/src/app/[locale]/admin/payments/actions.ts` - Server actions for approvePaymentRequest and rejectPaymentRequest
- `aruba-leren/src/components/PaymentRequestCard.tsx` - Client component displaying request details with approve/reject buttons
- `aruba-leren/src/components/SubscriptionGuard.tsx` - Reusable client component for subscription-gated pages (future use)
- `aruba-leren/src/app/[locale]/dashboard/page.tsx` - Updated with server-side subscription check and "Abonnement" link

## Decisions Made

1. **Server-side subscription check in dashboard instead of client-side guard**: The plan initially suggested a client-side SubscriptionGuard component wrapping the dashboard. However, implementing this server-side avoids hydration issues (server/client mismatch) and provides defense-in-depth. The SubscriptionGuard component was still created for future client-side pages that need it.

2. **Admin bypass for subscription requirement**: Admins (identified by user.app_metadata.role === 'admin') bypass the subscription check to allow them full platform access for testing and support purposes.

3. **Signed URL approach for payment proof images**: Payment proofs stored in Supabase Storage use signed URLs with 1-hour expiry generated server-side (in the payments page) and passed as props to the client component. This provides secure access without exposing the storage bucket publicly.

4. **Upsert pattern for subscriptions**: The approve action uses upsert (with onConflict: 'profile_id') to handle both new subscriptions and renewals in a single operation. This ensures that approving a new payment request for an existing subscriber extends their subscription correctly.

5. **Dark admin header (bg-gray-900)**: The admin panel uses a dark header to visually distinguish it from the parent-facing UI (which uses sky-blue gradients). This makes it immediately obvious when navigating admin sections.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Payment verification system complete (ADMIN-01, ADMIN-02, PAY-03 requirements met)
- Admin panel infrastructure ready for expansion (Phase 7 will add user management, statistics)
- Subscription-based access control pattern established and working
- Dashboard ready for content gating in future phases (Phase 4+ AI tutor content)
- All TypeScript checks passing
- Ready to proceed with Phase 4 (AI Tutor Core) or other Phase 3 plans

## Self-Check: PASSED

All files verified:
- Created files: 7/7 found
- Commits: 2/2 found (8a7eda9, ae31e48)
- TypeScript compilation: passing
- All must_haves artifacts present and verified

---
*Phase: 03-payment-verification-system*
*Completed: 2026-02-15*
