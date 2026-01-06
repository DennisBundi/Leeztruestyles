# How to Make a User Admin in Supabase

There are several ways to make a user an admin. Choose the method that works best for you.

## Method 1: Using SQL Script (Recommended)

### Step 1: Find the User's Email or UUID

1. Go to your Supabase Dashboard
2. Click **Authentication** → **Users**
3. Find the user you want to make admin
4. Copy either:
   - Their **Email address**, OR
   - Their **User UUID** (the long ID)

### Step 2: Run SQL Script

1. Go to **SQL Editor** in Supabase Dashboard
2. Click **"New query"**
3. Open `scripts/make-user-admin.sql` from your project
4. Replace `'USER_EMAIL_HERE'` with the actual email address
5. Click **"Run"** (or press `Ctrl+Enter`)

The script will:
- ✅ Find the user by email
- ✅ Create/update their profile in the `users` table
- ✅ Create/update their employee record with `admin` role
- ✅ Show you a verification query

## Method 2: Quick SQL (If you know the email)

1. Go to **SQL Editor** in Supabase
2. Open `scripts/make-user-admin-by-email.sql`
3. Replace `'user@example.com'` with the actual email (appears 3 times)
4. Run the script

## Method 3: Manual SQL (If you know the UUID)

If you have the User UUID, you can run this directly:

```sql
-- Replace 'USER_UUID_HERE' with the actual UUID
-- Replace 'user@example.com' with the actual email

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
```

## Method 4: Via API (If user is signed in)

If the user is already signed in and their email is in the admin emails list, they can call:

```bash
POST /api/auth/assign-admin
```

This will automatically assign them the admin role.

## Verify Admin Access

After running any of the above methods, verify the user is an admin:

```sql
SELECT 
  u.email,
  u.full_name,
  e.role,
  e.employee_code,
  e.created_at
FROM users u
LEFT JOIN employees e ON u.id = e.user_id
WHERE u.email = 'user@example.com'; -- Replace with actual email
```

You should see `role = 'admin'` in the results.

## Troubleshooting

### Error: "User not found"
- Make sure the user exists in **Authentication → Users**
- Check that you're using the correct email address (case-sensitive)
- If the user doesn't exist, create them first in Authentication → Users

### Error: "Permission denied"
- Make sure you're running the SQL as a user with proper permissions
- Check that RLS policies allow inserts/updates to `users` and `employees` tables

### User still can't access admin dashboard
- Make sure the user signs out and signs back in
- Check that the `employees` table has a record with `role = 'admin'`
- Verify the user's email matches exactly (case-sensitive)

## Current Admin Emails

The following emails are automatically assigned admin role on signup/signin:
- `leeztruestyles44@gmail.com`

To add more emails to the auto-admin list, edit `src/app/api/auth/assign-admin/route.ts`.

