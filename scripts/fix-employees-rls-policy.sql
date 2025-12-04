-- ============================================
-- FIX EMPLOYEES RLS POLICY
-- ============================================
-- This fixes the chicken-and-egg problem where users can't check
-- their own role because the RLS policy blocks them
-- ============================================

-- Add policy to allow users to view their own employee record
-- This is needed for role checking to work
CREATE POLICY "Users can view own employee record"
  ON employees FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================
-- ✅ Done! Now users can check their own role
-- ============================================

