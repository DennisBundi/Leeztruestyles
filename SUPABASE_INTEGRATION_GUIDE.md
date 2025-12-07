# Supabase Integration Guide for Leeztruestyles

This guide will walk you through everything you need to integrate Supabase into your project.

## 📋 What You Need

### 1. **Supabase Account** (Free)
- Sign up at https://supabase.com
- Free tier includes:
  - 500 MB database
  - 1 GB file storage
  - 2 GB bandwidth
  - Unlimited API requests

### 2. **Environment Variables**
You need these 3 keys from Supabase:
- `NEXT_PUBLIC_SUPABASE_URL` - Your project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for admin operations)

### 3. **Database Setup**
Two SQL files need to be run:
- `supabase/schema.sql` - Creates all tables
- `supabase/rls-policies.sql` - Sets up security policies

---

## 🚀 Step-by-Step Integration

### Step 1: Create Supabase Project

1. Go to https://supabase.com and sign up/login
2. Click **"New Project"**
3. Fill in:
   - **Name**: `Leeztruestyles` (or your preferred name)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to Kenya (e.g., `ap-southeast-1` or `eu-west-1`)
4. Click **"Create new project"**
5. Wait 2-3 minutes for setup to complete

### Step 2: Get Your API Keys

1. In your Supabase project dashboard, click **Settings** (⚙️ gear icon) in the left sidebar
2. Click **API** under Project Settings
3. You'll see three important values:

   **a) Project URL**
   - Looks like: `https://xxxxxxxxxxxxx.supabase.co`
   - Copy this → This is your `NEXT_PUBLIC_SUPABASE_URL`

   **b) anon public key**
   - Long string starting with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - Copy this → This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`

   **c) service_role key** (scroll down)
   - Also a long string starting with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - ⚠️ **Keep this secret!** Never expose it in client-side code
   - Copy this → This is your `SUPABASE_SERVICE_ROLE_KEY`

### Step 3: Create Environment File

1. In your project root directory, create a file named `.env.local`
2. Add the following content (replace with your actual values):

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Other services (can add later)
# PAYSTACK_SECRET_KEY=your_paystack_secret_key
# NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=your_paystack_public_key
```

3. **Important**: Make sure `.env.local` is in your `.gitignore` file (it should be by default)

### Step 4: Set Up Database Tables

1. In Supabase dashboard, click **SQL Editor** in the left sidebar
2. Click **"New query"** button
3. Open `supabase/schema.sql` from your project folder
4. Copy the **entire contents** of the file
5. Paste into the SQL Editor in Supabase
6. Click **"Run"** (or press `Ctrl+Enter` / `Cmd+Enter`)
7. Wait for success message: **"Success. No rows returned"**

8. Now create a **new query** for RLS policies:
   - Click **"New query"** again
   - Open `supabase/rls-policies.sql` from your project
   - Copy the **entire contents**
   - Paste into the SQL Editor
   - Click **"Run"**
   - Wait for success message

### Step 5: Set Up Storage Buckets (for Product Images)

1. In Supabase dashboard, click **Storage** in the left sidebar
2. Click **"Create a new bucket"**
3. Create bucket named: `product-images`
4. Set it to **Public bucket** (so images can be accessed via URL)
5. Click **"Create bucket"**

6. (Optional) Create another bucket for user uploads:
   - Name: `user-uploads`
   - Set to **Private bucket**

### Step 6: Configure Authentication (Optional - for Admin Access)

1. In Supabase dashboard, click **Authentication** → **Providers**
2. Enable **Email** provider (already enabled by default)
3. (Optional) Enable **Google** for OAuth:
   - Click **Google**
   - Toggle **Enable Google provider**
   - Add your Google OAuth credentials
   - Save

### Step 7: Restart Your Development Server

1. Stop your current dev server (press `Ctrl+C` in terminal)
2. Run:
   ```bash
   npm run dev
   ```
3. Visit http://localhost:3000

---

## ✅ Verification Checklist

After setup, verify everything works:

- [ ] No errors in browser console
- [ ] Can access homepage (`/home`)
- [ ] Can access products page (`/products`)
- [ ] Can access admin dashboard (`/dashboard`) - may need to create admin user first
- [ ] Database tables exist (check in Supabase → Table Editor)
- [ ] Storage buckets exist (check in Supabase → Storage)

---

## 🔐 Creating Your First Admin User

To access the admin dashboard, you need to create an admin user:

### Method 1: Via Supabase Dashboard

1. Go to Supabase → **Authentication** → **Users**
2. Click **"Add user"** → **"Create new user"**
3. Enter:
   - **Email**: your-admin-email@example.com
   - **Password**: (create a strong password)
4. Click **"Create user"**
5. Copy the user's **UUID** (from the users table)

6. Go to **SQL Editor** and run:
   ```sql
   -- Replace 'user-uuid-here' with the actual UUID from step 5
   -- Replace 'EMP-001' with your desired employee code
   
   INSERT INTO employees (user_id, role, employee_code)
   VALUES ('user-uuid-here', 'admin', 'EMP-001');
   ```

### Method 2: Via Sign Up + Manual Role Assignment

1. Visit your app and sign up normally
2. Get your user UUID from Supabase → Authentication → Users
3. Run the SQL above to assign admin role

---

## 📊 Database Tables Created

After running `schema.sql`, you'll have these tables:

- **categories** - Product categories
- **products** - Product catalog
- **inventory** - Stock management
- **users** - User profiles (extends auth.users)
- **employees** - Staff with roles (admin, manager, seller)
- **orders** - Customer orders
- **order_items** - Items in each order
- **transactions** - Payment transactions

---

## 🔒 Security (RLS Policies)

The `rls-policies.sql` file sets up Row Level Security:

- **Public Access**: Categories, Products (read-only)
- **User Access**: Own orders, own profile
- **Employee Access**: Inventory (read), POS orders
- **Admin/Manager Access**: Full CRUD on products, categories, orders
- **Admin Only**: Employees management, transactions

---

## 🐛 Troubleshooting

### "Invalid supabaseUrl" Error
- Check that `NEXT_PUBLIC_SUPABASE_URL` starts with `https://`
- Make sure there are no extra spaces in `.env.local`
- Restart dev server after changing `.env.local`

### "Relation does not exist" Error
- Make sure you ran `schema.sql` completely
- Check Supabase → Table Editor to see if tables exist
- Re-run `schema.sql` if needed

### "Permission denied" Error
- Make sure you ran `rls-policies.sql`
- Check that your user has the correct role in `employees` table
- Verify RLS policies in Supabase → Authentication → Policies

### Can't Access Admin Dashboard
- Make sure you created an admin user (see "Creating Your First Admin User" above)
- Check that your user UUID exists in `employees` table with role `'admin'`
- Try signing out and signing back in

### Images Not Uploading
- Make sure you created the `product-images` storage bucket
- Check that the bucket is set to **Public**
- Verify storage policies allow uploads (may need to set up storage policies)

---

## 📚 Additional Resources

- **Supabase Docs**: https://supabase.com/docs
- **Next.js + Supabase Guide**: https://supabase.com/docs/guides/getting-started/quickstarts/nextjs
- **Supabase Storage**: https://supabase.com/docs/guides/storage

---

## 🎯 Next Steps After Integration

1. ✅ Create your first admin user
2. ✅ Add product categories via admin dashboard
3. ✅ Upload products with images
4. ✅ Test the POS system
5. ✅ Set up Paystack for payments (optional)
6. ✅ Configure WhatsApp Business API (optional)

---

## 💡 Quick Reference

**File Location**: `.env.local` (in project root)

**Required Variables**:
```env
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**SQL Files to Run** (in order):
1. `supabase/schema.sql`
2. `supabase/rls-policies.sql`

**Storage Buckets Needed**:
- `product-images` (Public)

---

That's it! Your Supabase integration should now be complete. 🎉




