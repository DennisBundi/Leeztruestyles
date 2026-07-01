-- ============================================
-- FINAL FIX: RLS Policies + Admin Setup
-- ============================================
-- This script is safe to run multiple times
-- It will drop existing policies and recreate them
-- ============================================

-- ============================================
-- PART 1: Drop ALL existing employees policies
-- ============================================
-- This is safe - it won't error if policies don't exist

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

-- ============================================
-- PART 2: Create new non-recursive policies
-- ============================================

CREATE POLICY "Users can view own employee record"
  ON employees FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view all employees"
  ON employees FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert own employee record"
  ON employees FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own employee record"
  ON employees FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- PART 3: Create/Update Admin User
-- ============================================
-- Replace email if different

DO $$
DECLARE
  user_uuid UUID;
  user_email TEXT := 'leeztruestyles44@gmail.com';
  existing_employee_id UUID;
BEGIN
  -- Get user UUID
  SELECT id INTO user_uuid FROM auth.users WHERE email = user_email;
  
  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'User with email % not found. Please sign up first!', user_email;
  END IF;
  
  RAISE NOTICE 'Found user: % with UUID: %', user_email, user_uuid;
  
  -- Create/update user profile
  INSERT INTO users (id, email, full_name, created_at)
  VALUES (user_uuid, user_email, 'Admin User', NOW())
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(users.full_name, EXCLUDED.full_name);
  
  RAISE NOTICE 'User profile created/updated';
  
  -- Check if employee record exists
  SELECT id INTO existing_employee_id
  FROM employees
  WHERE user_id = user_uuid
  LIMIT 1;
  
  IF existing_employee_id IS NOT NULL THEN
    -- Update existing employee to admin
    UPDATE employees
    SET role = 'admin',
        employee_code = COALESCE(employee_code, 'EMP-' || TO_CHAR(EXTRACT(EPOCH FROM NOW())::BIGINT, 'FM999999'))
    WHERE id = existing_employee_id;
    RAISE NOTICE 'Updated existing employee record to admin';
  ELSE
    -- Create new employee record with admin role
    INSERT INTO employees (user_id, role, employee_code, created_at)
    VALUES (
      user_uuid,
      'admin',
      'EMP-' || TO_CHAR(EXTRACT(EPOCH FROM NOW())::BIGINT, 'FM999999'),
      NOW()
    );
    RAISE NOTICE 'Created new employee record with admin role';
  END IF;
  
  RAISE NOTICE '✅ Admin setup complete!';
END $$;

-- ============================================
-- PART 4: Verify Setup
-- ============================================

SELECT 
  u.email,
  u.full_name,
  e.role,
  e.employee_code,
  CASE 
    WHEN e.role = 'admin' THEN '✅ ADMIN - Ready to access dashboard'
    WHEN e.role = 'manager' THEN '✅ MANAGER - Ready to access dashboard'
    WHEN e.role IS NULL THEN '❌ NO EMPLOYEE RECORD - Run the script again'
    ELSE '❌ NOT ADMIN - Role: ' || e.role
  END as status
FROM users u
LEFT JOIN employees e ON u.id = e.user_id
WHERE u.email = 'leeztruestyles44@gmail.com';

-- ============================================
-- ✅ DONE!
-- 
-- Next steps:
-- 1. Sign out completely from your app
-- 2. Sign back in with leeztruestyles44@gmail.com
-- 3. You should be redirected to /dashboard
-- ============================================

