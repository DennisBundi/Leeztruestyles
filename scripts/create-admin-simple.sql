-- ============================================
-- SIMPLE ADMIN ACCOUNT CREATION
-- For: leeztruestyles44@gmail.com
-- ============================================
--
-- INSTRUCTIONS:
-- 1. First create the user in Supabase Dashboard:
--    - Go to Authentication → Users
--    - Click "Add user" → "Create new user"
--    - Email: leeztruestyles44@gmail.com
--    - Password: [your password]
--    - Check "Auto Confirm User"
--    - Copy the User UUID
--
-- 2. Replace 'YOUR_USER_UUID_HERE' below with the actual UUID
-- 3. Run this script in Supabase SQL Editor
-- ============================================

-- Replace this with the actual UUID from Supabase Auth → Users
\set user_uuid 'YOUR_USER_UUID_HERE'

-- Create user profile
INSERT INTO users (id, email, full_name, created_at)
VALUES (:user_uuid, 'leeztruestyles44@gmail.com', 'Admin User', NOW())
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = COALESCE(users.full_name, EXCLUDED.full_name);

-- Create employee record with admin role
INSERT INTO employees (user_id, role, employee_code, created_at)
VALUES (:user_uuid, 'admin', 'EMP-001', NOW())
ON CONFLICT (user_id) DO UPDATE SET
  role = 'admin',
  employee_code = COALESCE(employees.employee_code, EXCLUDED.employee_code);

-- Verify the creation
SELECT 
  u.email,
  u.full_name,
  e.role,
  e.employee_code,
  e.created_at
FROM users u
JOIN employees e ON u.id = e.user_id
WHERE u.email = 'leeztruestyles44@gmail.com';



