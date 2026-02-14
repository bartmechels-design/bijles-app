---
phase: 02-authentication-family-accounts
plan: 01
subsystem: auth
tags: [supabase-auth, server-actions, database-triggers, consent-tracking, postgresql]

dependency_graph:
  requires:
    - phase: 01-foundation-infrastructure
      provides: supabase-client-setup
  provides:
    - auth-schema-consent-tracking
    - auth-server-actions
    - profile-auto-creation-trigger
  affects: [all-auth-ui, all-protected-routes, parent-signup-flow]

tech_stack:
  added: []
  patterns: [database-triggers, server-actions, consent-validation]

key_files:
  created:
    - aruba-leren/supabase/migrations/002_auth_consent.sql
    - aruba-leren/src/lib/auth/actions.ts
  modified: []

decisions:
  - "All signups default to 'parent' role, children added later by parent"
  - "Consent tracking stored at profile level with boolean + timestamp"
  - "Auth trigger creates profile automatically on auth.users INSERT"
  - "Server actions translate Supabase errors to Dutch for user-facing messages"
  - "Server actions use redirect() after successful auth instead of returning success"

metrics:
  duration: 97
  completed_date: 2026-02-14
---

# Phase 02 Plan 01: Auth Schema & Server Actions Summary

**One-liner:** Database schema extended with consent tracking fields and auth trigger for auto profile creation, plus server actions for signUp/signIn/signOut with Dutch error messages.

## Overview

This plan established the database schema foundation for consent tracking and implemented core authentication server actions. The migration adds `consent_given` and `consent_date` columns to the profiles table, creates a database trigger that automatically creates a profile record whenever a new user signs up in auth.users, and provides reusable TypeScript server actions for all authentication flows.

## Tasks Completed

### Task 1: Extend profiles schema and create auth trigger
**Status:** Complete
**Commit:** 9b6a0b0
**Files:**
- Created `aruba-leren/supabase/migrations/002_auth_consent.sql` with:
  - Added `consent_given` BOOLEAN NOT NULL DEFAULT false to profiles table
  - Added `consent_date` TIMESTAMPTZ (nullable) to profiles table
  - Created `handle_new_user()` trigger function that auto-creates profile records
  - Created `on_auth_user_created` trigger on auth.users table (AFTER INSERT)

**Verification:** Migration file exists and follows Supabase PostgreSQL syntax. No database push attempted (Supabase Cloud - user will run manually in Supabase Studio).

### Task 2: Create auth server actions
**Status:** Complete
**Commit:** 6c91b32
**Files:**
- Created `aruba-leren/src/lib/auth/actions.ts` with three server actions:
  - `signUp(formData)` - Email/password signup with consent validation and profile update
  - `signIn(formData)` - Email/password login with error translation
  - `signOut()` - Sign out with redirect to home

**Key features:**
- All functions marked with 'use server' directive
- Server-side Supabase client from `@/lib/supabase/server`
- Validation: email format, password min 8 chars, consent required
- Error messages translated to Dutch
- Redirects after successful auth: `/${locale}/dashboard` for signIn/signUp, `/nl` for signOut
- Consent tracking: signUp updates profiles.consent_given and consent_date after user creation

**Verification:** Build succeeded with no TypeScript errors. All three functions exported correctly.

## Deviations from Plan

None - plan executed exactly as written.

## Technical Details

### Database Schema Changes

**Migration 002_auth_consent.sql:**

1. **Consent tracking fields:**
   - `consent_given BOOLEAN NOT NULL DEFAULT false` - Fulfills AUTH-06 requirement for consent checkbox
   - `consent_date TIMESTAMPTZ` - Nullable, set only when consent is given (GDPR compliance)

2. **Auto profile creation trigger:**
   - Function: `public.handle_new_user()` marked SECURITY DEFINER
   - Trigger: `on_auth_user_created` fires AFTER INSERT on auth.users
   - Default values: role='parent', display_name=email, timestamps=NOW()
   - This ensures every signup automatically creates a profile record without client-side code

### Server Actions Implementation

**File: aruba-leren/src/lib/auth/actions.ts**

Three server actions following Next.js 15+ patterns:

1. **signUp(formData: FormData)**
   - Validates email format, password length (min 8), consent given
   - Returns `{ error: 'Toestemming is verplicht' }` if consent not checked
   - Calls `supabase.auth.signUp({ email, password })`
   - Updates profile with consent_given=true, consent_date=NOW() if user created
   - Redirects to `/${locale}/dashboard` on success
   - Translates "already registered" error to Dutch

2. **signIn(formData: FormData)**
   - Calls `supabase.auth.signInWithPassword({ email, password })`
   - Translates errors to Dutch:
     - "Invalid login credentials" → "E-mailadres of wachtwoord is onjuist"
     - "Email not confirmed" → "E-mailadres nog niet bevestigd"
   - Redirects to `/${locale}/dashboard` on success

3. **signOut()**
   - Calls `supabase.auth.signOut()`
   - Redirects to `/nl` (home page)

**Error handling strategy:** Catch common Supabase error messages and return user-friendly Dutch translations.

**Locale handling:** Actions accept locale via formData or default to 'nl'.

### Architecture Patterns

**Server-only auth:** All auth operations use server-side Supabase client (`@/lib/supabase/server`) to ensure cookies are properly set and session management is secure.

**Database-driven profile creation:** Trigger pattern removes need for client-side profile creation logic, ensuring data consistency.

**Consent validation:** Server-side consent check prevents signup without required agreement (security + compliance).

## Verification Results

### Build Output
```
✓ Compiled successfully in 4.8s
Route (app)
├ ● /[locale]
└ ● /[locale]/privacy

○  (Static)  prerendered as static content
●  (SSG)     prerendered as static HTML
```

Build succeeded with no TypeScript errors.

### Function Exports
```bash
export async function signUp(formData: FormData) {
export async function signIn(formData: FormData) {
export async function signOut() {
```

All three auth functions exported correctly.

### Success Criteria Met

- [x] profiles table extended with consent_given and consent_date columns (migration created)
- [x] Auth trigger automatically creates profile on user signup (handle_new_user function + trigger created)
- [x] Server actions (signUp, signIn, signOut) implemented and type-safe
- [x] Each task committed individually with proper commit format
- [x] Build passes without TypeScript errors

## User Setup Required

**Manual SQL execution required:** The migration file `aruba-leren/supabase/migrations/002_auth_consent.sql` must be run manually in Supabase Studio SQL editor because we use Supabase Cloud (not local Docker).

**Steps:**
1. Open Supabase Studio: https://supabase.com/dashboard
2. Navigate to SQL Editor
3. Copy contents of `aruba-leren/supabase/migrations/002_auth_consent.sql`
4. Paste into SQL Editor and execute

**Verification queries:**
```sql
-- Check consent columns exist
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name IN ('consent_given', 'consent_date');
-- Should return 2 rows

-- Check trigger exists
SELECT trigger_name FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created';
-- Should return 1 row
```

## Self-Check: PASSED

### Created files verification
```
FOUND: aruba-leren/supabase/migrations/002_auth_consent.sql
FOUND: aruba-leren/src/lib/auth/actions.ts
```

### Commits verification
```
FOUND: 9b6a0b0 (Task 1)
FOUND: 6c91b32 (Task 2)
```

All claimed files exist and all commits are present in git history.

## Impact

This plan establishes the authentication foundation for Phase 2. The consent tracking fulfills AUTH-06 requirement (consent checkbox during signup), and the auto profile creation trigger ensures data consistency without client-side coordination.

Server actions provide reusable, type-safe functions for all auth UI components:
- Signup forms call `signUp(formData)`
- Login forms call `signIn(formData)`
- Logout buttons call `signOut()`

All error messages are translated to Dutch for consistent user experience across NL/PAP/ES locales.

## Next Steps

Phase 02 Plan 02 will build on this foundation to implement:
- Signup page UI with email/password fields and consent checkbox
- Login page UI with email/password fields
- Auth state management and protected routes
- Dashboard placeholder page

The server actions and schema created in this plan will be consumed by those UI components.

---
*Phase: 02-authentication-family-accounts*
*Completed: 2026-02-14*
