# Summary: 03-01 Database Schema, Storage Setup & Shared Utilities

## One-Liner
Database schema, storage bucket policies, and shared TypeScript utilities for payment verification system.

## What Was Built
- SQL migrations for subscriptions and payment_requests tables with 4 enums, RLS policies, indexes, and helper function
- Storage bucket policies for payment-proofs (private, 5MB limit, image-only)
- Shared TypeScript utilities: admin helper, subscription types/check, file validation with magic bytes

## Key Files
- `aruba-leren/supabase/migrations/004_subscriptions_payments.sql` — Tables, enums, RLS, indexes, helper function
- `aruba-leren/supabase/migrations/005_storage_policies.sql` — Storage RLS policies
- `aruba-leren/src/lib/auth/admin.ts` — isAdmin() + createAdminClient()
- `aruba-leren/src/lib/subscription/types.ts` — SubscriptionPeriod, PaymentMethod, prices
- `aruba-leren/src/lib/subscription/check.ts` — calculateExpiryDate()
- `aruba-leren/src/lib/storage/upload.ts` — validateImageFile() with magic bytes

## Issues Found and Fixed
- **Storage RLS already enabled**: `ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY` failed because Supabase already enables it — skipped that statement

## Decisions
- 03-01: Storage RLS already enabled by Supabase — skip ALTER TABLE statement
- 03-01: SUPABASE_SERVICE_ROLE_KEY was already present in .env.local

## Commits
- `ca63d11` — feat(03-01): add subscriptions and payment requests database schema
- `299f304` — feat(03-01): add shared utilities for subscriptions and admin operations

## Verification Results
- [x] SQL migration 004 executed in Supabase (tables, enums, RLS, indexes, function)
- [x] SQL migration 005 executed in Supabase (storage policies)
- [x] Storage bucket payment-proofs created (private, 5MB, image-only)
- [x] Admin role set via raw_app_meta_data
- [x] Service role key in .env.local
- [x] TypeScript compiles without errors
