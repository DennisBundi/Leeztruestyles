-- ============================================
-- RESET ADMIN USERS - Clean Slate
-- ============================================
-- This script will:
-- 1. Delete all employee records (or just admin ones)
-- 2. Optionally delete user records
-- 3. Recreate the admin user and employee record
-- ============================================
-- WARNING: This will delete all employee records!
-- Make sure you have backups if needed.
-- ============================================

-- ============================================
-- PART 1: View current admin users (for reference)
-- ============================================
SELECT 
  u.id as user_id,
  u.email,
  u.full_name,
  e.role,
  e.employee_code,
  e.created_at as employee_created_at
FROM users u
LEFT JOIN employees e ON u.id = e.user_id
WHERE e.role IN ('admin', 'manager') OR u.email = 'leeztruestyles44@gmail.com'
ORDER BY e.created_at DESC;

-- ============================================
-- PART 2: Delete all employee records
-- ============================================
-- This removes all employee records (admin, manager, seller, etc.)
-- If you only want to delete admin records, use the commented query below instead

DELETE FROM employees;

-- Alternative: Only delete admin/manager records
-- DELETE FROM employees WHERE role IN ('admin', 'manager');

-- ============================================
-- PART 3: Optionally delete user records
-- ============================================
-- Uncomment the lines below if you want to delete user records too
-- WARNING: This will delete user data! Only do this if you want a complete reset.

-- DELETE FROM users WHERE email = 'leeztruestyles44@gmail.com';
-- Note: This won't delete the auth.users record - that needs to be done from Supabase Auth dashboard

-- ============================================
-- PART 4: Recreate Admin User
-- ============================================
-- This will find the user in auth.users and create/update their records

DO $$
DECLARE
  user_uuid UUID;
  user_email TEXT := 'leeztruestyles44@gmail.com';
  existing_user_id UUID;
BEGIN
  -- Get user UUID from auth.users
  SELECT id INTO user_uuid 
  FROM auth.users 
  WHERE email = user_email;
  
  IF user_uuid IS NULL THEN
    RAISE NOTICE '⚠️ User with email % not found in auth.users', user_email;
    RAISE NOTICE '💡 Please sign up first at /signup, then run this script again.';
    RETURN;
  END IF;
  
  RAISE NOTICE '✅ Found user: % with UUID: %', user_email, user_uuid;
  
  -- Create/update user profile in users table
  INSERT INTO users (id, email, full_name, created_at)
  VALUES (user_uuid, user_email, 'Admin User', NOW())
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(users.full_name, EXCLUDED.full_name);
  
  RAISE NOTICE '✅ User profile created/updated in users table';
  
  -- Delete any existing employee record for this user (if any)
  DELETE FROM employees WHERE user_id = user_uuid;
  
  -- Create new employee record with admin role
  INSERT INTO employees (user_id, role, employee_code, created_at)
  VALUES (
    user_uuid,
    'admin',
    'EMP-' || TO_CHAR(EXTRACT(EPOCH FROM NOW())::BIGINT, 'FM999999'),
    NOW()
  );
  
  RAISE NOTICE '✅ Employee record created with admin role';
  RAISE NOTICE '✅ Admin user setup complete!';
END $$;

-- ============================================
-- PART 5: Verify the setup
-- ============================================
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
  END as status,
  e.created_at as employee_created_at
FROM users u
LEFT JOIN employees e ON u.id = e.user_id
WHERE u.email = 'leeztruestyles44@gmail.com';

-- ============================================
-- PART 6: Show all current employees (for verification)
-- ============================================
SELECT 
  u.email,
  e.role,
  e.employee_code,
  e.created_at
FROM employees e
JOIN users u ON e.user_id = u.id
ORDER BY e.created_at DESC;

-- ============================================
-- ✅ DONE!
-- ============================================
-- 
-- Next steps:
-- 1. Sign out completely from your app
-- 2. Clear browser cookies/localStorage (optional but recommended)
-- 3. Sign in again with leeztruestyles44@gmail.com
-- 4. You should now be able to access /dashboard
-- 
-- If the user doesn't exist in auth.users:
-- 1. Go to /signup and create the account
-- 2. Then run this script again to create the employee record
-- ============================================

