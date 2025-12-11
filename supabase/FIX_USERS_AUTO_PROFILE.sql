-- ============================================
-- AUTO-CREATE USER PROFILE VIA TRIGGER
-- This bypasses RLS by using a database trigger
-- ============================================
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Create function to auto-create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create trigger that fires when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 3: Also ensure the INSERT policy exists (backup)
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- VERIFICATION
-- ============================================
-- Check if trigger was created:
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Check if policy exists:
SELECT * FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can insert own profile';

-- ============================================
-- DONE! Now try signing up again.
-- The trigger will automatically create the profile.
-- ============================================








