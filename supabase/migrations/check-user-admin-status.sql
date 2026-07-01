-- ============================================
-- CHECK USER ADMIN STATUS
-- ============================================
-- Run this to verify if a user has admin access
-- Replace the email with the actual user email
-- ============================================

-- Replace with the actual email
\set user_email 'leeztruestyles44@gmail.com'

-- Check 1: User in auth.users
SELECT 
  'Auth User' as check_type,
  id,
  email,
  email_confirmed_at IS NOT NULL as email_confirmed
FROM auth.users
WHERE email = :'user_email';

-- Check 2: User profile
SELECT 
  'User Profile' as check_type,
  id,
  email,
  full_name
FROM users
WHERE email = :'user_email';

-- Check 3: Employee record
SELECT 
  'Employee Record' as check_type,
  id,
  user_id,
  role,
  employee_code,
  created_at
FROM employees
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = :'user_email'
);

-- Check 4: Combined status
SELECT 
  u.email,
  u.full_name,
  e.role,
  e.employee_code,
  CASE 
    WHEN u.id IS NULL THEN '❌ No user profile'
    WHEN e.id IS NULL THEN '❌ No employee record - NOT ADMIN'
    WHEN e.role = 'admin' THEN '✅ ADMIN - Should redirect to dashboard'
    WHEN e.role = 'manager' THEN '✅ MANAGER - Should redirect to dashboard'
    WHEN e.role = 'seller' THEN '⚠️ SELLER - Will redirect to home'
    ELSE '❓ Unknown role: ' || e.role
  END as status
FROM users u
LEFT JOIN employees e ON u.id = e.user_id
WHERE u.email = :'user_email';

