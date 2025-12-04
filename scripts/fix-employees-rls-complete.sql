-- ============================================
-- COMPLETE FIX: Employees RLS Policies
-- ============================================
-- This script safely fixes RLS policy conflicts
-- It can be run multiple times without errors
-- ============================================

-- ============================================
-- PART 1: Drop ALL existing employee policies
-- ============================================
-- Using IF EXISTS to avoid errors if policies don't exist
-- This ensures a clean slate before creating new policies

DROP POLICY IF EXISTS "Only admins can view employees" ON employees;
DROP POLICY IF EXISTS "Users can view own employee record" ON employees;
DROP POLICY IF EXISTS "Authenticated users can view all employees" ON employees;
DROP POLICY IF EXISTS "Authenticated users can view employees" ON employees;
DROP POLICY IF EXISTS "Only admins can insert employees" ON employees;
DROP POLICY IF EXISTS "Only admins can update employees" ON employees;
DROP POLICY IF EXISTS "Only admins can delete employees" ON employees;
DROP POLICY IF EXISTS "Users can manage own employee record" ON employees;
DROP POLICY IF EXISTS "Users can insert own employee record" ON employees;
DROP POLICY IF EXISTS "Users can update own employee record" ON employees;

-- Wait a moment to ensure policies are fully dropped
DO $$ BEGIN 
  PERFORM pg_sleep(0.1);
END $$;

-- ============================================
-- PART 2: Create correct non-recursive policies
-- ============================================
-- These policies avoid recursion by not checking admin status
-- through the employees table itself

-- Policy 1: Users can view their own employee record
-- This is CRITICAL for role checking to work
CREATE POLICY "Users can view own employee record"
  ON employees FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 2: Authenticated users can view all employees
-- This allows the admin dashboard to list all employees
-- and avoids recursion by not checking admin role
CREATE POLICY "Authenticated users can view all employees"
  ON employees FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Policy 3: Users can insert their own employee record
-- This allows signup flow to create employee records
CREATE POLICY "Users can insert own employee record"
  ON employees FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can update their own employee record
-- This allows users to update their own employee data
CREATE POLICY "Users can update own employee record"
  ON employees FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- PART 3: Verification
-- ============================================
-- Check that policies were created correctly

-- Show all current policies on employees table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'employees'
ORDER BY policyname;

-- Verify admin user can access their employee record
-- Replace 'leeztruestyles44@gmail.com' with your admin email if different
SELECT 
  u.email,
  u.full_name,
  e.role,
  e.employee_code,
  CASE 
    WHEN e.role = 'admin' THEN '✅ ADMIN - Ready to access dashboard'
    WHEN e.role = 'manager' THEN '✅ MANAGER - Ready to access dashboard'
    WHEN e.role IS NULL THEN '❌ NO EMPLOYEE RECORD'
    ELSE '⚠️ NOT ADMIN - Role: ' || e.role
  END as status
FROM users u
LEFT JOIN employees e ON u.id = e.user_id
WHERE u.email = 'leeztruestyles44@gmail.com';

-- ============================================
-- ✅ DONE!
-- ============================================
-- 
-- Next steps:
-- 1. Sign out completely from your app
-- 2. Clear browser cookies/localStorage
-- 3. Sign back in with leeztruestyles44@gmail.com
-- 4. You should now be able to access /dashboard
-- 
-- If you still have issues:
-- 1. Check the verification query above shows your admin status
-- 2. Check browser console for any RLS errors
-- 3. Verify your user_id matches the user_id in employees table
-- ============================================

