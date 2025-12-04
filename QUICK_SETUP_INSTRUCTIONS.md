# 🚀 Quick Setup Instructions

## ⚡ Immediate Actions Required

### 1. Create `.env.local` File

**Location**: Create this file in your project root (same folder as `package.json`)

**File name**: `.env.local`

**Content** (copy and paste exactly):

```env
NEXT_PUBLIC_SUPABASE_URL=https://pklbqruulnpalzxurznr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrbGJxcnV1bG5wYWx6eHVyem5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwOTYwOTYsImV4cCI6MjA3OTY3MjA5Nn0.bxRf0CsWhmm36C7V5icAwbeVzCOzkpxvN2Aa6vL_NXk
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrbGJxcnV1bG5wYWx6eHVyem5yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA5NjA5NiwiZXhwIjoyMDc5NjcyMDk2fQ.cXl1boBQGgEy-GSD-KYVZlDA4JIKAqqc4s3UsqcSbNk
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Run SQL Scripts in Supabase

Go to: https://supabase.com/dashboard/project/pklbqruulnpalzxurznr/sql/new

**Run these scripts IN ORDER:**

1. **schema.sql** - Creates all database tables
2. **schema-update.sql** - Adds missing fields (sale_price, status, flash_sale fields)
3. **rls-policies.sql** - Sets up security policies
4. **migrate-dummy-data.sql** - Inserts all your dummy products and categories

**How to run:**
- Click "SQL Editor" → "New query"
- Copy/paste each file's contents
- Click "Run" (or Ctrl+Enter)
- Wait for success message
- Repeat for next file

### 3. Create Storage Bucket

1. Go to Supabase → **Storage**
2. Click **"Create a new bucket"**
3. Name: `product-images`
4. Toggle **"Public bucket"** ON
5. Click **"Create bucket"**

### 4. Restart Dev Server

```bash
# Stop current server (Ctrl+C)
npm run dev
```

## ✅ Verification Checklist

After setup, verify:

- [ ] `.env.local` file exists in project root
- [ ] No errors in browser console
- [ ] Products show on `/home` page
- [ ] Products show on `/products` page
- [ ] Admin dashboard accessible (may need admin user first)

## 📝 Next Steps

1. **Create Admin User** (see SETUP_SUPABASE_NOW.md Step 6)
2. **Test the application** - All dummy data should now be in Supabase
3. **Add more products** via admin dashboard

## 📚 Full Documentation

- **SETUP_SUPABASE_NOW.md** - Detailed step-by-step guide
- **SUPABASE_INTEGRATION_GUIDE.md** - Complete integration documentation

---

**Files to run in Supabase SQL Editor (in order):**
1. `supabase/schema.sql`
2. `supabase/schema-update.sql`
3. `supabase/rls-policies.sql`
4. `supabase/migrate-dummy-data.sql`



