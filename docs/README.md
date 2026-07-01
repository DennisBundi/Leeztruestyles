# Leeztruestyles.com - Fashion Marketplace

A high-performance, scalable e-commerce marketplace built with Next.js, Supabase, and Paystack.

## Technology Stack

- **Frontend**: Next.js 14+ (TypeScript, App Router)
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Backend/Database**: Supabase (PostgreSQL)
- **Payments**: Paystack (M-Pesa & Card payments)
- **Chatbot**: WhatsApp Business API
- **Hosting**: Vercel (Frontend) & Supabase (Database)

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables (see `.env.local.example`)

3. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (marketplace)/     # Public routes
│   ├── (admin)/           # Admin routes
│   └── api/               # API routes
├── components/            # Reusable components
├── store/                 # Zustand stores
├── services/              # Business logic
├── types/                 # TypeScript types
└── lib/                   # Utilities
```

## Environment Variables

See `.env.local.example` for all required environment variables.

