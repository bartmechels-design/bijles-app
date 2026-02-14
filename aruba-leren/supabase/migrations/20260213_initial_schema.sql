-- ArubaLeren Initial Schema
-- Created: 2026-02-13
-- Purpose: Set up core user data tables with Row Level Security
-- Privacy: Stores ONLY minimal required data per PRIV-01 (voornaam, klas, voortgang)
--
-- Tables:
--   - profiles: Parent accounts (linked to auth.users)
--   - children: Child profiles with minimal data
--
-- RLS is deny-by-default: without policies, all queries return empty.
-- Voortgangsdata tables will be added in Phase 5.

-- ============================================================================
-- Updated_at trigger function
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================
-- Purpose: Parent accounts linked to Supabase auth.users
-- One profile per authenticated user (1:1 relationship)
-- Stores parent's display name and language preference

CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    locale TEXT DEFAULT 'nl' CHECK (locale IN ('nl', 'pap', 'es')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS immediately after table creation
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Performance index on auth.uid() comparison column
CREATE INDEX idx_profiles_user_id ON profiles(user_id);

-- Updated_at trigger
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for profiles
-- Allow authenticated users to view their own profile
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = user_id);

-- Allow authenticated users to create their own profile
CREATE POLICY "Users can create own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to update their own profile
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================================================
-- CHILDREN TABLE
-- ============================================================================
-- Purpose: Child profiles with minimal data per PRIV-01
-- Stores: voornaam (first_name), leeftijd (age), klas (grade)
-- Linked to parent profile (one parent can have multiple children)

CREATE TABLE children (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    age INTEGER CHECK (age >= 4 AND age <= 14),
    grade INTEGER NOT NULL CHECK (grade >= 1 AND grade <= 6),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS immediately after table creation
ALTER TABLE children ENABLE ROW LEVEL SECURITY;

-- Performance index on parent_id for RLS policy lookups
CREATE INDEX idx_children_parent_id ON children(parent_id);

-- Updated_at trigger
CREATE TRIGGER update_children_updated_at
    BEFORE UPDATE ON children
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for children
-- Allow users to view children belonging to their profile
CREATE POLICY "Users can view own children"
    ON children FOR SELECT
    USING (parent_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Allow users to add children to their own profile
CREATE POLICY "Users can add own children"
    ON children FOR INSERT
    WITH CHECK (parent_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Allow users to update their own children
CREATE POLICY "Users can update own children"
    ON children FOR UPDATE
    USING (parent_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Allow users to remove their own children
CREATE POLICY "Users can delete own children"
    ON children FOR DELETE
    USING (parent_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- To verify RLS is working after applying this migration:
-- 1. Check tables exist: \dt in psql or view in Supabase Dashboard
-- 2. Verify RLS is enabled: SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
-- 3. Check policies exist: \d+ profiles and \d+ children in psql
-- 4. Test with authenticated user: queries should only return own data
