# 🚀 Production Deployment Guide

## Common Issues When Deploying to Production

### Issue 1: Missing Environment Variables ⚠️ (MOST COMMON)

**Problem**: Your `.env.local` file is NOT pushed to production. You must set environment variables in your deployment platform.

**Solution**: Add all environment variables to your deployment platform:

#### For Vercel:
1. Go to your project on [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your project → **Settings** → **Environment Variables**
3. Add each variable from your `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=https://your-domain.com
PAYSTACK_SECRET_KEY=your_paystack_secret
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=your_paystack_public_key
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_id
WHATSAPP_ACCESS_TOKEN=your_whatsapp_token
NEXT_PUBLIC_WHATSAPP_BUSINESS_PHONE=your_phone
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_secret
```

4. **Important**: Make sure to set `NEXT_PUBLIC_APP_URL` to your production URL (e.g., `https://leeztruestyles.com`)
5. After adding variables, **redeploy** your project

#### For Netlify:
1. Go to your project on [Netlify Dashboard](https://app.netlify.com)
2. Click on your project → **Site configuration** → **Environment variables**
3. Add all variables as above
4. Redeploy

#### For Other Platforms:
- Check your platform's documentation for setting environment variables
- Usually found in: Settings → Environment Variables or Config

---

### Issue 2: Static Generation Errors

**Problem**: Next.js tries to statically generate pages that use dynamic features (cookies, search params, etc.)

**Solution**: Mark dynamic routes properly. Check if your API routes and pages have:

```typescript
// For API routes that use cookies
export const dynamic = 'force-dynamic';

// For pages that use cookies
export const dynamic = 'force-dynamic';
```

---

### Issue 3: Build Errors in Production

**Problem**: Production build might fail due to:
- Type errors
- Missing dependencies
- Environment variable issues

**Solution**: 
1. Test build locally first: `npm run build`
2. Check build logs in your deployment platform
3. Fix any errors shown in the logs

---

### Issue 4: Runtime Errors (toLocaleString, null values)

**Problem**: Product data might be null/undefined in production if:
- Supabase connection fails
- Environment variables are missing
- Database queries fail

**Solution**: 
1. Verify Supabase connection in production
2. Check browser console for specific errors
3. Ensure all environment variables are set correctly
4. Check Supabase project is active (not paused)

---

## Step-by-Step Deployment Checklist

### Before Deploying:
- [ ] Test build locally: `npm run build`
- [ ] Verify all environment variables are documented
- [ ] Check `.gitignore` includes `.env.local` (should NOT be committed)

### During Deployment:
- [ ] Set all environment variables in deployment platform
- [ ] Set `NEXT_PUBLIC_APP_URL` to production URL
- [ ] Verify Supabase project is active
- [ ] Check deployment logs for errors

### After Deployment:
- [ ] Visit your production URL
- [ ] Check browser console (F12) for errors
- [ ] Test key features:
  - [ ] Homepage loads
  - [ ] Products display
  - [ ] Login/signup works
  - [ ] API routes respond

---

## Quick Fixes

### If you see "Supabase is not configured":
→ Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to production environment

### If you see "Cannot read properties of null":
→ Check Supabase connection and ensure products exist in database

### If pages show "500 Error":
→ Check deployment logs and verify all environment variables are set

### If build fails:
→ Run `npm run build` locally to see the exact error, then fix it

---

## Need Help?

1. **Check Deployment Logs**: Look at your platform's deployment logs for specific errors
2. **Browser Console**: Open F12 → Console tab to see runtime errors
3. **Network Tab**: Check if API calls are failing (F12 → Network tab)

---

## Environment Variables Reference

**Required for basic functionality:**
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `NEXT_PUBLIC_APP_URL` - Your production URL (e.g., `https://leeztruestyles.com`)

**Required for admin features:**
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

**Optional (for specific features):**
- `PAYSTACK_SECRET_KEY` - For payments
- `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` - For payments
- `WHATSAPP_*` - For WhatsApp integration
- `GOOGLE_*` - For Google OAuth

---

**Remember**: Environment variables with `NEXT_PUBLIC_` prefix are exposed to the browser. Never put secrets in those!


