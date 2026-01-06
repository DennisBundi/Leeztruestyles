# Fix Session and RLS Issues

## Issues Found

1. **RLS Policy Blocking Employee Creation** ✅ FIXED
   - Error: `new row violates row-level security policy for table "employees"`
   - Solution: Use service role client to bypass RLS for admin employee creation

2. **Cookies Present But Session Not Read** ⚠️ NEEDS ATTENTION
   - Cookies are present: `sb-pklbqruulnpalzxurznr-auth-token`
   - But `getUser()` and `getSession()` return "Auth session missing!"
   - Possible causes:
     - Old cookies from different Supabase project (`sb-zpquhohxylsqscfxocty-auth-token`)
     - Cookies not properly formatted
     - Supabase URL mismatch

## Fixes Applied

### 1. Created Admin Client (`src/lib/supabase/admin.ts`)
- Uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS
- Used for creating/updating admin employees

### 2. Updated Server Action (`src/lib/actions/auth.ts`)
- Uses admin client for employee creation (bypasses RLS)
- Added session verification after sign-in

## Remaining Issue: Cookie Reading

The cookies are being set but not read. This could be because:

1. **Old cookies from different project**: There are cookies from `zpquhohxylsqscfxocty` project
2. **Cookie format issue**: Cookies might not be in the format Supabase expects
3. **URL mismatch**: The Supabase URL in env might not match the cookie project

## Next Steps to Debug

1. **Clear all Supabase cookies** in browser
2. **Verify Supabase URL** matches the project ID in cookies
3. **Check if cookies are being set correctly** in server action response

## Quick Fix: Clear Old Cookies

The user should:
1. Open browser DevTools → Application → Cookies
2. Delete all cookies starting with `sb-`
3. Try signing in again

This will remove the old project cookies that might be interfering.

