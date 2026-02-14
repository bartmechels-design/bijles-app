-- Migration 002: Auth Consent and Profile Auto-Creation
-- Purpose: Add consent tracking fields to profiles and create trigger to auto-create profiles on signup
-- Dependencies: Requires 001_initial_schema.sql (profiles table must exist)

-- ============================================
-- Step 1: Add consent tracking fields to profiles table
-- ============================================
-- These fields fulfill AUTH-06 requirement for consent checkbox during signup

ALTER TABLE public.profiles
ADD COLUMN consent_given BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN consent_date TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.consent_given IS 'Whether parent gave consent for data processing';
COMMENT ON COLUMN public.profiles.consent_date IS 'Timestamp when consent was given (null if not given)';

-- ============================================
-- Step 2: Create trigger function to auto-create profile on user signup
-- ============================================
-- This ensures every auth.users INSERT automatically creates a corresponding profiles record
-- Default role is 'parent' since all signups start as parents (they create children later)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, display_name, created_at, updated_at)
  VALUES (
    NEW.id,                    -- Match auth.users.id
    'parent',                  -- All signups default to parent role
    NEW.email,                 -- Use email as initial display name
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates a profile record when a new auth user is created';

-- ============================================
-- Step 3: Create trigger on auth.users table
-- ============================================
-- Trigger fires AFTER INSERT to ensure NEW.id is available

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 'Auto-creates profile record for every new authenticated user';
