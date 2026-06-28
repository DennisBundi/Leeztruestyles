# China Custom Order Form

**Date:** 2026-06-28  
**Status:** Approved

## Overview

When a customer filters the products page to show China imports, a banner CTA appears letting them place a custom sourcing request. They describe what they want, upload optional reference images, and submit — which opens WhatsApp on their device with a structured pre-filled message sent to the business number.

No database record is created. The WhatsApp message is the delivery mechanism; the business manages follow-up through WhatsApp.

---

## Entry Point

A pink gradient banner is injected between the filter bar and the product grid **only when the China filter is active** (`?china=true` in the URL).

**Banner content:**
- Left: 🇨🇳 flag + headline "Don't see exactly what you want?" + subtext "Place a custom order — describe any product and we'll source it from China for you"
- Right: white button "✍️ Place Custom Order" — opens the modal

**Colors:** `background: linear-gradient(135deg, #DB2777, #EC4899)` — matches the existing China filter pills and product badges. Button is white with `#DB2777` text.

The banner is hidden when the China filter is off. It sits above the product grid so customers can browse for inspiration and then request something.

---

## Modal Form

Opens as a centered overlay when the CTA button is clicked.

### Header
Pink gradient (`#DB2777 → #EC4899`), white text, 🇨🇳 icon.  
Title: **"Order from China"**  
Subtitle: *"Describe what you'd like sourced — we'll reach out to confirm & arrange delivery"*

### Product Rows

Starts with one row. Each row contains:

| Field | Type | Required |
|---|---|---|
| Product description | `<textarea>` | Yes |
| Quantity | `<input type="number" min="1">` | Yes |
| Reference image | File upload (JPG/PNG/WebP, max 5MB) | No |

**Image upload states:**
- Empty: dashed pink border zone with camera icon and "Upload a photo or screenshot" label
- Uploaded: shows filename + "Image uploaded ✓" with a remove (×) button

A **"＋ Add another item"** dashed button below the rows appends a new empty row. Rows can be removed individually via their × button. At least one row must remain.

### Total Budget

A single green-tinted field below the product rows:  
Label: **"💰 Total estimated budget (KES)"**  
Placeholder: *"e.g. 10,000 — your overall budget for this order"*  
This is a single figure covering the entire order, not per item.

### Contact Details

Two fields side by side:
- **Full name** (text, required)
- **Phone number** (text, required — used by staff to call/WhatsApp the customer back)

### Submit Button

Full-width green WhatsApp button: **"Send Order via WhatsApp"**

---

## Image Upload Flow

When the user selects an image file:

1. Client-side: file is validated (type + size ≤ 5MB), a preview thumbnail is shown immediately.
2. On form submit: each image is `POST`ed to `/api/china-order/upload-image`.
3. The API route uploads the file to Supabase Storage (bucket: `china-order-images`, public).
4. Returns the public URL, which is embedded in the WhatsApp message for that item.

Images that fail to upload are skipped silently — the order still submits without the image URL for that item. Upload errors are shown inline on the row.

---

## WhatsApp Message Format

On submit, all images are uploaded first (in parallel), then the message is assembled and `wa.me` is opened:

```
🇨🇳 *New China Order Request*
━━━━━━━━━━━━━━━━━━
👤 *{Full Name}* · {Phone}

📦 *Item 1*
{Description}
Qty: {quantity}
📷 {image URL}        ← only if image uploaded

📦 *Item 2*
{Description}
Qty: {quantity}

💰 *Total budget:* KES {budget}
━━━━━━━━━━━━━━━━━━
Sent from leeztruestyles.com
```

The encoded message is appended to `https://wa.me/254797877254?text=<encoded>`. This opens on the customer's device; they tap send. The business receives it in their WhatsApp inbox.

---

## Validation

| Field | Rule |
|---|---|
| Product description | Required, non-empty |
| Quantity | Required, integer ≥ 1 |
| Image | Optional; if provided: type must be JPG/PNG/WebP, size ≤ 5MB |
| Full name | Required, non-empty |
| Phone number | Required, non-empty |
| Total budget | Optional (encouraged but not blocked if empty) |

Inline error messages appear below each field on submit attempt. The submit button is disabled while images are uploading.

---

## New Files

| File | Purpose |
|---|---|
| `src/components/products/ChinaOrderModal.tsx` | Modal form component (client component) |
| `src/app/api/china-order/upload-image/route.ts` | `POST` endpoint — receives file, uploads to Supabase Storage, returns public URL |

## Modified Files

| File | Change |
|---|---|
| `src/components/filters/ChinaFilter.tsx` | Add the pink CTA banner (shown when China filter active) and wire it to open `ChinaOrderModal` |

---

## Supabase Storage

- **Bucket:** `china-order-images` (public, read-only for anonymous)
- **Path pattern:** `orders/{timestamp}-{randomId}/{filename}`
- The bucket must be created in the Supabase dashboard before deployment if it doesn't already exist.
