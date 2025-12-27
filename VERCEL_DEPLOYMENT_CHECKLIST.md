# Vercel Deployment Checklist

Use this checklist to fix the ERR_FAILED error on your Vercel deployment.

## Step 1: Check Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Select your project: **leeztruestyles**
3. Click on **"Deployments"** tab
4. Check the latest deployment:
   - ✅ Is it showing "Ready" or "Error"?
   - ✅ If Error, click on it to see build logs
   - ✅ Copy any error messages you see

## Step 2: Verify Environment Variables

Go to: **Project → Settings → Environment Variables**

### Required Variables (Minimum):

Add these if missing:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_APP_URL=https://leeztruestyles.vercel.app
```

### Important Notes:

- ⚠️ `NEXT_PUBLIC_APP_URL` must be set to your production URL: `https://leeztruestyles.vercel.app`
- ⚠️ Make sure to select **"Production"** environment when adding variables
- ⚠️ After adding variables, you MUST redeploy

### Optional Variables (for full functionality):

```
PAYSTACK_SECRET_KEY=your_paystack_secret_key
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=your_paystack_public_key
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
NEXT_PUBLIC_WHATSAPP_BUSINESS_PHONE=your_business_phone
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

## Step 3: Verify Project Settings

Go to: **Project → Settings → General**

### Check:

- ✅ **Framework Preset**: Should be "Next.js"
- ✅ **Build Command**: Should be `npm run build` (or leave empty for auto-detection)
- ✅ **Output Directory**: Should be `.next` (or leave empty for auto-detection)
- ✅ **Install Command**: Should be `npm install` (or leave empty for auto-detection)
- ✅ **Node.js Version**: Should be 18.x or 20.x (check in "General" settings)

## Step 4: Check Build Logs

1. Go to **Deployments** tab
2. Click on the latest deployment
3. Check the **Build Logs**:
   - Look for red error messages
   - Common errors:
     - "Missing environment variable"
     - "Build failed"
     - "TypeScript errors"
     - "Module not found"

## Step 5: Redeploy

After fixing environment variables:

1. Go to **Deployments** tab
2. Click the **"..."** menu on the latest deployment
3. Select **"Redeploy"**
4. Or push a new commit to trigger auto-deployment

## Step 6: Verify Deployment

After redeployment:

1. Wait for build to complete (check status in Deployments tab)
2. Visit: https://leeztruestyles.vercel.app
3. Check browser console (F12 → Console) for errors
4. Test key pages:
   - Homepage loads
   - Products page works
   - No console errors

## Common Issues & Solutions

### Issue: "Build Failed"

**Solution**:
- Check build logs for specific error
- Run `npm run build` locally to reproduce
- Fix errors locally, commit, and push

### Issue: "Missing Environment Variable"

**Solution**:
- Add missing variable in Vercel Settings → Environment Variables
- Make sure to select "Production" environment
- Redeploy after adding

### Issue: "Cannot connect to Supabase"

**Solution**:
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct
- Check Supabase project is active (not paused)
- Verify Supabase project URL format: `https://xxxxx.supabase.co`

### Issue: "ERR_FAILED" in Browser

**Possible Causes**:
1. Build failed - check Vercel deployment logs
2. Missing environment variables - add them in Vercel
3. Site not deployed - check if deployment completed
4. DNS issue - wait a few minutes after deployment

## Quick Fix Steps

1. ✅ Add all environment variables to Vercel
2. ✅ Set `NEXT_PUBLIC_APP_URL=https://leeztruestyles.vercel.app`
3. ✅ Redeploy the project
4. ✅ Check deployment status
5. ✅ Visit site and verify it loads

## Need Help?

If the issue persists:
1. Check Vercel deployment logs for specific error
2. Run `npm run build` locally to test
3. Compare local `.env.local` with Vercel environment variables
4. Verify all required variables are present

