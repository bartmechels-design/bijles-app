---
phase: 03-payment-verification-system
plan: 02
subsystem: payment-request-flow
tags:
  - parent-interface
  - payment-submission
  - file-upload
  - subscription-management
dependency_graph:
  requires:
    - 03-01 (database schema, storage bucket, shared utilities)
    - 02-03 (auth patterns, profile lookup)
  provides:
    - Payment request submission flow
    - File upload with validation
    - Subscription status viewing
  affects:
    - Parent user journey
    - Payment verification workflow (03-03 admin panel)
tech_stack:
  added:
    - next-intl client hooks (useTranslations)
    - FormData handling in server actions
    - Supabase Storage upload
    - URL.createObjectURL for image previews
  patterns:
    - Two-step form (period selection → payment method)
    - Client component with server action integration
    - Magic bytes file validation (server-side security)
    - Client-side validation (UX enhancement)
key_files:
  created:
    - aruba-leren/src/app/[locale]/subscription/request/actions.ts
    - aruba-leren/src/app/[locale]/subscription/request/page.tsx
    - aruba-leren/src/app/[locale]/subscription/status/page.tsx
    - aruba-leren/src/components/FileUpload.tsx
    - aruba-leren/src/components/PaymentRequestForm.tsx
  modified:
    - aruba-leren/src/messages/nl.json (added subscription translations)
    - aruba-leren/src/messages/pap.json (added subscription translations)
    - aruba-leren/src/messages/es.json (added subscription translations)
decisions:
  - Two-step form UX (period first, then method) reduces cognitive load
  - File upload validation happens on both client (UX) and server (security)
  - Cash payments require comment field (describes when/where to pay)
  - Bank transfers have optional comment field (additional context)
  - Status page shows both current subscription and full request history
  - Locale hardcoded to 'nl' for success redirect (will be dynamic in future)
metrics:
  duration_minutes: 7
  tasks_completed: 2
  files_created: 5
  files_modified: 3
  commits: 2
  completed_date: 2026-02-15
---

# Phase 03 Plan 02: Parent Payment Request Flow Summary

Parent-facing payment submission flow with period selection, file upload validation, and subscription status viewing.

## What Was Built

### Server Actions (Task 1)
**File:** `aruba-leren/src/app/[locale]/subscription/request/actions.ts`

Two server actions for payment request submission:

1. **uploadPaymentProof**: Bank transfer flow
   - Validates file with magic bytes (security via file-type package)
   - Uploads to Supabase Storage bucket 'payment-proofs'
   - Creates payment_request record with file path
   - Path pattern: `{user_id}/{timestamp}-{filename}`

2. **requestCashPayment**: Cash payment flow
   - Validates required comment field (describes when/where to pay)
   - Creates payment_request record with null file path
   - Comment field is mandatory for cash (guides parent on what to provide)

Both actions:
- Use profile_id lookup via `user_id` (learned from Phase 2)
- Return `{ success?: boolean; error?: string }` pattern
- Revalidate subscription status page after submission
- Create records with `status: 'pending'` for admin approval

### UI Components (Task 2)

**FileUpload.tsx**: Client component for validated file selection
- Client-side validation for UX (5MB limit, JPEG/PNG/WebP only)
- Image preview using URL.createObjectURL
- Shows filename and thumbnail after selection
- Displays user-friendly error messages from translations
- Sky-blue theme consistent with dashboard

**PaymentRequestForm.tsx**: Two-step form flow
- Step 1: Period selection (4 card-style buttons)
  - per_session, per_week, per_month, per_school_year
  - Translated labels via next-intl
- Step 2: Payment method toggle + details
  - Bank transfer: FileUpload + optional comment
  - Cash: Required comment textarea
- Loading state during submission (disabled button, spinner)
- Success state with redirect link to status page
- Error handling with translated messages

**Request Page** (`subscription/request/page.tsx`):
- Server component with auth check
- Gradient sky-blue header
- Renders PaymentRequestForm
- Redirects to login if not authenticated

**Status Page** (`subscription/status/page.tsx`):
- Shows current subscription (if active)
  - Status badge (green=active, gray=expired)
  - Period and expiry date
- Shows payment request history
  - Status badges (amber=pending, green=approved, red=rejected)
  - Payment method icons (card for bank, cash for cash)
  - Comment display if provided
  - Chronological order (newest first)
- Links to create new payment request
- "No subscription" state with call-to-action

### Translations
Added `subscription` key to all 3 language files (nl, pap, es):
- Form labels and hints
- Status labels (pending, approved, rejected, active, expired)
- Error messages (file too large, invalid type, comment required)
- Success messages
- Navigation labels

Natural, parent-friendly language appropriate for Aruba context.

## Deviations from Plan

None - plan executed exactly as written.

## Technical Patterns

### File Upload Security
- **Client-side validation**: UX enhancement, prevents unnecessary server calls
- **Server-side validation**: Security guarantee using magic bytes
- **Why both**: Client improves UX, server ensures security (client can be bypassed)

This follows the validation pattern from Phase 2 (client + server layers).

### Form State Management
- Client component manages multi-step form state
- Server actions handle persistence
- Success state triggers client-side navigation
- Error state displayed inline with form

Pattern consistent with Phase 2 login/signup flows.

### Profile Lookup Pattern
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('id')
  .eq('user_id', user.id)  // NOT .eq('id', user.id)
  .single();
```

This pattern was learned in Phase 2: profiles.id is auto-generated UUID, user_id references auth.users.

## Success Criteria Verification

- [x] Parent can upload betalingsbewijs with file validation (PAY-01)
  - Client validates file type and size (UX)
  - Server validates with magic bytes (security)
  - File uploaded to payment-proofs bucket

- [x] Parent can request contante betaling with comment (PAY-02)
  - Comment field required for cash payments
  - Server validates comment is not empty
  - Record created with null file path

- [x] Parent can select abonnementsperiode from 4 options (PAY-04)
  - Four period options displayed as cards
  - Translated labels in nl/pap/es
  - Validated against SubscriptionPeriod type

- [x] Payment requests saved to database with pending status
  - Both actions insert into payment_requests table
  - Status always 'pending' for admin review
  - Profile_id linked correctly

- [x] Status page shows subscription and request history
  - Current subscription card with status/period/expiry
  - Request history with status badges and method icons
  - Chronological display (newest first)

## Key Files

### Created
- `aruba-leren/src/app/[locale]/subscription/request/actions.ts` - Server actions (183 lines)
- `aruba-leren/src/app/[locale]/subscription/request/page.tsx` - Payment request page (29 lines)
- `aruba-leren/src/app/[locale]/subscription/status/page.tsx` - Subscription status page (226 lines)
- `aruba-leren/src/components/FileUpload.tsx` - File upload component (87 lines)
- `aruba-leren/src/components/PaymentRequestForm.tsx` - Payment form component (282 lines)

### Modified
- `aruba-leren/src/messages/nl.json` - Added subscription translations
- `aruba-leren/src/messages/pap.json` - Added subscription translations
- `aruba-leren/src/messages/es.json` - Added subscription translations

## Commits

1. **10a0828**: `feat(03-02): create server actions for payment requests`
   - uploadPaymentProof and requestCashPayment
   - File validation and storage upload
   - Database insert with pending status

2. **bb73246**: `feat(03-02): create payment request UI and subscription status page`
   - FileUpload and PaymentRequestForm components
   - Request and status pages
   - Translations for nl/pap/es

## Self-Check: PASSED

### Files Exist
```bash
✓ aruba-leren/src/app/[locale]/subscription/request/actions.ts
✓ aruba-leren/src/app/[locale]/subscription/request/page.tsx
✓ aruba-leren/src/app/[locale]/subscription/status/page.tsx
✓ aruba-leren/src/components/FileUpload.tsx
✓ aruba-leren/src/components/PaymentRequestForm.tsx
```

### Commits Exist
```bash
✓ 10a0828: feat(03-02): create server actions for payment requests
✓ bb73246: feat(03-02): create payment request UI and subscription status page
```

### TypeScript Compilation
```bash
✓ npx tsc --noEmit - No errors
```

All claims verified. Implementation complete and functional.

## Next Steps

Plan 03-03 will build the admin panel for payment request verification, enabling administrators to approve/reject requests and manage subscriptions.
