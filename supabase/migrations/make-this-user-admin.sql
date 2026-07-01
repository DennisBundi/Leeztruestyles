-- ============================================
-- MAKE USER ADMIN
-- User ID: b56f74fb-61d0-4aa8-bc1b-1854c73def6b
-- ============================================
-- Just run this script in Supabase SQL Editor
-- ============================================

-- Step 1: Create/update user profile
INSERT INTO users (id, email, full_name, created_at)
SELECT 
  id,
  email,
  COALESCE((SELECT full_name FROM users WHERE id = 'b56f74fb-61d0-4aa8-bc1b-1854c73def6b'), 'Admin User'),
  NOW()
FROM auth.users
WHERE id = 'b56f74fb-61d0-4aa8-bc1b-1854c73def6b'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = COALESCE(users.full_name, EXCLUDED.full_name);

-- Step 2: Check if employee record exists and update or insert
DO $$
DECLARE
  existing_employee_id UUID;
  existing_employee_code VARCHAR(50);
  new_employee_code VARCHAR(50);
BEGIN
  -- Check if employee record exists
  SELECT id, employee_code INTO existing_employee_id, existing_employee_code
  FROM employees
  WHERE user_id = 'b56f74fb-61d0-4aa8-bc1b-1854c73def6b'
  LIMIT 1;
  
  IF existing_employee_id IS NOT NULL THEN
    -- Update existing employee record
    UPDATE employees
    SET role = 'admin',
        employee_code = COALESCE(existing_employee_code, 'EMP-' || TO_CHAR(EXTRACT(EPOCH FROM NOW())::BIGINT, 'FM999999'))
    WHERE id = existing_employee_id;
    RAISE NOTICE 'Updated existing employee record to admin';
  ELSE
    -- Create new employee record
    new_employee_code := 'EMP-' || TO_CHAR(EXTRACT(EPOCH FROM NOW())::BIGINT, 'FM999999');
    INSERT INTO employees (user_id, role, employee_code, created_at)
    VALUES ('b56f74fb-61d0-4aa8-bc1b-1854c73def6b', 'admin', new_employee_code, NOW());
    RAISE NOTICE 'Created new employee record with admin role';
  END IF;
END $$;

-- Step 3: Verify the admin account was created
SELECT 
  u.id,
  u.email,
  u.full_name,
  e.role,
  e.employee_code,
  e.created_at as admin_created_at
FROM users u
LEFT JOIN employees e ON u.id = e.user_id
WHERE u.id = 'b56f74fb-61d0-4aa8-bc1b-1854c73def6b';

-- ============================================
-- ✅ Done! The user is now an admin.
-- They should sign out and sign back in to access the admin dashboard.
-- ============================================

