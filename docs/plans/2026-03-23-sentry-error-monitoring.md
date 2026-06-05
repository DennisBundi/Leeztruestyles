# Sentry Error Monitoring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate Sentry error monitoring into the Next.js 14 App Router project, capturing client, server, and edge errors with source map support on Vercel.

**Architecture:** Install `@sentry/nextjs`, add three runtime config files (client/server/edge), hook into Next.js via `instrumentation.ts`, wrap `next.config.js` with `withSentryConfig`, and pipe the existing `logger.error()` calls to Sentry so all existing error logging auto-reports without further code changes.

**Tech Stack:** `@sentry/nextjs`, Next.js 14 App Router, Vercel (source maps via auth token)

---

### Task 1: Install the Sentry SDK

**Files:**
- Modify: `package.json` (via npm install)

**Step 1: Install the package**

```bash
npm install @sentry/nextjs
```

Expected: `@sentry/nextjs` appears in `package.json` dependencies.

**Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install @sentry/nextjs"
```

---

### Task 2: Add environment variables

**Files:**
- Modify: `.env.local`
- Modify: `.env.example`

**Step 1: Add to `.env.local`**

Append these lines to `.env.local`:

```
# Sentry
NEXT_PUBLIC_SENTRY_DSN=https://6a08d83ac5f78d0ce8780626a3d57dd0@o4511092085948416.ingest.us.sentry.io/4511092098007040
SENTRY_AUTH_TOKEN=sntryu_REDACTED
SENTRY_ORG=leeztruestyles
SENTRY_PROJECT=leeztruestyles
```

**Step 2: Add placeholders to `.env.example`**

Append these lines to `.env.example`:

```
# Sentry
NEXT_PUBLIC_SENTRY_DSN=https://your-key@oXXX.ingest.us.sentry.io/XXX
SENTRY_AUTH_TOKEN=your-sentry-auth-token
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
```

**Step 3: Commit**

```bash
git add .env.example
git commit -m "chore: add Sentry env var placeholders to .env.example"
```

Note: `.env.local` is gitignored — do NOT git add it.

---

### Task 3: Create `sentry.client.config.ts`

**Files:**
- Create: `sentry.client.config.ts` (project root)

**Step 1: Create the file**

```ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Errors only — no performance tracing or session replay
  tracesSampleRate: 0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  // Don't send errors in development
  enabled: process.env.NODE_ENV === 'production',
});
```

**Step 2: Commit**

```bash
git add sentry.client.config.ts
git commit -m "feat(sentry): add client-side error config"
```

---

### Task 4: Create `sentry.server.config.ts`

**Files:**
- Create: `sentry.server.config.ts` (project root)

**Step 1: Create the file**

```ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  tracesSampleRate: 0,

  enabled: process.env.NODE_ENV === 'production',
});
```

**Step 2: Commit**

```bash
git add sentry.server.config.ts
git commit -m "feat(sentry): add server-side error config"
```

---

### Task 5: Create `sentry.edge.config.ts`

**Files:**
- Create: `sentry.edge.config.ts` (project root)

**Step 1: Create the file**

```ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  tracesSampleRate: 0,

  enabled: process.env.NODE_ENV === 'production',
});
```

**Step 2: Commit**

```bash
git add sentry.edge.config.ts
git commit -m "feat(sentry): add edge runtime error config"
```

---

### Task 6: Create `src/instrumentation.ts`

This is the Next.js 14 hook that loads Sentry on the server and edge at startup.

**Files:**
- Create: `src/instrumentation.ts`

**Step 1: Create the file**

```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}
```

**Step 2: Commit**

```bash
git add src/instrumentation.ts
git commit -m "feat(sentry): add Next.js instrumentation hook"
```

---

### Task 7: Update `next.config.js` — wrap with `withSentryConfig` and fix CSP

**Files:**
- Modify: `next.config.js`

**Step 1: Update the file**

Replace the entire `next.config.js` with the following. Key changes:
1. Wrap `module.exports` with `withSentryConfig`
2. Add `https://*.ingest.us.sentry.io` to the `connect-src` CSP directive (required for Sentry to send events from the browser)

```js
/** @type {import('next').NextConfig} */
const dns = require("dns");
const { withSentryConfig } = require("@sentry/nextjs");

if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pklbqruulnpalzxurznr.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
    unoptimized: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    // TODO: Fix pre-existing type errors across POS/product components, then re-enable
    ignoreBuildErrors: true,
  },
  // Rewrite root to /home so visitors don't see a redirect
  async rewrites() {
    return [
      {
        source: '/',
        destination: '/home',
      },
    ];
  },
  async headers() {
    return [
      // Security headers for all routes
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline' ${process.env.NODE_ENV === 'development' ? "'unsafe-eval'" : ''} https://js.paystack.co`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://pklbqruulnpalzxurznr.supabase.co https://images.unsplash.com",
              "font-src 'self'",
              "connect-src 'self' https://pklbqruulnpalzxurznr.supabase.co wss://pklbqruulnpalzxurznr.supabase.co https://api.paystack.co https://*.ingest.us.sentry.io",
              "frame-src 'self' https://js.paystack.co https://checkout.paystack.com",
              "object-src 'none'",
              "base-uri 'self'",
            ].join('; '),
          },
        ],
      },
      // PWA - service worker
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: process.env.NODE_ENV === 'development'
              ? 'no-cache, no-store, must-revalidate, proxy-revalidate'
              : 'public, max-age=31536000, immutable',
          },
        ],
      },
      // In development, prevent caching of chunks
      ...(process.env.NODE_ENV === 'development' ? [{
        source: '/_next/static/chunks/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      }] : []),
    ];
  },
};

module.exports = withSentryConfig(nextConfig, {
  org: 'leeztruestyles',
  project: 'leeztruestyles',

  // Upload source maps on production builds only
  silent: !process.env.CI,

  // Disable Sentry's default performance features — errors only
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: false,
});
```

**Step 2: Commit**

```bash
git add next.config.js
git commit -m "feat(sentry): wrap next.config.js with withSentryConfig and update CSP"
```

---

### Task 8: Update `logger.ts` to report errors to Sentry

**Files:**
- Modify: `src/lib/logger.ts`

**Step 1: Update the file**

Replace `src/lib/logger.ts` with the following. The only change is that `logger.error()` now also calls `Sentry.captureException` when an `Error` instance is passed, or `Sentry.captureMessage` for plain strings. All existing `logger.error()` calls across the codebase will automatically report to Sentry with no other changes needed.

```ts
import * as Sentry from '@sentry/nextjs';

/**
 * Structured logger that redacts PII in production.
 * In development, logs are passed through as-is.
 * In production, errors are also sent to Sentry.
 */

const isProduction = process.env.NODE_ENV === 'production';

const PII_PATTERNS: [RegExp, string][] = [
  // Email addresses
  [/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]'],
  // Phone numbers (various formats)
  [/\b(?:\+?254|0)\d{9}\b/g, '[PHONE_REDACTED]'],
  [/\b\d{10,13}\b/g, '[PHONE_REDACTED]'],
];

function redact(value: unknown): unknown {
  if (!isProduction) return value;

  if (typeof value === 'string') {
    let redacted = value;
    for (const [pattern, replacement] of PII_PATTERNS) {
      redacted = redacted.replace(pattern, replacement);
    }
    return redacted;
  }

  if (typeof value === 'object' && value !== null) {
    if (Array.isArray(value)) {
      return value.map(redact);
    }
    const redacted: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      // Redact known PII keys entirely
      if (['email', 'phone', 'password', 'token', 'secret'].includes(k.toLowerCase())) {
        redacted[k] = `[${k.toUpperCase()}_REDACTED]`;
      } else {
        redacted[k] = redact(v);
      }
    }
    return redacted;
  }

  return value;
}

export const logger = {
  info(message: string, ...args: unknown[]) {
    console.log(`[INFO] ${message}`, ...args.map(redact));
  },
  warn(message: string, ...args: unknown[]) {
    console.warn(`[WARN] ${message}`, ...args.map(redact));
  },
  error(message: string, ...args: unknown[]) {
    console.error(`[ERROR] ${message}`, ...args.map(redact));

    // Report to Sentry in production
    if (isProduction) {
      const err = args.find((a) => a instanceof Error);
      if (err instanceof Error) {
        Sentry.captureException(err, { extra: { message } });
      } else {
        Sentry.captureMessage(message, 'error');
      }
    }
  },
  debug(message: string, ...args: unknown[]) {
    if (!isProduction) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },
};
```

**Step 2: Commit**

```bash
git add src/lib/logger.ts
git commit -m "feat(sentry): pipe logger.error() to Sentry in production"
```

---

### Task 9: Add Sentry env vars to Vercel

This step is manual — no code changes.

**Step 1: Go to Vercel dashboard**

Settings → Environment Variables → add these four (scope: Production):

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SENTRY_DSN` | `https://6a08d83ac5f78d0ce8780626a3d57dd0@o4511092085948416.ingest.us.sentry.io/4511092098007040` |
| `SENTRY_AUTH_TOKEN` | `sntryu_REDACTED` |
| `SENTRY_ORG` | `leeztruestyles` |
| `SENTRY_PROJECT` | `leeztruestyles` |

**Step 2: Trigger a redeploy** after adding the vars.

---

### Task 10: Push and verify

**Step 1: Push to main**

```bash
git push origin main
```

**Step 2: Verify on Sentry dashboard**

After deploy, go to `sentry.io/organizations/leeztruestyles/issues/` and confirm the project is receiving events. You can trigger a test error by temporarily adding this to any API route in development and checking Sentry:

```ts
throw new Error('Sentry test error — remove me');
```

Note: Sentry is configured with `enabled: process.env.NODE_ENV === 'production'` so test errors only appear after a production deploy.
