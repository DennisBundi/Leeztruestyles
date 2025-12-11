# Check Supabase Configuration

If users are not being created in Supabase, follow these steps:

## Step 1: Verify Environment Variables

1. Open your `.env.local` file in the project root
2. Make sure you have:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
3. **Important**: 
   - These should NOT be set to `placeholder`
   - No extra spaces before or after the values
   - The URL should start with `https://`

## Step 2: Test Supabase Connection

1. Visit: `http://localhost:3000/api/auth/test-supabase`
2. This will show you if Supabase is properly configured
3. Look for:
   - `configured: true` - means env vars are set
   - `connection: Success` - means Supabase is reachable

## Step 3: Check Browser Console

1. Open Developer Tools (F12)
2. Go to Console tab
3. Try signing up again
4. Look for error messages that mention:
   - "Supabase is not configured"
   - "Invalid Supabase URL"
   - Any network errors

## Step 4: Restart Dev Server

After changing `.env.local`:
1. Stop the dev server (Ctrl+C)
2. Run `npm run dev` again
3. Environment variables are only loaded when the server starts

## Step 5: Verify in Supabase Dashboard

1. Go to your Supabase project dashboard
2. Click **Authentication** → **Users**
3. Check if the user appears there
4. If not, the signup is failing before reaching Supabase

## Common Issues:

### Issue: "Supabase is not configured" error
**Solution**: Check `.env.local` file exists and has correct values

### Issue: No error but user not created
**Solution**: 
- Check browser console for errors
- Verify Supabase project is active (not paused)
- Check Supabase dashboard for any service issues

### Issue: Environment variables not loading
**Solution**:
- Make sure file is named exactly `.env.local` (not `.env` or `.env.local.txt`)
- File should be in project root (same folder as `package.json`)
- Restart dev server after changes

## Quick Test:

Run this in your browser console on the signup page:
```javascript
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
```

If it shows `undefined` or `placeholder`, your environment variables aren't loading.








