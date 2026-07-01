-- ============================================
-- MANUAL ADMIN EMPLOYEE RECORD CREATION
-- ============================================
-- Run this in Supabase SQL Editor if admin role assignment fails
-- Replace 'YOUR_USER_ID_HERE' with the actual user UUID from the users table
-- ============================================

-- Step 1: Find the user ID (run this first to get the UUID)
SELECT id, email, full_name 
FROM users 
WHERE email = 'leeztruestyles44@gmail.com';

-- Step 2: Create the employee record (replace 'YOUR_USER_ID_HERE' with the UUID from Step 1)
-- This will work even if RLS policies are strict because we're using SQL Editor (service role)
INSERT INTO employees (user_id, role, employee_code, created_at)
VALUES (
  'YOUR_USER_ID_HERE',  -- Replace with actual UUID from Step 1
  'admin',
  'EMP-' || TO_CHAR(EXTRACT(EPOCH FROM NOW())::bigint, 'FM999999'),
  NOW()
)
ON CONFLICT (user_id) DO UPDATE
SET role = 'admin',
    updated_at = NOW();

-- Step 3: Verify the employee record was created
SELECT e.*, u.email, u.full_name
FROM employees e
JOIN users u ON e.user_id = u.id
WHERE u.email = 'leeztruestyles44@gmail.com';

