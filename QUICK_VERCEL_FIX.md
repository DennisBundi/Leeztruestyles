# Quick Fix for Vercel ERR_FAILED Error

## Most Likely Cause: Missing Environment Variables

The `ERR_FAILED` error usually means the build succeeded but the app can't run because required environment variables are missing.

## Quick Fix (5 minutes)

### Step 1: Go to Vercel Dashboard
1. Visit: https://vercel.com/dashboard
2. Click on your project: **leeztruestyles**

### Step 2: Add Environment Variables
1. Go to: **Settings** → **Environment Variables**
2. Click **"Add New"**
3. Add these **REQUIRED** variables (one at a time):

```
NEXT_PUBLIC_SUPABASE_URL
```
Value: Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)

```
NEXT_PUBLIC_SUPABASE_ANON_KEY
```
Value: Your Supabase anon/public key

```
SUPABASE_SERVICE_ROLE_KEY
```
Value: Your Supabase service role key (keep this secret!)

```
NEXT_PUBLIC_APP_URL
```
Value: `https://leeztruestyles.vercel.app`

4. For each variable:
   - Select **"Production"** environment
   - Click **"Save"**

### Step 3: Redeploy
1. Go to **"Deployments"** tab
2. Click the **"..."** menu (three dots) on the latest deployment
3. Click **"Redeploy"**
4. Wait for deployment to complete (2-5 minutes)

### Step 4: Verify
1. Visit: https://leeztruestyles.vercel.app
2. The site should now load!

## If It Still Doesn't Work

### Check Build Logs
1. Go to **Deployments** tab
2. Click on the latest deployment
3. Check **"Build Logs"** for errors
4. Look for specific error messages

### Common Errors:

**"Missing environment variable"**
→ Add the missing variable in Step 2 above

**"Build failed"**
→ Check the specific error in build logs
→ Run `npm run build` locally to reproduce

**"Cannot connect to Supabase"**
→ Verify Supabase URL and keys are correct
→ Check Supabase project is active (not paused)

## Where to Find Your Supabase Keys

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Go to: **Settings** → **API**
4. Copy:
   - **Project URL** → Use for `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → Use for `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → Use for `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

## Need More Help?

Check the detailed guide: `VERCEL_DEPLOYMENT_CHECKLIST.md`

