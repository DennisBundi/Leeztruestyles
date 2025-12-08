# Fix Admin Dashboard - Product & Category Creation

## Problem
You're getting a **500 error** when trying to create products or categories because:
1. Your Supabase database might be missing required columns
2. You might not have an **employee record** with admin role
3. RLS (Row Level Security) policies require you to be in the employees table

## Solution Steps

### Step 1: Run Database Migrations

Go to your **Supabase Dashboard** → **SQL Editor** and run these scripts **in order**:

#### 1.1 Add Missing Product Columns
```sql
-- Add missing columns to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10, 2);

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' 
CHECK (status IN ('active', 'inactive'));

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_flash_sale BOOLEAN DEFAULT FALSE;

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS flash_sale_start TIMESTAMP WITH TIME ZONE;

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS flash_sale_end TIMESTAMP WITH TIME ZONE;
```

#### 1.2 Add Inventory RLS Policy
```sql
CREATE POLICY IF NOT EXISTS "Admins and managers can insert inventory"
  ON inventory FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );
```

### Step 2: Create Your Admin Employee Record

#### 2.1 Check if you have an employee record
```sql
SELECT 
  u.id as user_id,
  u.email,
  e.id as employee_id,
  e.role,
  e.employee_code
FROM auth.users u
LEFT JOIN employees e ON e.user_id = u.id
WHERE u.email = 'YOUR_EMAIL_HERE'  -- Replace with your email
```

#### 2.2 If NO employee record exists, create one
**IMPORTANT:** Replace `your-email@example.com` with **your actual email** you use to log in!

```sql
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get your user ID
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'your-email@example.com';  -- << CHANGE THIS!
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found! Check your email address.';
  END IF;
  
  -- Create admin employee record
  INSERT INTO employees (user_id, role, employee_code)
  VALUES (v_user_id, 'admin', 'ADMIN-001')
  ON CONFLICT (user_id) DO NOTHING;
  
  RAISE NOTICE 'Admin employee record created!';
END $$;
```

#### 2.3 Verify employee was created
```sql
SELECT 
  u.email,
  e.role,
  e.employee_code,
  e.created_at
FROM employees e
JOIN auth.users u ON u.id = e.user_id
WHERE u.email = 'your-email@example.com';  -- << CHANGE THIS!
```

You should see your email with role = 'admin' ✅

### Step 3: Test Category Creation

1. **Refresh your admin dashboard** page (hard refresh: Ctrl+Shift+R or Cmd+Shift+R)
2. **Log out and log back in** to refresh your session
3. Try creating a new category again

### Step 4: Test Product Creation

1. Make sure you have at least one category created
2. Try creating a new product
3. Upload multiple images if you want

## Quick Verification Checklist

- [ ] Ran Step 1.1 (Add product columns)
- [ ] Ran Step 1.2 (Add inventory RLS policy)
- [ ] Ran Step 2.2 (Create employee record with YOUR email)
- [ ] Verified Step 2.3 shows your admin record
- [ ] Logged out and back in
- [ ] Tried creating a category ✅
- [ ] Tried creating a product ✅

## Still Having Issues?

If you still get errors:
1. Check the **browser console** (F12 → Console tab)
2. Check the **terminal** where `npm run dev` is running
3. Share the error messages - they should now be more detailed!

The logs will now show:
- "Category creation request body: {...}"
- "Validated category data: {...}"
- Any specific validation or database errors
