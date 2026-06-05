# PWA Update Prompt Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show a non-blocking bottom toast to PWA users on every page visit until they tap "Update Now", which reloads the page so they get the new logo and fresh cache.

**Architecture:** Bump the service worker cache version to force a new SW installation. When the new SW takes over (`controllerchange` event), fire a custom DOM event. A new `PWAUpdatePrompt` component listens for that event and renders a persistent pink toast — no localStorage, so it reappears every visit until the user reloads.

**Tech Stack:** Next.js 14, React, TypeScript, Tailwind CSS, vanilla Service Worker API

---

### Task 1: Bump the service worker cache version

**Files:**
- Modify: `public/sw.js:2`

**Step 1: Change `leeztruestyles-v1` to `leeztruestyles-v2`**

In `public/sw.js`, change line 2 from:
```js
const CACHE_NAME = 'leeztruestyles-v1';
```
to:
```js
const CACHE_NAME = 'leeztruestyles-v2';
```

This makes the browser treat the SW as new, triggering installation and cache replacement.

**Step 2: Verify the change**

Open `public/sw.js` and confirm the cache name reads `leeztruestyles-v2`.

**Step 3: Commit**

```bash
git add public/sw.js
git commit -m "chore: bump service worker cache to v2 for logo update"
```

---

### Task 2: Update PWARegister to signal when a new SW takes over

**Files:**
- Modify: `src/components/PWARegister.tsx`

**Context:** The current SW calls `self.skipWaiting()` during install, so there's no "waiting" state — the new SW activates immediately. The right signal is the `controllerchange` event, which fires when a new SW takes over the page. We only want to show the update toast when upgrading (not on first install), so we snapshot `controller` before registration.

**Step 1: Replace the file contents**

Replace `src/components/PWARegister.tsx` with:

```tsx
'use client';

import { useEffect } from 'react';

export default function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    // Snapshot whether there was already a controller before we register.
    // If null → first-time install (no update toast needed).
    // If set → existing install, any controllerchange = update.
    const hadController = !!navigator.serviceWorker.controller;

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration.scope);
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController) {
        // A new SW has taken over — notify the update prompt
        window.dispatchEvent(new CustomEvent('pwa-updated'));
      }
    });
  }, []);

  return null;
}
```

**Step 2: Verify**

Read the file back and confirm the `hadController` guard and `pwa-updated` event dispatch are present.

**Step 3: Commit**

```bash
git add src/components/PWARegister.tsx
git commit -m "feat: dispatch pwa-updated event when new service worker takes over"
```

---

### Task 3: Create the PWAUpdatePrompt component

**Files:**
- Create: `src/components/PWAUpdatePrompt.tsx`

**Step 1: Create the file**

```tsx
'use client';

import { useEffect, useState } from 'react';

export default function PWAUpdatePrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleUpdate = () => setShow(true);
    window.addEventListener('pwa-updated', handleUpdate);
    return () => window.removeEventListener('pwa-updated', handleUpdate);
  }, []);

  if (!show) return null;

  const handleUpdate = () => {
    window.location.reload();
  };

  const handleDismiss = () => {
    setShow(false);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex items-center justify-between gap-3 rounded-xl bg-pink-300 px-4 py-3 shadow-lg sm:left-auto sm:right-4 sm:w-80">
      <p className="text-sm font-medium text-pink-900">
        New version available — tap to get the latest look!
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={handleUpdate}
          className="rounded-lg bg-pink-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-pink-700 active:bg-pink-800"
        >
          Update
        </button>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="text-pink-700 hover:text-pink-900"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Verify**

Read the file and confirm:
- Listens for `pwa-updated` custom event
- Clicking "Update" calls `window.location.reload()`
- Clicking "✕" hides the toast (no localStorage — reappears next visit)
- Styled with pink Tailwind classes matching the app theme
- Fixed bottom position, z-50 so it overlays content

**Step 3: Commit**

```bash
git add src/components/PWAUpdatePrompt.tsx
git commit -m "feat: add PWAUpdatePrompt toast component"
```

---

### Task 4: Mount PWAUpdatePrompt in layout

**Files:**
- Modify: `src/app/layout.tsx`

**Step 1: Import and render the component**

In `src/app/layout.tsx`:

1. Add the import after the existing PWA imports:
```tsx
import PWAUpdatePrompt from "@/components/PWAUpdatePrompt";
```

2. Add `<PWAUpdatePrompt />` inside `<body>`, after `<InstallPrompt />`:
```tsx
<InstallPrompt />
<PWAUpdatePrompt />
```

**Step 2: Verify the full body block looks like this**

```tsx
<body className="flex flex-col min-h-screen" suppressHydrationWarning>
  <PWAMetaTags />
  <PWARegister />
  <Header />
  <main className="flex-grow">{children}</main>
  <Footer />
  <CartNotificationProvider />
  <InstallPrompt />
  <PWAUpdatePrompt />
</body>
```

**Step 3: Build check**

```bash
npm run build
```

Expected: Build completes with no TypeScript errors.

**Step 4: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: mount PWAUpdatePrompt in root layout"
```

---

### Task 5: Manual end-to-end test

**How to test the update toast:**

1. Run dev server: `npm run dev`
2. Open Chrome → `http://localhost:3000`
3. Open DevTools → Application → Service Workers
4. Note the current SW scope
5. In DevTools → Application → Service Workers → click **Unregister**, then hard-reload
6. The SW registers fresh (first install — no toast should appear)
7. Now simulate an update: in DevTools → Application → Service Workers, click **Update** to force the SW to re-install
8. Alternatively, change `sw.js` cache name back to `v1`, reload, then change back to `v2` and reload again
9. On the second reload (with controller already set), the toast should appear at the bottom
10. Click **Update** → page reloads → toast gone
11. Click **✕** → toast hides → refreshing the page should show it again (no localStorage persistence)

**Expected result:** Pink toast appears at bottom-right, "Update" reloads the page, "✕" hides it until the next visit.
