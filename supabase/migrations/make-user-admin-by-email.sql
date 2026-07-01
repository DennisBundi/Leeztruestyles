-- ============================================
-- QUICK: MAKE USER ADMIN BY EMAIL
-- ============================================
-- Simple version - just replace the email and run
-- ============================================

-- Replace 'user@example.com' with the actual email
WITH user_data AS (
  SELECT id, email
  FROM auth.users
  WHERE email = 'user@example.com' -- ⬅️ CHANGE THIS EMAIL
)
INSERT INTO users (id, email, full_name, created_at)
SELECT id, email, 'Admin User', NOW()
FROM user_data
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = COALESCE(users.full_name, EXCLUDED.full_name);

-- Create/update employee record with admin role
WITH user_data AS (
  SELECT id
  FROM auth.users
  WHERE email = 'user@example.com' -- ⬅️ CHANGE THIS EMAIL
)
INSERT INTO employees (user_id, role, employee_code, created_at)
SELECT 
  id,
  'admin',
  'EMP-' || TO_CHAR(EXTRACT(EPOCH FROM NOW())::BIGINT, 'FM999999'),
  NOW()
FROM user_data
ON CONFLICT (user_id) DO UPDATE SET
  role = 'admin',
  employee_code = COALESCE(employees.employee_code, EXCLUDED.employee_code);

-- Verify
SELECT 
  u.email,
  u.full_name,
  e.role,
  e.employee_code
FROM users u
LEFT JOIN employees e ON u.id = e.user_id
WHERE u.email = 'user@example.com'; -- ⬅️ CHANGE THIS EMAIL

