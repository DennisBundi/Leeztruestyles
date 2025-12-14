# Troubleshooting "Auth session missing!" Error

## The Problem
After signing in, you see "Auth session missing!" when trying to access the admin dashboard. This means the server-side can't read your session cookies.

## Quick Fix Steps

### Step 1: Verify RLS Policies Are Fixed
Run this in Supabase SQL Editor:
```sql
-- Drop and recreate employees policies
DROP POLICY IF EXISTS "Only admins can view employees" ON employees;
DROP POLICY IF EXISTS "Users can view own employee record" ON employees;
DROP POLICY IF EXISTS "Authenticated users can view all employees" ON employees;

CREATE POLICY "Users can view own employee record"
  ON employees FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view all employees"
  ON employees FOR SELECT
  USING (auth.uid() IS NOT NULL);
```

### Step 2: Clear Browser Data
1. Open browser DevTools (F12)
2. Go to Application/Storage tab
3. Clear all cookies for localhost:3000
4. Clear localStorage
5. Close and reopen browser (or use incognito)

### Step 3: Restart Dev Server
```bash
# Stop server (Ctrl+C)
npm run dev
```

### Step 4: Sign In Again
1. Go to `/signin`
2. Sign in with `leeztruestyles44@gmail.com`
3. Wait for redirect (don't click anything)
4. If it redirects to home, manually go to `/dashboard`

### Step 5: If Still Not Working
Try accessing `/test-session` after signing in to see if the server can read your session.

## Alternative: Manual Dashboard Access
If automatic redirect doesn't work:
1. Sign in successfully
2. Manually navigate to: `http://localhost:3000/dashboard`
3. The middleware should refresh your session

## Common Causes
- Cookies not being set properly
- Middleware not running
- RLS policies blocking role check
- Session expired or invalid











