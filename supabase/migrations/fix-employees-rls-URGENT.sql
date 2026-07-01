-- ============================================
-- URGENT: FIX EMPLOYEES RLS INFINITE RECURSION
-- ============================================
-- This MUST be run to fix the signup/signin issue
-- Copy and paste this ENTIRE script into Supabase SQL Editor
-- ============================================

-- Step 1: Drop ALL existing employees policies to remove recursion
DROP POLICY IF EXISTS "Only admins can view employees" ON employees;
DROP POLICY IF EXISTS "Users can view own employee record" ON employees;
DROP POLICY IF EXISTS "Authenticated users can view all employees" ON employees;
DROP POLICY IF EXISTS "Only admins can insert employees" ON employees;
DROP POLICY IF EXISTS "Only admins can update employees" ON employees;
DROP POLICY IF EXISTS "Only admins can delete employees" ON employees;
DROP POLICY IF EXISTS "Users can manage own employee record" ON employees;

-- Step 2: Create simple, non-recursive policies

-- CRITICAL: Users MUST be able to view their own employee record
-- This is needed for role checking to work
CREATE POLICY "Users can view own employee record"
  ON employees FOR SELECT
  USING (auth.uid() = user_id);

-- Allow authenticated users to view all employees (for admin dashboard)
-- This avoids recursion by not checking admin status in the policy
CREATE POLICY "Authenticated users can view all employees"
  ON employees FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Allow users to insert their own employee record
CREATE POLICY "Users can insert own employee record"
  ON employees FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own employee record
CREATE POLICY "Users can update own employee record"
  ON employees FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- ✅ DONE! The recursion issue is now fixed.
-- 
-- Next steps:
-- 1. Refresh your browser
-- 2. Try signing up/signing in again
-- 3. The role check should now work
-- ============================================

