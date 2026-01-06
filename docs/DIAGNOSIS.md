# Issue Diagnosis Guide

## Symptoms We're Seeing:
1. ✅ Page loads but shows blank white screen
2. ✅ Browser keeps reloading in an endless loop
3. ✅ Browser console is empty (no JavaScript errors)
4. ✅ Dev server appears to be running

## Possible Causes:

### 1. **Redirect Loop**
- Page A redirects to Page B
- Page B redirects back to Page A
- **Check:** Look at browser Network tab - see if there are repeated redirects (301/302 status codes)

### 2. **Middleware Loop**
- Middleware runs on every request
- Middleware causes a redirect
- Redirect triggers middleware again
- **Check:** Terminal/console for middleware logs

### 3. **Server-Side Error During Render**
- Page tries to render
- Error occurs during SSR (Server-Side Rendering)
- Next.js retries
- **Check:** Terminal where `npm run dev` is running - look for error messages

### 4. **Client Component Hydration Mismatch**
- Server renders one thing
- Client expects something else
- React tries to fix it, causes re-render loop
- **Check:** Browser console for hydration warnings

### 5. **Environment Variable Issue**
- Code tries to access missing env var
- Throws error
- Page retries
- **Check:** Terminal for "undefined" or "missing" errors

## How to Diagnose:

### Step 1: Check Terminal Output
Look at the terminal where you ran `npm run dev`:
- Are there any ERROR messages?
- Are there any warnings?
- Do you see requests being logged repeatedly?

### Step 2: Check Browser Network Tab
1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Refresh the page
4. Look for:
   - Multiple requests to the same URL
   - Status codes (200, 301, 302, 500, etc.)
   - Which requests are repeating?

### Step 3: Check Browser Console
1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Look for:
   - Red error messages
   - Yellow warnings
   - Any messages at all

### Step 4: Check What URL You're Visiting
- What exact URL are you opening?
- Does it change/redirect?
- Does the URL stay the same but page reloads?

## Quick Test:

Try visiting these URLs directly:
1. `http://localhost:3000/simple` - Should show pink text
2. `http://localhost:3000/test` - Should show test page
3. `http://localhost:3000` - Main page

Which ones work? Which ones loop?

## What to Report Back:

Please share:
1. **Terminal output** - Any errors or warnings?
2. **Network tab** - What requests are being made? Are they repeating?
3. **Console tab** - Any errors or warnings?
4. **Which URL** you're visiting
5. **Does the URL change** or stay the same during the loop?

This will help us identify the exact issue!

