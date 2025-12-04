# Quick Supabase Setup Guide

## Step 1: Create a Supabase Account

1. Go to https://supabase.com
2. Click "Start your project" or "Sign up"
3. Sign up with GitHub, Google, or email (it's free!)

## Step 2: Create a New Project

1. Click "New Project"
2. Fill in:
   - **Name**: Leeztruestyles (or any name you prefer)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to Kenya (e.g., `ap-southeast-1`)
3. Click "Create new project"
4. Wait 2-3 minutes for setup to complete

## Step 3: Get Your API Keys

1. In your Supabase project dashboard, click **Settings** (gear icon) in the left sidebar
2. Click **API** under Project Settings
3. You'll see:
   - **Project URL** - Copy this (looks like: `https://xxxxx.supabase.co`)
   - **anon public key** - Copy this (long string starting with `eyJ...`)

## Step 4: Add Keys to Your Project

1. In your project root, create or edit `.env.local` file
2. Add these lines (replace with your actual values):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. Save the file

## Step 5: Set Up Database Tables

1. In Supabase dashboard, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Open `supabase/schema.sql` from your project
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **Run** (or press Ctrl+Enter)
7. Wait for "Success. No rows returned"

8. Now open `supabase/rls-policies.sql`
9. Copy the entire contents
10. Paste into a new query in SQL Editor
11. Click **Run**

## Step 6: Restart Your Dev Server

1. Stop the current server (Ctrl+C in terminal)
2. Run `npm run dev` again
3. The error should be gone!

## Quick Test

After setup, you should be able to:
- Visit http://localhost:3000 without errors
- See the homepage
- Access `/products` page (will be empty until you add products)

## Need Help?

- Supabase Docs: https://supabase.com/docs
- Your project dashboard: https://supabase.com/dashboard

