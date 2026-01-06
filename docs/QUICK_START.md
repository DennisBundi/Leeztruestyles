# Quick Start - Preview Locally

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Create Environment File (Minimum Setup)

Create a `.env.local` file in the root directory with at least these values to preview:

```env
# Minimum required for basic preview
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional - can be placeholder values for preview
PAYSTACK_SECRET_KEY=sk_test_placeholder
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_placeholder
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_PHONE_NUMBER_ID=placeholder
WHATSAPP_ACCESS_TOKEN=placeholder
NEXT_PUBLIC_WHATSAPP_BUSINESS_PHONE=+254700000000
```

**Note:** For a full preview with all features, you'll need:
- A Supabase project (free tier works)
- Paystack test keys (optional for payment testing)
- WhatsApp Business API (optional)

## Step 3: Run Development Server

```bash
npm run dev
```

## Step 4: Open in Browser

Open [http://localhost:3000](http://localhost:3000) in your browser.

## What You'll See

- **Homepage** (`/home`) - Landing page with featured products
- **Products** (`/products`) - Product listing page
- **Admin Dashboard** (`/dashboard`) - Requires authentication
- **POS System** (`/pos`) - Requires seller/admin authentication

## Troubleshooting

### Port Already in Use
If port 3000 is busy, Next.js will automatically use the next available port (3001, 3002, etc.)

### Missing Environment Variables
The app will show errors if Supabase credentials are missing. You can:
1. Create a free Supabase account at https://supabase.com
2. Create a new project
3. Get your URL and anon key from Project Settings > API

### Database Not Set Up
To see products and use admin features:
1. Go to your Supabase project SQL Editor
2. Run `supabase/schema.sql` first
3. Then run `supabase/rls-policies.sql`

## Next Steps After Preview

1. Set up Supabase database (run SQL migrations)
2. Configure authentication
3. Add test products
4. Test payment integration (with Paystack test keys)

