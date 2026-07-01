-- ============================================
-- MAKE USER ADMIN IN SUPABASE
-- ============================================
-- This script will make any user an admin
-- 
-- INSTRUCTIONS:
-- 1. Replace 'USER_EMAIL_HERE' below with the user's email
-- 2. Run this script in Supabase SQL Editor
-- ============================================

-- Step 1: Find the user by email and get their UUID
-- Replace 'USER_EMAIL_HERE' with the actual email address
DO $$
DECLARE
  user_uuid UUID;
  user_email TEXT := 'USER_EMAIL_HERE'; -- ⬅️ CHANGE THIS EMAIL
  employee_code TEXT;
BEGIN
  -- Get user UUID from auth.users
  SELECT id INTO user_uuid
  FROM auth.users
  WHERE email = user_email;
  
  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'User with email % not found in auth.users. Please create the user first in Authentication → Users', user_email;
  END IF;
  
  RAISE NOTICE 'Found user: % with UUID: %', user_email, user_uuid;
  
  -- Step 2: Create or update user profile in users table
  INSERT INTO users (id, email, full_name, created_at)
  VALUES (user_uuid, user_email, COALESCE((SELECT full_name FROM users WHERE id = user_uuid), 'Admin User'), NOW())
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(users.full_name, EXCLUDED.full_name);
  
  RAISE NOTICE 'User profile created/updated';
  
  -- Step 3: Generate employee code if needed
  SELECT COALESCE(
    (SELECT employee_code FROM employees WHERE user_id = user_uuid),
    'EMP-' || TO_CHAR(EXTRACT(EPOCH FROM NOW())::BIGINT, 'FM999999')
  ) INTO employee_code;
  
  -- Step 4: Create or update employee record with admin role
  INSERT INTO employees (user_id, role, employee_code, created_at)
  VALUES (user_uuid, 'admin', employee_code, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    role = 'admin',
    employee_code = COALESCE(employees.employee_code, EXCLUDED.employee_code);
  
  RAISE NOTICE 'Admin role assigned successfully!';
  RAISE NOTICE 'Employee Code: %', employee_code;
END $$;

-- Step 5: Verify the admin account was created
SELECT 
  u.id,
  u.email,
  u.full_name,
  e.role,
  e.employee_code,
  e.created_at as admin_created_at
FROM users u
LEFT JOIN employees e ON u.id = e.user_id
WHERE u.email = 'USER_EMAIL_HERE'; -- ⬅️ CHANGE THIS EMAIL TO MATCH ABOVE

-- ============================================
-- ALTERNATIVE: If you know the User UUID
-- ============================================
-- Just replace 'USER_UUID_HERE' with the actual UUID:

/*
-- Create/update user profile
INSERT INTO users (id, email, full_name, created_at)
VALUES ('USER_UUID_HERE', 'user@example.com', 'Admin User', NOW())
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = COALESCE(users.full_name, EXCLUDED.full_name);

-- Create/update employee record with admin role
INSERT INTO employees (user_id, role, employee_code, created_at)
VALUES ('USER_UUID_HERE', 'admin', 'EMP-' || TO_CHAR(EXTRACT(EPOCH FROM NOW())::BIGINT, 'FM999999'), NOW())
ON CONFLICT (user_id) DO UPDATE SET
  role = 'admin',
  employee_code = COALESCE(employees.employee_code, EXCLUDED.employee_code);
*/

