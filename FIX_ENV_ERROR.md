# Fix: Supabase Environment Variables Error

## Quick Fix (Choose One)

### Option 1: Use Placeholder Values (UI Preview Only)

Create a `.env.local` file in your project root with:

```env
NEXT_PUBLIC_SUPABASE_URL=placeholder
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Note:** This will let the app run, but database features won't work. Use this only to preview the UI.

### Option 2: Set Up Real Supabase (Recommended)

1. **Create Supabase Account** (Free):
   - Go to https://supabase.com
   - Sign up for free

2. **Create New Project**:
   - Click "New Project"
   - Name it (e.g., "Leeztruestyles")
   - Choose region closest to Kenya
   - Wait 2-3 minutes for setup

3. **Get Your API Keys**:
   - In Supabase dashboard → Settings → API
   - Copy **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - Copy **anon public** key (long string starting with `eyJ...`)

4. **Create `.env.local` File**:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

5. **Restart Dev Server**:
   - Stop server (Ctrl+C)
   - Run `npm run dev` again

## Where to Create `.env.local`

The file should be in the **root** of your project:
```
Leeztruestyles.com/
├── .env.local          ← Create this file here
├── package.json
├── src/
└── ...
```

## Verify It's Working

After adding the file:
1. Restart the dev server
2. Visit http://localhost:3000
3. The error should be gone!

## Need Help?

- See `SETUP_SUPABASE.md` for detailed instructions
- Supabase Docs: https://supabase.com/docs

