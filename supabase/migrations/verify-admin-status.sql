-- ============================================
-- VERIFY ADMIN STATUS FOR USER
-- User ID: b56f74fb-61d0-4aa8-bc1b-1854c73def6b
-- ============================================
-- Run this to check if the user has admin access
-- ============================================

-- Check 1: User exists in auth.users
SELECT 
  'Auth User Check' as check_type,
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE id = 'b56f74fb-61d0-4aa8-bc1b-1854c73def6b';

-- Check 2: User profile exists in users table
SELECT 
  'User Profile Check' as check_type,
  id,
  email,
  full_name,
  created_at
FROM users
WHERE id = 'b56f74fb-61d0-4aa8-bc1b-1854c73def6b';

-- Check 3: Employee record with admin role
SELECT 
  'Employee Record Check' as check_type,
  id,
  user_id,
  role,
  employee_code,
  created_at
FROM employees
WHERE user_id = 'b56f74fb-61d0-4aa8-bc1b-1854c73def6b';

-- Check 4: Combined view
SELECT 
  u.id,
  u.email,
  u.full_name,
  e.role,
  e.employee_code,
  CASE 
    WHEN u.id IS NULL THEN '❌ No user profile'
    WHEN e.id IS NULL THEN '❌ No employee record'
    WHEN e.role != 'admin' THEN '❌ Not admin (role: ' || e.role || ')'
    ELSE '✅ Admin access granted'
  END as status
FROM users u
LEFT JOIN employees e ON u.id = e.user_id
WHERE u.id = 'b56f74fb-61d0-4aa8-bc1b-1854c73def6b';

