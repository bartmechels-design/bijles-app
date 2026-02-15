# Phase 3: Payment Verification System - Research

**Researched:** 2026-02-15
**Domain:** Manual payment verification with file uploads, subscription management, admin authorization
**Confidence:** HIGH

## Summary

Phase 3 implements a manual payment verification system where parents upload payment proof (bank transfer screenshot) or request cash payment, and admin approves/activates subscriptions. The system uses Supabase Storage for secure file uploads, a subscription-based access control model with RLS policies, and admin role-based authorization patterns.

Key technical challenges: secure file upload validation (magic bytes, MIME type spoofing prevention), subscription-based access blocking (RLS policies with expiry date checks), admin authorization (role-based RLS using raw_app_meta_data), and payment request workflow (status state machine: pending → approved/rejected).

The architecture leverages existing infrastructure from Phase 1-2: Supabase database with RLS, Next.js server actions for mutations, Tailwind CSS for UI. New components include Supabase Storage buckets with RLS policies, subscription/payment_request tables with timestamp-based access control, and admin-only pages using service role patterns.

**Primary recommendation:** Use Supabase Storage with private buckets and RLS policies for payment proof uploads, implement subscription access checks via RLS helper function (validates expiry date on every query), store admin role in auth.users.raw_app_meta_data (server-only modification), and create dedicated admin routes using service role client for cross-user data access.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase Storage | Latest | File upload/storage | Official Supabase module, integrated with RLS, S3-compatible |
| @supabase/ssr | Latest | Server-side Supabase client | Already in use (Phase 1), handles auth cookies for Server Actions |
| zod | 3.x | Server-side validation | TypeScript-first schema validation, integrates with Server Actions |
| file-type | 19.x | Magic bytes validation | Industry standard for MIME type verification, prevents spoofing |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @supabase/supabase-js | Latest | Service role client | Admin operations requiring RLS bypass |
| next-safe-action | 7.x | Server Action wrapper | Type-safe actions with built-in validation/auth middleware |
| date-fns | 3.x | Date manipulation | Subscription expiry calculations, locale-aware formatting |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Supabase Storage | Cloudinary/Uploadthing | Cloudinary adds external dependency and cost; Uploadthing requires separate service; Supabase Storage integrates with existing RLS |
| file-type magic bytes | MIME type header check | MIME headers easily spoofed by attackers; magic bytes validate actual file content |
| raw_app_meta_data roles | Database user_roles table | raw_app_meta_data simpler for single admin role; database table better for complex RBAC |

**Installation:**
```bash
# Core dependencies
npm install zod file-type

# Optional (recommended for production)
npm install next-safe-action date-fns
```

## Architecture Patterns

### Recommended Project Structure
```
aruba-leren/
├── supabase/
│   ├── migrations/
│   │   ├── 004_subscriptions.sql           # Subscriptions + payment_requests tables
│   │   └── 005_storage_policies.sql        # Storage bucket + RLS policies
│   └── storage/
│       └── payment-proofs/                  # Local storage bucket (private)
├── src/
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── subscription/
│   │   │   │   ├── request/page.tsx         # Parent request payment page
│   │   │   │   └── status/page.tsx          # View subscription status
│   │   │   ├── admin/
│   │   │   │   ├── layout.tsx               # Admin auth guard
│   │   │   │   ├── page.tsx                 # Admin dashboard
│   │   │   │   └── payments/page.tsx        # Payment requests queue
│   │   │   └── dashboard/page.tsx           # Protected by subscription check
│   ├── lib/
│   │   ├── auth/
│   │   │   └── admin.ts                     # Admin role check helpers
│   │   ├── subscription/
│   │   │   ├── check.ts                     # Subscription validation logic
│   │   │   └── types.ts                     # Subscription period types
│   │   └── storage/
│   │       └── upload.ts                    # File upload validation
│   └── components/
│       ├── SubscriptionGuard.tsx            # Client-side subscription blocker
│       ├── FileUpload.tsx                   # Validated file upload component
│       └── PaymentRequestCard.tsx           # Admin payment review card
└── messages/
    ├── nl.json                               # + subscription/payment keys
    ├── pap.json
    └── es.json
```

### Pattern 1: Subscription-Based Access Control with RLS
**What:** RLS helper function checks if user has active subscription (expiry date > NOW()) on every query
**When to use:** All protected tables/routes requiring active subscription
**Example:**
```sql
-- Helper function: Check if user has active subscription
CREATE OR REPLACE FUNCTION public.user_has_active_subscription()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM subscriptions s
    INNER JOIN profiles p ON p.id = s.profile_id
    WHERE p.user_id = auth.uid()
      AND s.status = 'active'
      AND s.expires_at > NOW()
  );
$$;

-- Apply to protected tables (example: future learning_progress table)
CREATE POLICY "Require active subscription for access"
  ON learning_progress
  FOR ALL
  USING (public.user_has_active_subscription());

-- Index for performance (CRITICAL)
CREATE INDEX idx_subscriptions_profile_status
  ON subscriptions(profile_id, status, expires_at);
```

### Pattern 2: Supabase Storage with Private Bucket and RLS
**What:** Private bucket for payment proofs, RLS policies control upload/download access
**When to use:** User-uploaded files requiring access control
**Example:**
```sql
-- Storage bucket is created via Supabase dashboard or API
-- Bucket name: 'payment-proofs', Public: false

-- Allow authenticated users to upload to own folder
CREATE POLICY "Users can upload payment proof"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'payment-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to view own uploaded files
CREATE POLICY "Users can view own payment proofs"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'payment-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admin can view ALL payment proofs (using service role, bypasses RLS)
-- No policy needed - service_role key bypasses RLS
```

### Pattern 3: Admin Role Authorization with raw_app_meta_data
**What:** Store admin role in auth.users.raw_app_meta_data, check in RLS policies and Server Components
**When to use:** Admin-only operations (approve payments, view all users)
**Example:**
```typescript
// src/lib/auth/admin.ts
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

// Check if current user is admin (Server Component)
export async function isAdmin(): Promise<boolean> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return false;

  // Check raw_app_meta_data.role (server-only, not modifiable by users)
  return user.app_metadata?.role === 'admin';
}

// Server-side ONLY: Set user as admin (requires service role key)
export async function setAdminRole(userId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role key (server-only)
    { auth: { persistSession: false } }
  );

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    app_metadata: { role: 'admin' }
  });

  if (error) throw error;
}
```

```sql
-- RLS policy checking admin role via JWT claims
CREATE POLICY "Admin can view all payment requests"
  ON payment_requests
  FOR SELECT
  TO authenticated
  USING (
    -- User can see own requests
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR
    -- OR user is admin
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
```

### Pattern 4: Server Action File Upload with Magic Bytes Validation
**What:** Validate file on server using magic bytes (file signature) before uploading to Storage
**When to use:** All user file uploads requiring security validation
**Example:**
```typescript
// src/lib/storage/upload.ts
import { fileTypeFromBuffer } from 'file-type';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB (Free plan limit: 50MB global)

export async function validateImageFile(file: File): Promise<{
  valid: boolean;
  error?: string;
}> {
  // 1. Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File size exceeds 5MB limit' };
  }

  // 2. Convert File to ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // 3. Validate magic bytes (file signature)
  const fileType = await fileTypeFromBuffer(buffer);

  if (!fileType) {
    return { valid: false, error: 'Could not determine file type' };
  }

  if (!ALLOWED_IMAGE_TYPES.includes(fileType.mime)) {
    return { valid: false, error: `File type ${fileType.mime} not allowed. Only JPEG, PNG, WebP accepted.` };
  }

  return { valid: true };
}
```

```typescript
// src/app/[locale]/subscription/request/actions.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { validateImageFile } from '@/lib/storage/upload';
import { revalidatePath } from 'next/cache';

export async function uploadPaymentProof(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  const file = formData.get('payment_proof') as File;

  // Validate file
  const validation = await validateImageFile(file);
  if (!validation.valid) {
    return { error: validation.error };
  }

  // Upload to Storage: {user_id}/{timestamp}-{filename}
  const timestamp = Date.now();
  const filePath = `${user.id}/${timestamp}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from('payment-proofs')
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  // Create payment request record
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!profile) {
    return { error: 'Profile not found' };
  }

  const { error: insertError } = await supabase
    .from('payment_requests')
    .insert({
      profile_id: profile.id,
      payment_proof_path: filePath,
      payment_method: 'bank_transfer',
      status: 'pending'
    });

  if (insertError) {
    return { error: insertError.message };
  }

  revalidatePath('/subscription/status');
  return { success: true };
}
```

### Pattern 5: Subscription Period Calculation
**What:** Calculate subscription expiry date based on selected period (per_session, per_week, per_month, per_school_year)
**When to use:** Admin approves payment and activates subscription
**Example:**
```typescript
// src/lib/subscription/types.ts
export type SubscriptionPeriod = 'per_session' | 'per_week' | 'per_month' | 'per_school_year';

export const SUBSCRIPTION_PRICES = {
  per_session: { awg: 5, duration_days: 1 },
  per_week: { awg: 25, duration_days: 7 },
  per_month: { awg: 90, duration_days: 30 },
  per_school_year: { awg: 900, duration_days: 365 }
} as const;

// src/lib/subscription/check.ts
import { addDays, addMonths, addYears } from 'date-fns';

export function calculateExpiryDate(
  period: SubscriptionPeriod,
  startDate: Date = new Date()
): Date {
  switch (period) {
    case 'per_session':
      return addDays(startDate, 1);
    case 'per_week':
      return addDays(startDate, 7);
    case 'per_month':
      return addMonths(startDate, 1);
    case 'per_school_year':
      return addYears(startDate, 1);
    default:
      throw new Error(`Invalid subscription period: ${period}`);
  }
}
```

```typescript
// src/app/[locale]/admin/payments/actions.ts
'use server';

import { createClient } from '@supabase/supabase-js';
import { isAdmin } from '@/lib/auth/admin';
import { calculateExpiryDate } from '@/lib/subscription/check';
import { revalidatePath } from 'next/cache';

export async function approvePaymentRequest(requestId: string) {
  // Check admin authorization
  if (!(await isAdmin())) {
    return { error: 'Unauthorized' };
  }

  // Use service role client for admin operations
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // Get payment request details
  const { data: request, error: fetchError } = await supabase
    .from('payment_requests')
    .select('*, profiles(id)')
    .eq('id', requestId)
    .single();

  if (fetchError || !request) {
    return { error: 'Payment request not found' };
  }

  // Calculate expiry date
  const expiresAt = calculateExpiryDate(request.subscription_period);

  // Create or update subscription
  const { error: upsertError } = await supabase
    .from('subscriptions')
    .upsert({
      profile_id: request.profile_id,
      status: 'active',
      period: request.subscription_period,
      expires_at: expiresAt.toISOString(),
      last_payment_request_id: requestId
    }, {
      onConflict: 'profile_id'
    });

  if (upsertError) {
    return { error: upsertError.message };
  }

  // Update payment request status
  const { error: updateError } = await supabase
    .from('payment_requests')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', requestId);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath('/admin/payments');
  return { success: true };
}
```

### Anti-Patterns to Avoid
- **Trusting MIME type headers:** Attackers can spoof Content-Type headers. Always validate magic bytes (file signature) server-side.
- **Using anon key for admin operations:** Admin actions viewing/modifying other users' data require service role key (bypasses RLS).
- **Storing admin role in user_meta_data:** user_meta_data is user-modifiable. Use raw_app_meta_data (server-only) for roles.
- **Checking subscription in every Server Component:** Create RLS helper function; database enforces access, not application code.
- **Public storage buckets for sensitive files:** Payment proofs contain personal info. Always use private buckets with RLS.
- **Forgetting to index subscription expiry columns:** RLS policies checking expires_at > NOW() cause table scans without indexes.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File type validation | Extension checking (.jpg, .png) | file-type library with magic bytes | Extensions easily renamed; magic bytes validate actual file content |
| MIME type verification | Trust Content-Type header | file-type + server-side buffer check | Headers trivially spoofed; buffer inspection detects polyglot files |
| Admin authentication | Custom admin flag in profiles table | Supabase raw_app_meta_data + RLS | app_metadata server-only, RLS database-enforced, prevents tampering |
| Subscription expiry checks | Application-level if statements | RLS helper function with indexes | Database enforces access; app checks can be bypassed via direct API calls |
| File upload size limits | Client-side validation only | Server Action with file.size check | Client validation easily bypassed; server validation enforces limit |
| Date calculations | Manual timestamp math | date-fns library | Edge cases: DST, leap years, month boundaries; library handles correctly |

**Key insight:** File upload security requires defense-in-depth: client validation (UX), server validation (security), magic bytes (content verification), file size limits (resource protection), and RLS policies (access control). Each layer catches different attack vectors. Manual payment verification is inherently risky—admin must visually verify payment screenshots for fraud, but system must prevent technical exploits (file upload attacks, subscription bypass, privilege escalation).

## Common Pitfalls

### Pitfall 1: Forgetting Storage Bucket Creation Before Applying RLS Policies
**What goes wrong:** Apply storage RLS policies via migration, but bucket doesn't exist. Policies fail silently, file uploads return "bucket not found" errors.
**Why it happens:** Storage buckets created via Supabase dashboard or API, not SQL migrations. Policies reference bucket_id that doesn't exist yet.
**How to avoid:** Create bucket via dashboard (Storage section) or API before running migration. Document bucket name in migration comments. Verify bucket exists: `SELECT * FROM storage.buckets;`
**Warning signs:** File upload errors "Bucket not found". Storage policies query shows policies but no matching bucket_id.

### Pitfall 2: Service Role Key Exposed in Client Code
**What goes wrong:** Import service role key in Client Component or Server Component used on client. Key leaked in browser bundle, attackers gain full database access bypassing RLS.
**Why it happens:** Next.js bundles all imports. Service role key imported in file that's eventually used client-side gets included in bundle.
**How to avoid:** Only import service role key in Server Actions (files with 'use server' directive) or Route Handlers. Never use NEXT_PUBLIC_ prefix for service role key. Verify build output doesn't contain key string.
**Warning signs:** Build warnings about server-only module in client bundle. Service role key visible in browser DevTools → Sources.

### Pitfall 3: Missing Index on Subscription Expiry Date
**What goes wrong:** RLS policy checks expires_at > NOW() on every query. Without index, full table scan on subscriptions table. Query times 50ms → 500ms with 10k subscriptions.
**Why it happens:** RLS policies are SQL WHERE clauses. expires_at comparison without index forces sequential scan.
**How to avoid:** CREATE INDEX on (profile_id, status, expires_at). Composite index supports common query patterns. Run EXPLAIN ANALYZE on subscription queries.
**Warning signs:** Slow dashboard loads. Database logs show slow queries on subscriptions table. EXPLAIN shows Seq Scan instead of Index Scan.

### Pitfall 4: File Upload Without Magic Bytes Validation
**What goes wrong:** Trust file extension (.jpg) or MIME type header (image/jpeg). Attacker uploads malicious file (shell.php renamed to shell.jpg). If Storage serves files with original extension, creates security vulnerability.
**Why it happens:** Extensions and MIME headers easily changed. file.type in browser uses extension, not content inspection.
**How to avoid:** Always validate magic bytes server-side using file-type library. Reject files with mismatched signatures. Re-encode images server-side if paranoid (kills polyglots).
**Warning signs:** Security audit flags "file upload without content validation". Penetration testing discovers upload of executable files.

### Pitfall 5: Checking Subscription Status in Client Component Only
**What goes wrong:** Block dashboard access in Client Component checking subscription. User opens DevTools, removes blocking component, accesses dashboard. Data still loads because RLS not applied.
**Why it happens:** Client-side checks are UX, not security. Browser code can be modified or bypassed.
**How to avoid:** Implement subscription checks at database level (RLS policies). Client component only shows friendly message; actual blocking happens in RLS.
**Warning signs:** Dashboard data visible in Network tab even when "subscription required" message shows. Direct API calls bypass client check.

### Pitfall 6: Admin Role in Database user_roles Table Without JWT Claims
**What goes wrong:** Store admin role in user_roles table, query on every request to check if user is admin. RLS policies can't access user_roles (chicken-egg problem). Admin checks require application code, not database-enforced.
**Why it happens:** User-facing RBAC tutorials use database tables. Works for application-level checks but not RLS policies.
**How to avoid:** Store critical roles (admin) in raw_app_meta_data for RLS access via auth.jwt(). Use database tables for fine-grained permissions. Set app_metadata via service role: `supabase.auth.admin.updateUserById()`.
**Warning signs:** RLS policies can't check admin status. Every admin check requires supabase query (not JWT read).

### Pitfall 7: Not Handling Subscription Expiry Edge Cases
**What goes wrong:** User's subscription expires while they're actively using app. In-progress actions fail, data disappears mid-session, confusing UX.
**Why it happens:** Subscription expiry is point-in-time. User starts session with active subscription, expires during session, RLS blocks access.
**How to avoid:** Add grace period (expires_at + 1 hour) in RLS policy. Show "subscription expiring soon" warning 7 days before. Soft-block: allow read-only access for 24h after expiry.
**Warning signs:** Support tickets "lost progress after payment expired". User confusion about exact expiry time.

### Pitfall 8: Payment Request Status Without Timestamps
**What goes wrong:** payment_requests table has status enum (pending, approved, rejected) but no timestamp columns. Can't answer "when was this approved?", "how long pending?", "who approved it?".
**Why it happens:** Focus on current state, not history. Forget audit trail requirements.
**How to avoid:** Add approved_at, rejected_at, approved_by_user_id columns. Set to NULL when status changes. Create database trigger to auto-populate timestamps.
**Warning signs:** Admin can't answer "how long does approval take on average?". No audit log for payment approvals.

### Pitfall 9: Free Plan Storage Limit Exhaustion
**What goes wrong:** Use Supabase Free plan (1GB storage). Parents upload 5MB payment proofs. 200 uploads = 1GB = storage limit reached. New uploads fail.
**Why it happens:** Free plan 1GB includes database + storage. Payment proofs accumulate over time, never deleted.
**How to avoid:** Implement file deletion after approval (keep DB record, delete Storage file). Compress images server-side (sharp library). Monitor Storage usage via dashboard. Upgrade to Pro plan ($25/mo = 100GB).
**Warning signs:** Upload errors "Storage quota exceeded". Storage dashboard shows 95%+ usage.

### Pitfall 10: Cash Payment Request Without Admin Verification
**What goes wrong:** Parent selects "cash payment", submits request, no payment proof required. Admin approves, parent never actually pays. Abuse vector.
**Why it happens:** Cash payments harder to verify digitally. No receipt/proof like bank transfers.
**How to avoid:** Require comment/note field for cash payments (when/where payment will happen). Admin manual verification step: call parent or require in-person payment before approval. Flag cash requests differently in admin UI.
**Warning signs:** High ratio of cash requests vs bank transfers. Parents exploit "free trial via cash request" loophole.

## Code Examples

Verified patterns from official sources and prior research:

### Database Schema for Subscriptions and Payment Requests
```sql
-- Source: Adapted from https://github.com/vercel/nextjs-subscription-payments/blob/main/schema.sql

-- ============================================================================
-- SUBSCRIPTIONS TABLE
-- ============================================================================
-- Purpose: Track active subscriptions per parent profile
-- One subscription per profile (1:1), upserted on renewal

CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'cancelled');
CREATE TYPE subscription_period AS ENUM ('per_session', 'per_week', 'per_month', 'per_school_year');

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status subscription_status NOT NULL DEFAULT 'active',
  period subscription_period NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  last_payment_request_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id) -- One active subscription per parent
);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Performance indexes
CREATE INDEX idx_subscriptions_profile_status ON subscriptions(profile_id, status, expires_at);
CREATE INDEX idx_subscriptions_expiry ON subscriptions(expires_at) WHERE status = 'active';

-- RLS Policies
CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Admin can view all (via JWT claim check)
CREATE POLICY "Admin can view all subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ============================================================================
-- PAYMENT_REQUESTS TABLE
-- ============================================================================
-- Purpose: Track payment verification requests from parents

CREATE TYPE payment_method AS ENUM ('bank_transfer', 'cash');
CREATE TYPE payment_request_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_period subscription_period NOT NULL,
  payment_method payment_method NOT NULL,
  payment_proof_path TEXT, -- Path in storage.objects (NULL for cash)
  status payment_request_status NOT NULL DEFAULT 'pending',
  comment TEXT, -- Parent note (for cash: when/where payment)
  approved_at TIMESTAMPTZ,
  approved_by_user_id UUID REFERENCES auth.users(id),
  rejected_at TIMESTAMPTZ,
  rejected_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;

-- Performance indexes
CREATE INDEX idx_payment_requests_profile ON payment_requests(profile_id);
CREATE INDEX idx_payment_requests_status ON payment_requests(status) WHERE status = 'pending';

-- RLS Policies
CREATE POLICY "Users can view own payment requests"
  ON payment_requests FOR SELECT
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create own payment requests"
  ON payment_requests FOR INSERT
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admin can view all payment requests"
  ON payment_requests FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admin can update payment requests"
  ON payment_requests FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ============================================================================
-- SUBSCRIPTION ACCESS HELPER
-- ============================================================================
-- Purpose: Check if user has active subscription (used in RLS policies)

CREATE OR REPLACE FUNCTION public.user_has_active_subscription()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM subscriptions s
    INNER JOIN profiles p ON p.id = s.profile_id
    WHERE p.user_id = auth.uid()
      AND s.status = 'active'
      AND s.expires_at > NOW()
  );
$$;

-- Example usage: Apply to protected tables
-- CREATE POLICY "Require active subscription"
--   ON learning_progress FOR ALL
--   USING (public.user_has_active_subscription());
```

### Storage Bucket RLS Policies
```sql
-- Source: https://supabase.com/docs/guides/storage/security/access-control

-- Create bucket via Supabase dashboard first:
-- Name: payment-proofs
-- Public: false (private bucket)
-- File size limit: 5MB
-- Allowed MIME types: image/jpeg, image/png, image/webp

-- Allow authenticated users to upload to own folder
CREATE POLICY "Users can upload payment proof"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'payment-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to view own uploaded files
CREATE POLICY "Users can view own payment proofs"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'payment-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admin can view ALL payment proofs via service role (bypasses RLS)
-- No explicit policy needed - service_role key bypasses all RLS

-- Performance index on bucket + folder
CREATE INDEX IF NOT EXISTS idx_storage_objects_bucket_folder
  ON storage.objects(bucket_id, (storage.foldername(name))[1]);
```

### File Upload Component with Validation
```typescript
// src/components/FileUpload.tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function FileUpload({
  onFileSelect
}: {
  onFileSelect: (file: File) => void
}) {
  const t = useTranslations('subscription.upload');
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError(null);

    if (!file) return;

    // Client-side validation (UX only, not security)
    if (file.size > MAX_FILE_SIZE) {
      setError(t('errors.fileTooLarge'));
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(t('errors.invalidFileType'));
      return;
    }

    onFileSelect(file);
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-2">
        {t('label')}
      </label>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="block w-full text-sm"
      />
      {error && (
        <p className="text-red-600 text-sm mt-2">{error}</p>
      )}
      <p className="text-gray-500 text-xs mt-1">
        {t('hint')} {/* "Maximum 5MB. JPEG, PNG, or WebP." */}
      </p>
    </div>
  );
}
```

### Admin Dashboard with Service Role
```typescript
// src/app/[locale]/admin/payments/page.tsx
import { createClient } from '@supabase/supabase-js';
import { isAdmin } from '@/lib/auth/admin';
import { redirect } from 'next/navigation';

export default async function AdminPaymentsPage() {
  // Check admin authorization
  if (!(await isAdmin())) {
    redirect('/');
  }

  // Use service role for admin queries (bypasses RLS)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // Get all pending payment requests
  const { data: requests, error } = await supabase
    .from('payment_requests')
    .select(`
      *,
      profiles (
        id,
        display_name,
        user_id
      )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) {
    return <div>Error loading payment requests: {error.message}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Pending Payment Requests</h1>

      {requests.length === 0 ? (
        <p className="text-gray-500">No pending requests.</p>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <PaymentRequestCard key={request.id} request={request} />
          ))}
        </div>
      )}
    </div>
  );
}
```

### Subscription Guard Component
```typescript
// src/components/SubscriptionGuard.tsx
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from '@/lib/navigation';
import { useTranslations } from 'next-intl';

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const t = useTranslations('subscription');
  const router = useRouter();
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null);

  useEffect(() => {
    checkSubscription();
  }, []);

  async function checkSubscription() {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    // Query subscription (RLS ensures only own subscription visible)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      setHasSubscription(false);
      return;
    }

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status, expires_at')
      .eq('profile_id', profile.id)
      .single();

    // Check if subscription active and not expired
    const isActive = subscription &&
      subscription.status === 'active' &&
      new Date(subscription.expires_at) > new Date();

    setHasSubscription(isActive);

    if (!isActive) {
      router.push('/subscription/request');
    }
  }

  if (hasSubscription === null) {
    return <div className="p-8 text-center">{t('checking')}</div>;
  }

  if (!hasSubscription) {
    return null; // Will redirect
  }

  return <>{children}</>;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Database user_roles for admin | raw_app_meta_data in auth.users | Supabase Auth v2 (2023) | Simpler single-admin model, JWT-accessible in RLS |
| MIME type header validation | Magic bytes validation (file-type) | Ongoing security best practice | Prevents file extension/MIME spoofing attacks |
| Client-side file size limits | Server Action validation + Supabase bucket limits | Next.js 13 Server Actions (2023) | Enforces limits server-side, prevents bypass |
| Manual subscription checks | RLS helper function with indexes | Postgres 9.5+ RLS (2016) | Database-enforced access, performance optimized |
| Public storage buckets | Private buckets with RLS policies | Supabase Storage v2 (2022) | Fine-grained access control, audit trail |
| Stripe/PayPal integration | Manual verification (Aruba context) | N/A | Limited online payment infrastructure in Aruba |

**Deprecated/outdated:**
- **Extension-only file validation:** Trivially bypassed by renaming files. Use magic bytes (file-type library).
- **Trusting Content-Type headers:** Easily spoofed. Always validate file content server-side.
- **Admin flag in profiles table:** Prefer raw_app_meta_data for database-level authorization via RLS.
- **Global subscription check in middleware:** Too coarse-grained. Use RLS policies on individual tables for granular control.
- **Standard uploads for files >5MB:** Use resumable uploads (TUS protocol) for larger files. Free plan supports up to 50MB standard, 5GB resumable.

## Open Questions

1. **Payment Verification Fraud Prevention**
   - What we know: Admin visually verifies bank transfer screenshots. Cash payments require manual coordination.
   - What's unclear: How to detect fake/edited payment screenshots? Should system integrate with Arubabank API?
   - Recommendation: Start with manual verification (low volume). Add "verified payment" badge after first successful payment. Consider Arubabank integration if volume scales (requires bank partnership).

2. **Subscription Grace Period Policy**
   - What we know: Hard cutoff at expires_at causes poor UX (mid-session access loss).
   - What's unclear: How long grace period? Read-only vs full block? Warning timeline?
   - Recommendation: 7-day warning before expiry, 24-hour grace period (read-only access), then full block. Clearly communicate in UI.

3. **Admin Role Management**
   - What we know: Single admin set via raw_app_meta_data using service role key.
   - What's unclear: How to grant/revoke admin? Should support multiple admins? Audit log?
   - Recommendation: Create admin management script (Node.js) using service role key. For multi-admin, add audit log table (admin_actions) tracking who approved what when.

4. **File Storage Retention Policy**
   - What we know: Payment proofs accumulate, consume storage (1GB Free plan limit).
   - What's unclear: Keep files forever? Delete after approval? Compliance requirements?
   - Recommendation: Delete Storage files 30 days after approval (keep payment_requests record). Implement cleanup cron job. Document retention policy in privacy policy.

5. **Cash Payment Verification Process**
   - What we know: Cash payments common in Aruba, no digital proof.
   - What's unclear: Exact workflow—parent pays in person? Admin visits? Phone coordination?
   - Recommendation: Require parent comment (when/where payment happens). Admin manually confirms via phone/in-person before approval. Flag cash requests in admin UI for manual process.

## Sources

### Primary (HIGH confidence)
- [Supabase Storage Upload API](https://supabase.com/docs/reference/javascript/storage-from-upload) - File upload method, parameters, RLS requirements
- [Supabase Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control) - RLS policies on storage.objects, bucket security patterns
- [Supabase Storage File Limits](https://supabase.com/docs/guides/storage/uploads/file-limits) - File size limits by plan (50MB Free, 500GB Pro), upload methods
- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security) - Policy syntax, auth.uid(), performance optimization
- [Supabase RBAC Custom Claims](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac) - Admin roles via raw_app_meta_data, JWT claims in RLS
- [Next.js Server Actions Guide 2026](https://makerkit.dev/blog/tutorials/nextjs-server-actions) - File upload patterns, Zod validation, useActionState
- [Vercel Subscription Schema](https://github.com/vercel/nextjs-subscription-payments/blob/main/schema.sql) - Production subscription table design, status enums, timestamps

### Secondary (MEDIUM confidence)
- [Supabase Storage Bucket Fundamentals](https://supabase.com/docs/guides/storage/buckets/fundamentals) - Public vs private buckets, access patterns
- [Supabase RLS Best Practices](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices) - Production patterns for multi-tenant apps, performance tips
- [Magic Bytes File Validation](https://medium.com/@sridhar_be/file-validations-using-magic-numbers-in-nodejs-express-server-d8fbb31a97e7) - Implementation in Node.js, security advantages
- [File Upload MIME Type Bypass](https://www.sourcery.ai/vulnerabilities/file-upload-content-type-bypass) - Security vulnerabilities, prevention strategies
- [Supabase Admin User Permissions](https://akoskm.com/admin-user-permissions-in-supabase-with-rls/) - Practical admin role implementation with RLS

### Tertiary (LOW confidence - needs validation)
- [Database Schema for Subscriptions](https://www.red-gate.com/blog/a-saas-subscription-data-model) - General SaaS subscription patterns (not Supabase-specific)
- [File Type Detection Best Practices](https://www.opswat.com/products/metadefender/file-type-verification) - Commercial product documentation (validation approach, not implementation)
- [Tailwind Admin Templates 2026](https://tailadmin.com/) - UI component inspiration (not architectural guidance)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Supabase Storage official documentation, file-type library widely used, Server Actions established pattern
- Architecture: HIGH - RLS patterns verified with official docs, subscription schema adapted from production example (Vercel)
- Pitfalls: HIGH - Storage security documented in official guides, admin role patterns verified with Supabase RBAC docs
- File validation: HIGH - Magic bytes validation industry standard, official security documentation confirms MIME spoofing risk
- Admin authorization: MEDIUM - raw_app_meta_data approach documented, but multi-admin scaling unclear without testing
- Payment workflow: MEDIUM - Aruba-specific manual verification context, not standard online payment flow

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (30 days - stable infrastructure, manual payment workflow may need adjustment based on user feedback)

**Note:** Supabase Storage limits and RLS patterns current as of Feb 2026. File upload security (magic bytes) ongoing best practice. Manual payment verification reflects Aruba's limited online payment infrastructure—may migrate to automated provider (Stripe, local gateway) if infrastructure improves.
