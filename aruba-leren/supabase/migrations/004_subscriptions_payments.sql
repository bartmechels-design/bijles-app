-- Run this SQL in Supabase Dashboard > SQL Editor

-- ============================================================================
-- Subscription and Payment Request Tables
-- ============================================================================
-- Purpose: Enable payment verification system with manual admin approval
-- Dependencies: profiles table from 20260213_initial_schema.sql
-- ============================================================================

-- Create enums for type safety
CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'cancelled');
CREATE TYPE subscription_period AS ENUM ('per_session', 'per_week', 'per_month', 'per_school_year');
CREATE TYPE payment_method AS ENUM ('bank_transfer', 'cash');
CREATE TYPE payment_request_status AS ENUM ('pending', 'approved', 'rejected');

-- ============================================================================
-- Subscriptions Table
-- ============================================================================
-- Stores active/expired subscriptions for parents
-- One subscription per parent (enforced by UNIQUE constraint on profile_id)
-- ============================================================================

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status subscription_status NOT NULL DEFAULT 'active',
  period subscription_period NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  last_payment_request_id UUID, -- No FK to avoid circular dependency
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One subscription per parent
  CONSTRAINT unique_subscription_per_parent UNIQUE (profile_id)
);

-- ============================================================================
-- Payment Requests Table
-- ============================================================================
-- Stores payment verification requests from parents
-- Admin reviews and approves/rejects via admin panel
-- ============================================================================

CREATE TABLE payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_period subscription_period NOT NULL,
  payment_method payment_method NOT NULL,
  payment_proof_path TEXT, -- NULL for cash payments
  comment TEXT, -- Parent note for cash payments or additional context
  status payment_request_status NOT NULL DEFAULT 'pending',

  -- Approval audit fields
  approved_at TIMESTAMPTZ,
  approved_by_user_id UUID REFERENCES auth.users(id),

  -- Rejection audit fields
  rejected_at TIMESTAMPTZ,
  rejected_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Performance Indexes
-- ============================================================================

-- Optimize common query: get subscription for specific parent
CREATE INDEX idx_subscriptions_profile_status
  ON subscriptions(profile_id, status, expires_at);

-- Optimize expiry check queries (only for active subscriptions)
CREATE INDEX idx_subscriptions_expiry
  ON subscriptions(expires_at)
  WHERE status = 'active';

-- Optimize parent payment history queries
CREATE INDEX idx_payment_requests_profile
  ON payment_requests(profile_id);

-- Optimize admin panel pending requests view
CREATE INDEX idx_payment_requests_status
  ON payment_requests(status)
  WHERE status = 'pending';

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;

-- Subscriptions: Users can view their own subscription
CREATE POLICY "Users can view own subscription"
  ON subscriptions
  FOR SELECT
  USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Subscriptions: Admins can view all subscriptions
CREATE POLICY "Admins can view all subscriptions"
  ON subscriptions
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Payment Requests: Users can view their own requests
CREATE POLICY "Users can view own payment requests"
  ON payment_requests
  FOR SELECT
  USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Payment Requests: Users can create their own requests
CREATE POLICY "Users can create own payment requests"
  ON payment_requests
  FOR INSERT
  WITH CHECK (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Payment Requests: Admins can view all requests
CREATE POLICY "Admins can view all payment requests"
  ON payment_requests
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Payment Requests: Admins can update all requests (approve/reject)
CREATE POLICY "Admins can update all payment requests"
  ON payment_requests
  FOR UPDATE
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Check if current user has an active subscription
CREATE OR REPLACE FUNCTION user_has_active_subscription()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM subscriptions s
    INNER JOIN profiles p ON s.profile_id = p.id
    WHERE p.user_id = auth.uid()
      AND s.status = 'active'
      AND s.expires_at > NOW()
  );
$$;

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE subscriptions IS 'Parent subscriptions with expiry tracking';
COMMENT ON TABLE payment_requests IS 'Payment verification requests pending admin approval';
COMMENT ON FUNCTION user_has_active_subscription() IS 'Returns true if current user has an active, non-expired subscription';
