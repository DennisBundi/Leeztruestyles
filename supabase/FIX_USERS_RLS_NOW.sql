-- ============================================
-- FIX USERS TABLE RLS - RUN THIS NOW!
-- ============================================
-- This will fix the "row-level security policy" error
-- Copy and paste this ENTIRE script into Supabase SQL Editor
-- ============================================

-- Drop existing policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- Create policy to allow users to insert their own profile
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- DONE! Now try signing up again.
-- ============================================













