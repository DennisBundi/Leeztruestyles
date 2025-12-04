-- ============================================
-- DIRECT ADMIN ACCOUNT CREATION SQL
-- For: leeztruestyles44@gmail.com
-- ============================================
--
-- STEP 1: Create user in Supabase Dashboard first:
--   1. Go to Authentication → Users
--   2. Click "Add user" → "Create new user"
--   3. Email: leeztruestyles44@gmail.com
--   4. Password: [create a secure password]
--   5. Check "Auto Confirm User"
--   6. Click "Create user"
--   7. Copy the User UUID (shown in the user list)
--
-- STEP 2: Replace 'YOUR_USER_UUID_HERE' below with the UUID from Step 1
-- STEP 3: Run this entire script in Supabase SQL Editor
-- ============================================

-- ⚠️ REPLACE THIS UUID WITH THE ACTUAL UUID FROM SUPABASE AUTH → USERS
-- UUID format: 550e8400-e29b-41d4-a716-446655440000
DO $$
DECLARE
  v_user_uuid UUID := 'YOUR_USER_UUID_HERE';  -- ⚠️ REPLACE THIS!
  v_employee_code VARCHAR(50);
BEGIN
  -- Generate unique employee code
  v_employee_code := 'EMP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  
  -- Create user profile
  INSERT INTO users (id, email, full_name, created_at)
  VALUES (v_user_uuid, 'leeztruestyles44@gmail.com', 'Admin User', NOW())
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(users.full_name, EXCLUDED.full_name);
  
  -- Create employee record with admin role
  INSERT INTO employees (user_id, role, employee_code, created_at)
  VALUES (v_user_uuid, 'admin', v_employee_code, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    role = 'admin',
    employee_code = COALESCE(employees.employee_code, EXCLUDED.employee_code);
  
  -- Success message
  RAISE NOTICE '✅ Admin account created successfully!';
  RAISE NOTICE '   Email: leeztruestyles44@gmail.com';
  RAISE NOTICE '   Employee Code: %', v_employee_code;
  RAISE NOTICE '   Role: admin';
  
EXCEPTION
  WHEN invalid_text_representation THEN
    RAISE EXCEPTION '❌ Error: Invalid UUID format. Please replace YOUR_USER_UUID_HERE with the actual UUID from Supabase Auth → Users';
  WHEN foreign_key_violation THEN
    RAISE EXCEPTION '❌ Error: User does not exist in auth.users. Please create the user in Authentication → Users first, then copy the UUID.';
  WHEN OTHERS THEN
    RAISE EXCEPTION '❌ Error: %', SQLERRM;
END $$;

-- Verify the admin account was created
SELECT 
  '✅ Verification' as status,
  u.email,
  u.full_name,
  e.role,
  e.employee_code,
  e.created_at as account_created
FROM users u
JOIN employees e ON u.id = e.user_id
WHERE u.email = 'leeztruestyles44@gmail.com';



