# Create Admin Account for Leeztruestyles

This guide will help you create an admin account with the email `leeztruestyles44@gmail.com`.

## Method 1: Using Supabase Dashboard (Recommended)

### Step 1: Create User in Supabase Auth

1. Go to your Supabase project dashboard
2. Click **Authentication** in the left sidebar
3. Click **Users** tab
4. Click **"Add user"** button (top right)
5. Select **"Create new user"**
6. Fill in:
   - **Email**: `leeztruestyles44@gmail.com`
   - **Password**: (create a strong password - you'll need this to sign in)
   - **Auto Confirm User**: ✅ Check this box (so you don't need to verify email)
7. Click **"Create user"**
8. **Important**: Copy the **User UUID** (it's displayed in the user list or user details)

### Step 2: Assign Admin Role

1. In Supabase dashboard, go to **SQL Editor**
2. Click **"New query"**
3. Copy and paste the SQL from `scripts/create-admin.sql`
4. **Replace `'USER_UUID_HERE'`** with the actual UUID you copied in Step 1
5. Click **"Run"** (or press `Ctrl+Enter`)
6. You should see a success message

### Step 3: Verify

1. Visit your app: `http://localhost:3000/dashboard`
2. Sign in with:
   - Email: `leeztruestyles44@gmail.com`
   - Password: (the password you created in Step 1)

---

## Method 2: Quick SQL Script

If you already have the user UUID, you can run this simplified SQL:

```sql
-- Replace 'YOUR_USER_UUID_HERE' with the actual UUID from Supabase Auth → Users

-- Create user profile
INSERT INTO users (id, email, full_name, created_at)
VALUES ('YOUR_USER_UUID_HERE', 'leeztruestyles44@gmail.com', 'Admin User', NOW())
ON CONFLICT (id) DO NOTHING;

-- Create employee record with admin role
INSERT INTO employees (user_id, role, employee_code, created_at)
VALUES ('YOUR_USER_UUID_HERE', 'admin', 'EMP-001', NOW())
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
```

---

## Troubleshooting

### "User does not exist" error
- Make sure you created the user in **Authentication → Users** first
- Double-check that the UUID is correct (copy-paste it, don't type it)

### "Invalid UUID format" error
- Make sure the UUID is wrapped in single quotes: `'uuid-here'`
- UUIDs look like: `550e8400-e29b-41d4-a716-446655440000`

### "Permission denied" error
- Make sure you ran `supabase/rls-policies.sql` to set up permissions
- The RLS policies allow admin operations

### Can't sign in
- Make sure the user was created in Authentication → Users
- Check that "Auto Confirm User" was checked when creating the user
- Try resetting the password in Supabase Auth dashboard

---

## What This Creates

- ✅ User account in Supabase Auth
- ✅ User profile in `users` table
- ✅ Employee record in `employees` table with `role = 'admin'`
- ✅ Access to admin dashboard at `/dashboard`
- ✅ Full permissions to manage products, orders, inventory, etc.

---

## Next Steps

After creating the admin account:
1. Sign in at `http://localhost:3000/dashboard`
2. You can now:
   - Add/edit products
   - View orders
   - Manage inventory
   - Add other employees
   - Access POS system









