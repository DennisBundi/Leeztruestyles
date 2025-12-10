-- ============================================
-- FIX USERS TABLE RLS POLICY
-- Allows users to create their own profile during signup
-- ============================================
-- Run this in Supabase SQL Editor to fix the signup issue
-- ============================================

-- Drop existing policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- Create policy to allow users to insert their own profile
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- VERIFICATION
-- ============================================
-- After running this, try signing up again
-- The error should be resolved







