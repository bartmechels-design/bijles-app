-- Migration 003: Fix handle_new_user trigger to use user_id column
-- Problem: Trigger was setting id = NEW.id but not setting user_id (NOT NULL)
-- Fix: Let id auto-generate, set user_id = NEW.id

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, role, display_name, created_at, updated_at)
  VALUES (
    NEW.id,                    -- auth.users.id goes into user_id column
    'parent',                  -- All signups default to parent role
    NEW.email,                 -- Use email as initial display name
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;
