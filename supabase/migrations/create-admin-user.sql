-- ============================================
-- CREATE ADMIN USER
-- ============================================
-- Run this after manually deleting employees and users
-- This will recreate the admin user and employee record
-- ============================================

-- Step 1: Create/update user profile in users table
-- Replace the UUID below with your actual user UUID from auth.users
-- Or use the subquery to get it automatically
INSERT INTO users (id, email, full_name, created_at)
SELECT 
  id,
  email,
  'Admin User',
  NOW()
FROM auth.users
WHERE email = 'leeztruestyles44@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = COALESCE(users.full_name, EXCLUDED.full_name);

-- Step 2: Delete any existing employee record for this user
DELETE FROM employees 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'leeztruestyles44@gmail.com'
);

-- Step 3: Create employee record with admin role
INSERT INTO employees (user_id, role, employee_code, created_at)
SELECT 
  id,
  'admin',
  'EMP-' || TO_CHAR(EXTRACT(EPOCH FROM NOW())::BIGINT, 'FM999999'),
  NOW()
FROM auth.users
WHERE email = 'leeztruestyles44@gmail.com';

-- ============================================
-- VERIFY THE SETUP
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
-- 2. Sign in again with leeztruestyles44@gmail.com
-- 3. You should now be able to access /dashboard
-- ============================================

