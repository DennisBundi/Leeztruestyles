# Troubleshooting Sign Up Issues

If you created an account but it's not showing in Supabase, follow these steps:

## Step 1: Check Supabase Configuration

1. Open your `.env.local` file in the project root
2. Verify you have:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
3. Make sure these are NOT set to `placeholder`
4. Restart your dev server after making changes

## Step 2: Check Browser Console

1. Open your browser's Developer Tools (F12)
2. Go to the Console tab
3. Try signing up again
4. Look for any error messages
5. Check the Network tab for failed requests

## Step 3: Check Supabase Dashboard

1. Go to your Supabase project dashboard
2. Click **Authentication** → **Users**
3. Check if `leeztruestyles44@gmail.com` appears in the list
4. If it does, copy the **User UUID**

## Step 4: Create Admin Account Manually

### Option A: User Already Exists in Supabase

If the user exists in Supabase Auth but doesn't have admin access:

1. Go to Supabase → **SQL Editor**
2. Run the first query from `scripts/check-and-create-admin.sql` to find the UUID
3. Copy the UUID
4. Run the second part of the script, replacing `USER_UUID_FROM_ABOVE` with the actual UUID

### Option B: User Doesn't Exist - Create in Supabase Dashboard

1. Go to Supabase → **Authentication** → **Users**
2. Click **"Add user"** → **"Create new user"**
3. Enter:
   - Email: `leeztruestyles44@gmail.com`
   - Password: (create a secure password)
   - **Auto Confirm User**: ✅ Check this
4. Click **"Create user"**
5. Copy the **User UUID**
6. Go to **SQL Editor** and run:

```sql
-- Replace 'YOUR_UUID_HERE' with the UUID from step 5
INSERT INTO users (id, email, full_name, created_at)
VALUES ('YOUR_UUID_HERE', 'leeztruestyles44@gmail.com', 'Admin User', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO employees (user_id, role, employee_code, created_at)
VALUES ('YOUR_UUID_HERE', 'admin', 'EMP-001', NOW())
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
```

## Step 5: Verify Admin Access

1. Sign in at `http://localhost:3000/signin` with:
   - Email: `leeztruestyles44@gmail.com`
   - Password: (the password you set)
2. Try accessing `http://localhost:3000/dashboard`
3. You should now have admin access!

## Common Issues

### "Supabase is not configured" error
- Check `.env.local` file exists and has correct values
- Restart dev server after changing `.env.local`
- Make sure no extra spaces in the environment variables

### "User already registered" error
- The user exists in Supabase Auth
- Just need to assign admin role (see Step 4)

### User created but can't access dashboard
- User needs admin role in `employees` table
- Run the SQL script from Step 4

### No errors but user not in Supabase
- Check Supabase project is active
- Verify API keys are correct
- Check Supabase dashboard for any service issues

## Still Having Issues?

1. Check the browser console for detailed error messages
2. Verify Supabase project is active and not paused
3. Make sure you've run `supabase/COMPLETE_SETUP.sql` to create all tables
4. Check that RLS policies allow user creation











