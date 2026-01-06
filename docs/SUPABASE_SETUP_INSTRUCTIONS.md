# Supabase Setup Instructions

## Step 1: Create .env.local File

Create a file named `.env.local` in your project root directory with the following content:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://pklbqruulnpalzxurznr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrbGJxcnV1bG5wYWx6eHVyem5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwOTYwOTYsImV4cCI6MjA3OTY3MjA5Nn0.bxRf0CsWhmm36C7V5icAwbeVzCOzkpxvN2Aa6vL_NXk
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrbGJxcnV1bG5wYWx6eHVyem5yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA5NjA5NiwiZXhwIjoyMDc5NjcyMDk2fQ.cXl1boBQGgEy-GSD-KYVZlDA4JIKAqqc4s3UsqcSbNk

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 2: Set Up Database in Supabase

1. Go to your Supabase project: https://supabase.com/dashboard/project/pklbqruulnpalzxurznr
2. Click **SQL Editor** in the left sidebar
3. Run these SQL files **IN ORDER**:

### a) Run schema.sql
1. Click **"New query"**
2. Open `supabase/schema.sql` from your project
3. Copy the entire contents
4. Paste into SQL Editor
5. Click **"Run"** (or press Ctrl+Enter)
6. Wait for success message

### b) Run schema-update.sql
1. Click **"New query"** again
2. Open `supabase/schema-update.sql` from your project
3. Copy the entire contents
4. Paste into SQL Editor
5. Click **"Run"**
6. Wait for success message

### c) Run rls-policies.sql
1. Click **"New query"** again
2. Open `supabase/rls-policies.sql` from your project
3. Copy the entire contents
4. Paste into SQL Editor
5. Click **"Run"**
6. Wait for success message

### d) Run migrate-dummy-data.sql
1. Click **"New query"** again
2. Open `supabase/migrate-dummy-data.sql` from your project
3. Copy the entire contents
4. Paste into SQL Editor
5. Click **"Run"**
6. Wait for success message

## Step 3: Set Up Storage Bucket

1. In Supabase dashboard, click **Storage** in the left sidebar
2. Click **"Create a new bucket"**
3. Name: `product-images`
4. Set to **Public bucket**
5. Click **"Create bucket"**

## Step 4: Restart Development Server

1. Stop your dev server (Ctrl+C)
2. Run:
   ```bash
   npm run dev
   ```

## Step 5: Verify Everything Works

1. Visit http://localhost:3000/home
2. You should see products from the database
3. Visit http://localhost:3000/dashboard (you'll need to create an admin user first)

## Creating Your First Admin User

1. Go to Supabase → **Authentication** → **Users**
2. Click **"Add user"** → **"Create new user"**
3. Enter your email and password
4. Copy the user's **UUID** (from the users table)
5. Go to **SQL Editor** and run:

```sql
-- Replace 'user-uuid-here' with the actual UUID from step 4
INSERT INTO employees (user_id, role, employee_code)
VALUES ('user-uuid-here', 'admin', 'EMP-001');
```

## Troubleshooting

- **"Invalid supabaseUrl"**: Make sure `.env.local` is in the project root and has no extra spaces
- **"Relation does not exist"**: Make sure you ran `schema.sql` first
- **Can't see products**: Make sure you ran `migrate-dummy-data.sql`
- **Permission denied**: Make sure you ran `rls-policies.sql`

