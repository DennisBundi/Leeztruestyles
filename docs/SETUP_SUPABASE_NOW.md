# Quick Supabase Setup - Step by Step

Follow these steps to integrate Supabase with your project:

## Step 1: Create .env.local File

Create a file named `.env.local` in your project root directory with the following content:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://pklbqruulnpalzxurznr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrbGJxcnV1bG5wYWx6eHVyem5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwOTYwOTYsImV4cCI6MjA3OTY3MjA5Nn0.bxRf0CsWhmm36C7V5icAwbeVzCOzkpxvN2Aa6vL_NXk
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrbGJxcnV1bG5wYWx6eHVyem5yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA5NjA5NiwiZXhwIjoyMDc5NjcyMDk2fQ.cXl1boBQGgEy-GSD-KYVZlDA4JIKAqqc4s3UsqcSbNk

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Paystack Configuration (optional - for later)
# PAYSTACK_SECRET_KEY=sb_secret_s7L1wBKfl96wwWLGHKpf9A_fhSs81VU
# NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=sb_publishable_PQn-_TOJXfxZyRoKJ_XDsQ_nHWjI5oX
```

**Important**: Make sure this file is in the root directory (same level as `package.json`)

## Step 2: Set Up Database in Supabase

1. Go to your Supabase project: https://supabase.com/dashboard/project/pklbqruulnpalzxurznr
2. Click **SQL Editor** in the left sidebar
3. Click **"New query"**

### 2a. Run Schema Script

1. Open `supabase/schema.sql` from your project folder
2. Copy the **entire contents**
3. Paste into the SQL Editor in Supabase
4. Click **"Run"** (or press `Ctrl+Enter`)
5. Wait for success message: **"Success. No rows returned"**

### 2b. Run Schema Update Script

1. Click **"New query"** again
2. Open `supabase/schema-update.sql` from your project folder
3. Copy the **entire contents**
4. Paste into the SQL Editor
5. Click **"Run"**
6. Wait for success message

### 2c. Run RLS Policies Script

1. Click **"New query"** again
2. Open `supabase/rls-policies.sql` from your project folder
3. Copy the **entire contents**
4. Paste into the SQL Editor
5. Click **"Run"**
6. Wait for success message

### 2d. Run Data Migration Script

1. Click **"New query"** again
2. Open `supabase/migrate-dummy-data.sql` from your project folder
3. Copy the **entire contents**
4. Paste into the SQL Editor
5. Click **"Run"**
6. You should see success messages for each INSERT

## Step 3: Set Up Storage Bucket

1. In Supabase dashboard, click **Storage** in the left sidebar
2. Click **"Create a new bucket"**
3. Name it: `product-images`
4. Set it to **Public bucket** (toggle ON)
5. Click **"Create bucket"**

## Step 4: Restart Your Dev Server

1. Stop your current dev server (press `Ctrl+C` in terminal)
2. Run:
   ```bash
   npm run dev
   ```
3. Visit http://localhost:3000

## Step 5: Verify Everything Works

- [ ] Visit http://localhost:3000/home - should show products
- [ ] Visit http://localhost:3000/products - should show product list
- [ ] Visit http://localhost:3000/dashboard - should work (may need to create admin user)
- [ ] Check Supabase → Table Editor - should see categories and products tables with data

## Step 6: Create Your First Admin User (Optional)

To access the admin dashboard:

1. Go to Supabase → **Authentication** → **Users**
2. Click **"Add user"** → **"Create new user"**
3. Enter your email and password
4. Copy the user's **UUID** (from the users table)
5. Go to **SQL Editor** and run:

```sql
-- Replace 'YOUR-USER-UUID-HERE' with the actual UUID from step 4
INSERT INTO employees (user_id, role, employee_code)
VALUES ('YOUR-USER-UUID-HERE', 'admin', 'EMP-001')
ON CONFLICT (user_id) DO NOTHING;
```

6. Sign in to your app with that email/password
7. You should now be able to access `/dashboard`

## Troubleshooting

### "Invalid supabaseUrl" Error
- Make sure `.env.local` is in the project root
- Check that there are no extra spaces in the file
- Restart dev server after creating/editing `.env.local`

### "Relation does not exist" Error
- Make sure you ran `schema.sql` first
- Check Supabase → Table Editor to verify tables exist

### Products Not Showing
- Make sure you ran `migrate-dummy-data.sql`
- Check Supabase → Table Editor → products table to see if data exists

### Can't Access Admin Dashboard
- Make sure you created an admin user (Step 6)
- Check that your user UUID exists in `employees` table with role `'admin'`

---

**That's it!** Your Supabase integration should now be complete. 🎉














