-- ============================================
-- CHECK AND CREATE ADMIN ACCOUNT
-- For: leeztruestyles44@gmail.com
-- ============================================
-- This script will:
-- 1. Check if the user exists in auth.users
-- 2. Create user profile if missing
-- 3. Assign admin role
-- ============================================

-- Step 1: Check if user exists in auth.users
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email = 'leeztruestyles44@gmail.com';

-- Step 2: If user exists, get the UUID and run the following:
-- (Replace 'USER_UUID_FROM_ABOVE' with the actual UUID from Step 1)

-- Create user profile
INSERT INTO users (id, email, full_name, created_at)
VALUES ('USER_UUID_FROM_ABOVE', 'leeztruestyles44@gmail.com', 'Admin User', NOW())
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = COALESCE(users.full_name, EXCLUDED.full_name);

-- Create employee record with admin role
INSERT INTO employees (user_id, role, employee_code, created_at)
VALUES ('USER_UUID_FROM_ABOVE', 'admin', 'EMP-001', NOW())
ON CONFLICT (user_id) DO UPDATE SET
  role = 'admin',
  employee_code = COALESCE(employees.employee_code, EXCLUDED.employee_code);

-- Step 3: Verify the admin account
SELECT 
  u.id,
  u.email,
  u.full_name,
  e.role,
  e.employee_code,
  e.created_at as admin_created_at
FROM users u
LEFT JOIN employees e ON u.id = e.user_id
WHERE u.email = 'leeztruestyles44@gmail.com';

-- ============================================
-- QUICK VERSION (if you know the UUID):
-- ============================================
-- Just replace 'YOUR_UUID_HERE' and run:

/*
INSERT INTO users (id, email, full_name, created_at)
VALUES ('YOUR_UUID_HERE', 'leeztruestyles44@gmail.com', 'Admin User', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO employees (user_id, role, employee_code, created_at)
VALUES ('YOUR_UUID_HERE', 'admin', 'EMP-001', NOW())
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
*/









