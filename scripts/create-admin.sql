-- ============================================
-- CREATE ADMIN USER SCRIPT
-- Run this in Supabase SQL Editor
-- ============================================
-- 
-- STEP 1: First, create the user in Supabase Auth Dashboard:
--   1. Go to Authentication → Users
--   2. Click "Add user" → "Create new user"
--   3. Email: leeztruestyles44@gmail.com
--   4. Password: [your secure password]
--   5. Copy the User UUID from the users table
--
-- STEP 2: Then run this SQL script, replacing 'USER_UUID_HERE' with the actual UUID
-- ============================================

-- Replace 'USER_UUID_HERE' with the UUID from Supabase Auth → Users
-- You can find the UUID after creating the user in Authentication → Users

DO $$
DECLARE
  user_uuid UUID;
  employee_code VARCHAR(50);
BEGIN
  -- Set the user UUID here (replace with actual UUID from Supabase Auth)
  user_uuid := 'USER_UUID_HERE'::UUID;
  
  -- Generate employee code
  employee_code := 'EMP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  
  -- Create user profile if it doesn't exist
  INSERT INTO users (id, email, full_name, created_at)
  VALUES (user_uuid, 'leeztruestyles44@gmail.com', 'Admin User', NOW())
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(users.full_name, EXCLUDED.full_name);
  
  -- Create employee record with admin role
  INSERT INTO employees (user_id, role, employee_code, created_at)
  VALUES (user_uuid, 'admin', employee_code, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    role = 'admin',
    employee_code = COALESCE(employees.employee_code, EXCLUDED.employee_code);
  
  RAISE NOTICE '✅ Admin user created successfully!';
  RAISE NOTICE '   Email: leeztruestyles44@gmail.com';
  RAISE NOTICE '   Employee Code: %', employee_code;
  RAISE NOTICE '   Role: admin';
  
EXCEPTION
  WHEN invalid_text_representation THEN
    RAISE EXCEPTION '❌ Error: Invalid UUID format. Please replace USER_UUID_HERE with the actual UUID from Supabase Auth → Users';
  WHEN foreign_key_violation THEN
    RAISE EXCEPTION '❌ Error: User does not exist in auth.users. Please create the user in Authentication → Users first.';
  WHEN unique_violation THEN
    RAISE NOTICE 'ℹ️  User already has an employee record. Role updated to admin.';
END $$;

-- ============================================
-- QUICK VERSION (if you already have the UUID):
-- ============================================
-- Just replace USER_UUID_HERE with the actual UUID and uncomment:

/*
INSERT INTO users (id, email, full_name, created_at)
VALUES ('USER_UUID_HERE', 'leeztruestyles44@gmail.com', 'Admin User', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO employees (user_id, role, employee_code, created_at)
VALUES ('USER_UUID_HERE', 'admin', 'EMP-001', NOW())
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
*/













