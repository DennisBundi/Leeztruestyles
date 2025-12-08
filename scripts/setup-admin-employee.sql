-- Check current user's employee status
SELECT 
  u.id as user_id,
  u.email,
  e.id as employee_id,
  e.role,
  e.employee_code
FROM auth.users u
LEFT JOIN employees e ON e.user_id = u.id
ORDER BY u.created_at DESC
LIMIT 5;

-- If you see your user but NO employee record, run this:
-- (Replace 'your-email@example.com' with your actual email)

-- Step 1: Get your user ID
DO $$
DECLARE
  v_user_id UUID;
  v_employee_exists BOOLEAN;
BEGIN
  -- Get the user ID for your email (CHANGE THIS EMAIL!)
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'your-email@example.com';  -- << CHANGE THIS!
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found with that email!';
  END IF;
  
  -- Check if employee record exists
  SELECT EXISTS(SELECT 1 FROM employees WHERE user_id = v_user_id) 
  INTO v_employee_exists;
  
  IF NOT v_employee_exists THEN
    -- Create employee record
    INSERT INTO employees (user_id, role, employee_code)
    VALUES (v_user_id, 'admin', 'ADMIN-001');
    
    RAISE NOTICE 'Employee record created successfully for user: %', v_user_id;
  ELSE
    RAISE NOTICE 'Employee record already exists for user: %', v_user_id;
  END IF;
END $$;

-- Verify the employee was created
SELECT 
  u.email,
  e.role,
  e.employee_code,
  e.created_at
FROM employees e
JOIN auth.users u ON u.id = e.user_id
WHERE u.email = 'your-email@example.com';  -- << CHANGE THIS!
