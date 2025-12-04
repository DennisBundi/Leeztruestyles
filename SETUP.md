# Leeztruestyles Marketplace - Setup Guide

## Prerequisites

- Node.js 18+ installed
- Supabase account
- Paystack account (for payments)
- WhatsApp Business API access (optional)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
   - Copy `.env.local.example` to `.env.local`
   - Fill in all required values (see below)

## Environment Variables

Create a `.env.local` file with the following:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Paystack Configuration
PAYSTACK_SECRET_KEY=your_paystack_secret_key
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=your_paystack_public_key

# WhatsApp Business API
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
NEXT_PUBLIC_WHATSAPP_BUSINESS_PHONE=your_business_phone_number

# Google OAuth (for Supabase Auth)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Database Setup

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the SQL scripts in order:
   - `supabase/schema.sql` - Creates all tables
   - `supabase/rls-policies.sql` - Sets up Row Level Security

## Supabase Auth Setup

1. In Supabase Dashboard, go to Authentication > Providers
2. Enable Google OAuth provider
3. Add your Google OAuth credentials

## Running the Application

Development:
```bash
npm run dev
```

Production build:
```bash
npm run build
npm start
```

## Testing

Run tests:
```bash
npm test
```

## Key Features Implemented

✅ Next.js 14+ with App Router
✅ Supabase integration (Database, Auth, Storage)
✅ Paystack payment integration (M-Pesa & Card)
✅ WhatsApp Business API widget
✅ Admin dashboard with RBAC
✅ POS system with seller tracking
✅ Real-time inventory synchronization
✅ Product management (CRUD)
✅ Order management
✅ Employee management
✅ Payment tracking and reconciliation

## Project Structure

- `src/app/` - Next.js App Router pages
- `src/components/` - Reusable React components
- `src/services/` - Business logic services
- `src/store/` - Zustand state management
- `src/lib/` - Utility functions and configurations
- `src/types/` - TypeScript type definitions
- `supabase/` - Database schema and migrations

## Next Steps

1. Set up your Supabase project and run the SQL migrations
2. Configure Paystack API keys
3. Set up WhatsApp Business API (optional)
4. Create your first admin user in the database
5. Start adding products through the admin dashboard

## Support

For issues or questions, refer to the main README.md file.

