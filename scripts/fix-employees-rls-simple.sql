-- ============================================
-- SIMPLE FIX FOR EMPLOYEES RLS RECURSION
-- ============================================
-- This is a simpler approach that avoids recursion
-- ============================================

-- Step 1: Drop all existing employees policies
DROP POLICY IF EXISTS "Only admins can view employees" ON employees;
DROP POLICY IF EXISTS "Users can view own employee record" ON employees;
DROP POLICY IF EXISTS "Authenticated users can view employees" ON employees;
DROP POLICY IF EXISTS "Only admins can insert employees" ON employees;
DROP POLICY IF EXISTS "Only admins can update employees" ON employees;
DROP POLICY IF EXISTS "Only admins can delete employees" ON employees;

-- Step 2: Create simple, non-recursive policies

-- Most important: Users must be able to view their own employee record
-- This is needed for role checking to work
CREATE POLICY "Users can view own employee record"
  ON employees FOR SELECT
  USING (auth.uid() = user_id);

-- For admin operations, we'll temporarily allow authenticated users
-- In production, you might want to use service role for admin operations
-- Or create a SECURITY DEFINER function that bypasses RLS

-- Allow authenticated users to view all employees (for admin dashboard)
-- You can restrict this later if needed
CREATE POLICY "Authenticated users can view all employees"
  ON employees FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- For insert/update/delete, allow if user is inserting/updating their own record
-- OR if they're an admin (we'll check this in application code, not RLS)
CREATE POLICY "Users can manage own employee record"
  ON employees FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- For admin operations, you'll need to use service role in your API routes
-- or create a function with SECURITY DEFINER

-- ============================================
-- ✅ This removes the recursion issue.
-- Users can view their own record for role checking.
-- Admin operations should be done via service role in API routes.
-- ============================================

