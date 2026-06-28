# China Custom Order Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a custom China order form to the products page — a pink CTA banner (visible when the China filter is active) opens a modal where customers describe products, upload reference images, and send a structured WhatsApp order to the business.

**Architecture:** Banner + modal are client components. Images are uploaded to Supabase Storage via a Next.js API route on submit; public URLs are embedded in the WhatsApp message. Clicking submit opens `wa.me/254797877254?text=<encoded>` — the customer taps send in their own WhatsApp. No database record is created.

**Tech Stack:** Next.js App Router, React client components, Supabase Storage, TypeScript, Tailwind CSS, Jest

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `src/lib/utils/chinaOrderMessage.ts` | Pure function: order data → formatted WhatsApp string |
| Create | `src/app/api/china-order/upload-image/route.ts` | POST — receives image file, uploads to Supabase Storage, returns public URL |
| Create | `src/components/products/ChinaOrderModal.tsx` | Modal form: product rows, image upload, budget, contact, submit |
| Create | `src/components/products/ChinaOrderBanner.tsx` | Pink CTA banner; owns modal open/close state |
| Create | `supabase/migrations/20260628000000_china_order_images_bucket.sql` | Storage bucket + RLS policies |
| Modify | `src/app/(marketplace)/products/page.tsx` | Render `<ChinaOrderBanner />` when `searchParams.china === 'true'` |
| Test | `tests/lib/utils/chinaOrderMessage.test.ts` | Unit tests for message formatter |
| Test | `tests/api/china-order/upload-image.test.ts` | Unit tests for upload API route |

---

## Task 1: Supabase Storage Bucket

**Files:**
- Create: `supabase/migrations/20260628000000_china_order_images_bucket.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260628000000_china_order_images_bucket.sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'china-order-images',
  'china-order-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow anon uploads to china-order-images"
ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'china-order-images');

CREATE POLICY "Allow public read of china-order-images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'china-order-images');
```

- [ ] **Step 2: Apply the migration**

```bash
npx supabase db push
```

Expected: migration applies without error. Verify in Supabase dashboard → Storage → Buckets that `china-order-images` exists with public access enabled.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260628000000_china_order_images_bucket.sql
git commit -m "feat: add china-order-images Supabase Storage bucket migration"
```

---

## Task 2: WhatsApp Message Formatter

**Files:**
- Create: `src/lib/utils/chinaOrderMessage.ts`
- Test: `tests/lib/utils/chinaOrderMessage.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/lib/utils/chinaOrderMessage.test.ts
import { formatChinaOrderMessage, ChinaOrderData } from '@/lib/utils/chinaOrderMessage'

describe('formatChinaOrderMessage', () => {
  const base: ChinaOrderData = {
    items: [{ description: 'Blue hoodie, size L', quantity: 2 }],
    name: 'Jane Wanjiku',
    phone: '0712345678',
  }

  it('includes header, name, phone, item description and qty', () => {
    const result = formatChinaOrderMessage(base)
    expect(result).toContain('🇨🇳 *New China Order Request*')
    expect(result).toContain('👤 *Jane Wanjiku* · 0712345678')
    expect(result).toContain('📦 *Item 1*')
    expect(result).toContain('Blue hoodie, size L')
    expect(result).toContain('Qty: 2')
    expect(result).toContain('Sent from leeztruestyles.com')
  })

  it('omits image line when no imageUrl', () => {
    const result = formatChinaOrderMessage(base)
    expect(result).not.toContain('📷')
  })

  it('includes image URL when provided', () => {
    const result = formatChinaOrderMessage({
      ...base,
      items: [{ ...base.items[0], imageUrl: 'https://example.com/jacket.jpg' }],
    })
    expect(result).toContain('📷 https://example.com/jacket.jpg')
  })

  it('omits budget line when no budget provided', () => {
    const result = formatChinaOrderMessage(base)
    expect(result).not.toContain('💰')
  })

  it('includes budget when provided', () => {
    const result = formatChinaOrderMessage({ ...base, totalBudget: '15,000' })
    expect(result).toContain('💰 *Total budget:* KES 15,000')
  })

  it('numbers multiple items correctly', () => {
    const result = formatChinaOrderMessage({
      ...base,
      items: [
        { description: 'Jacket', quantity: 1 },
        { description: 'Shoes, size 40', quantity: 2 },
      ],
    })
    expect(result).toContain('📦 *Item 1*')
    expect(result).toContain('Jacket')
    expect(result).toContain('📦 *Item 2*')
    expect(result).toContain('Shoes, size 40')
  })
})
```

- [ ] **Step 2: Run to confirm tests fail**

```bash
npx jest tests/lib/utils/chinaOrderMessage.test.ts --no-coverage
```

Expected: FAIL — "Cannot find module '@/lib/utils/chinaOrderMessage'"

- [ ] **Step 3: Implement the formatter**

```typescript
// src/lib/utils/chinaOrderMessage.ts
export interface ChinaOrderItem {
  description: string
  quantity: number
  imageUrl?: string
}

export interface ChinaOrderData {
  items: ChinaOrderItem[]
  totalBudget?: string
  name: string
  phone: string
}

export function formatChinaOrderMessage(order: ChinaOrderData): string {
  const itemBlocks = order.items
    .map((item, i) => {
      const lines = [`📦 *Item ${i + 1}*`, item.description, `Qty: ${item.quantity}`]
      if (item.imageUrl) lines.push(`📷 ${item.imageUrl}`)
      return lines.join('\n')
    })
    .join('\n\n')

  const budgetLine = order.totalBudget
    ? `\n💰 *Total budget:* KES ${order.totalBudget}`
    : ''

  return [
    '🇨🇳 *New China Order Request*',
    '━━━━━━━━━━━━━━━━━━',
    `👤 *${order.name}* · ${order.phone}`,
    '',
    itemBlocks,
    budgetLine,
    '━━━━━━━━━━━━━━━━━━',
    'Sent from leeztruestyles.com',
  ].join('\n')
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest tests/lib/utils/chinaOrderMessage.test.ts --no-coverage
```

Expected: PASS — 6 tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/chinaOrderMessage.ts tests/lib/utils/chinaOrderMessage.test.ts
git commit -m "feat: add China order WhatsApp message formatter with tests"
```

---

## Task 3: Image Upload API Route

**Files:**
- Create: `src/app/api/china-order/upload-image/route.ts`
- Test: `tests/api/china-order/upload-image.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/api/china-order/upload-image.test.ts
/**
 * @jest-environment node
 */
import { POST } from '@/app/api/china-order/upload-image/route'
import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

jest.mock('@/lib/supabase/server')

const mockUpload = jest.fn()
const mockGetPublicUrl = jest.fn()
const mockStorageFrom = jest.fn(() => ({ upload: mockUpload, getPublicUrl: mockGetPublicUrl }))
const mockSupabase = { storage: { from: mockStorageFrom } }

function makeRequest(file?: File): NextRequest {
  const formData = new FormData()
  if (file) formData.append('file', file)
  return { formData: async () => formData } as unknown as NextRequest
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
  mockUpload.mockResolvedValue({ error: null })
  mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.com/img.jpg' } })
})

describe('POST /api/china-order/upload-image', () => {
  it('returns 400 when no file is provided', async () => {
    const res = await POST(makeRequest())
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('No file provided')
  })

  it('returns 400 for unsupported file type', async () => {
    const file = new File(['data'], 'doc.pdf', { type: 'application/pdf' })
    const res = await POST(makeRequest(file))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid file type')
  })

  it('returns 400 when file exceeds 5MB', async () => {
    const file = new File([new Uint8Array(6 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' })
    const res = await POST(makeRequest(file))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('File too large')
  })

  it('returns 500 when Supabase upload fails', async () => {
    mockUpload.mockResolvedValue({ error: new Error('bucket not found') })
    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' })
    const res = await POST(makeRequest(file))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Upload failed')
  })

  it('returns 200 with public URL on success', async () => {
    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' })
    const res = await POST(makeRequest(file))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.url).toBe('https://example.com/img.jpg')
    expect(mockStorageFrom).toHaveBeenCalledWith('china-order-images')
  })
})
```

- [ ] **Step 2: Run to confirm tests fail**

```bash
npx jest tests/api/china-order/upload-image.test.ts --no-coverage
```

Expected: FAIL — "Cannot find module '@/app/api/china-order/upload-image/route'"

- [ ] **Step 3: Implement the route**

```typescript
// src/app/api/china-order/upload-image/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large' }, { status: 400 })
  }

  const supabase = await createClient()
  const path = `orders/${Date.now()}-${Math.random().toString(36).slice(2)}/${file.name}`
  const buffer = await file.arrayBuffer()

  const { error } = await supabase.storage
    .from('china-order-images')
    .upload(path, buffer, { contentType: file.type })

  if (error) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  const { data } = supabase.storage.from('china-order-images').getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl })
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest tests/api/china-order/upload-image.test.ts --no-coverage
```

Expected: PASS — 5 tests

- [ ] **Step 5: Commit**

```bash
git add src/app/api/china-order/upload-image/route.ts tests/api/china-order/upload-image.test.ts
git commit -m "feat: add China order image upload API route with tests"
```

---

## Task 4: ChinaOrderModal Component

**Files:**
- Create: `src/components/products/ChinaOrderModal.tsx`

- [ ] **Step 1: Create the component**

```typescript
// src/components/products/ChinaOrderModal.tsx
'use client'

import { useState, useRef } from 'react'
import { formatChinaOrderMessage } from '@/lib/utils/chinaOrderMessage'

interface OrderItem {
  description: string
  quantity: string
  imageFile: File | null
  uploadError: string | null
}

interface Props {
  onClose: () => void
}

const emptyItem = (): OrderItem => ({
  description: '',
  quantity: '',
  imageFile: null,
  uploadError: null,
})

export default function ChinaOrderModal({ onClose }: Props) {
  const [items, setItems] = useState<OrderItem[]>([emptyItem()])
  const [budget, setBudget] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([])

  const updateItem = (index: number, patch: Partial<OrderItem>) =>
    setItems(prev => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))

  const addItem = () => setItems(prev => [...prev, emptyItem()])

  const removeItem = (index: number) => {
    if (items.length === 1) return
    setItems(prev => prev.filter((_, i) => i !== index))
    fileInputRefs.current = fileInputRefs.current.filter((_, i) => i !== index)
  }

  const validate = (): boolean => {
    const next: Record<string, string> = {}
    items.forEach((item, i) => {
      if (!item.description.trim()) next[`item-${i}-desc`] = 'Required'
      if (!item.quantity || parseInt(item.quantity) < 1) next[`item-${i}-qty`] = 'Must be ≥ 1'
    })
    if (!name.trim()) next.name = 'Required'
    if (!phone.trim()) next.phone = 'Required'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const uploadImages = async (): Promise<(string | null)[]> =>
    Promise.all(
      items.map(async (item, index) => {
        if (!item.imageFile) return null
        const formData = new FormData()
        formData.append('file', item.imageFile)
        try {
          const res = await fetch('/api/china-order/upload-image', { method: 'POST', body: formData })
          if (!res.ok) throw new Error()
          const { url } = await res.json()
          return url as string
        } catch {
          updateItem(index, { uploadError: 'Upload failed — image will be skipped' })
          return null
        }
      })
    )

  const handleSubmit = async () => {
    if (!validate()) return
    setIsSubmitting(true)
    const imageUrls = await uploadImages()
    const businessPhone = process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_PHONE || '254797877254'
    const message = formatChinaOrderMessage({
      items: items.map((item, i) => ({
        description: item.description,
        quantity: parseInt(item.quantity),
        imageUrl: imageUrls[i] ?? undefined,
      })),
      totalBudget: budget.trim() || undefined,
      name: name.trim(),
      phone: phone.trim(),
    })
    window.open(
      `https://wa.me/${businessPhone}?text=${encodeURIComponent(message)}`,
      '_blank',
      'noopener,noreferrer'
    )
    setIsSubmitting(false)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-[#DB2777] to-[#EC4899] text-white p-5 rounded-t-xl flex items-center gap-3">
          <span className="text-3xl">🇨🇳</span>
          <div className="flex-1">
            <h2 className="text-lg font-bold">Order from China</h2>
            <p className="text-sm opacity-85">Describe what you'd like sourced — we'll reach out to confirm &amp; arrange delivery</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white text-2xl leading-none ml-2">×</button>
        </div>

        <div className="p-5 space-y-5">
          {/* Items */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Your Items</p>
            {items.map((item, index) => (
              <div key={index} className="bg-pink-50 border border-pink-200 rounded-xl p-4 mb-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#DB2777]">Item {index + 1}</span>
                  {items.length > 1 && (
                    <button
                      onClick={() => removeItem(index)}
                      className="w-5 h-5 bg-pink-100 rounded-full flex items-center justify-center text-[#DB2777] font-bold text-sm"
                    >×</button>
                  )}
                </div>

                <div className="mb-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Product description</label>
                  <textarea
                    value={item.description}
                    onChange={e => updateItem(index, { description: e.target.value })}
                    placeholder="e.g. Women's denim jacket, size M, light blue"
                    rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white resize-none focus:outline-none focus:border-[#DB2777]"
                  />
                  {errors[`item-${index}-desc`] && (
                    <p className="text-red-500 text-xs mt-1">{errors[`item-${index}-desc`]}</p>
                  )}
                </div>

                <div className="mb-3">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={e => updateItem(index, { quantity: e.target.value })}
                    className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#DB2777]"
                  />
                  {errors[`item-${index}-qty`] && (
                    <p className="text-red-500 text-xs mt-1">{errors[`item-${index}-qty`]}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Reference image <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <input
                    ref={el => { fileInputRefs.current[index] = el }}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) updateItem(index, { imageFile: file, uploadError: null })
                    }}
                  />
                  {item.imageFile ? (
                    <div className="border border-pink-200 rounded-lg p-3 bg-white flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center text-xl flex-shrink-0">📷</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-700 truncate">{item.imageFile.name}</p>
                        <p className="text-xs text-gray-400">Image selected ✓</p>
                      </div>
                      <button
                        onClick={() => {
                          updateItem(index, { imageFile: null, uploadError: null })
                          if (fileInputRefs.current[index]) fileInputRefs.current[index]!.value = ''
                        }}
                        className="text-[#DB2777] text-lg leading-none"
                      >×</button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRefs.current[index]?.click()}
                      className="w-full border-2 border-dashed border-pink-200 rounded-lg p-3 flex items-center gap-3 hover:border-[#DB2777] hover:bg-pink-50 transition-colors text-left"
                    >
                      <div className="w-9 h-9 bg-pink-100 rounded-lg flex items-center justify-center text-lg flex-shrink-0">📷</div>
                      <div>
                        <p className="text-xs font-semibold text-gray-700">Upload a photo or screenshot</p>
                        <p className="text-xs text-gray-400">JPG, PNG or WebP · Max 5MB</p>
                      </div>
                    </button>
                  )}
                  {item.uploadError && (
                    <p className="text-amber-600 text-xs mt-1">{item.uploadError}</p>
                  )}
                </div>
              </div>
            ))}

            <button
              onClick={addItem}
              className="w-full border-2 border-dashed border-[#DB2777] rounded-lg py-2.5 text-sm font-semibold text-[#DB2777] hover:bg-pink-50 transition-colors"
            >
              ＋ Add another item
            </button>
          </div>

          {/* Budget */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <label className="block text-xs font-semibold text-green-800 mb-1">
              💰 Total estimated budget (KES){' '}
              <span className="font-normal text-green-600">— for the whole order</span>
            </label>
            <input
              type="text"
              value={budget}
              onChange={e => setBudget(e.target.value)}
              placeholder="e.g. 10,000"
              className="w-full border border-green-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-green-500"
            />
          </div>

          {/* Contact */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Your Contact</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Full name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Jane Wanjiku"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#DB2777]"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Phone number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="0712 345 678"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#DB2777]"
                />
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-[#25D366] hover:bg-[#1DA851] text-white rounded-lg py-3.5 font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            {isSubmitting ? 'Uploading images...' : 'Send Order via WhatsApp'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/products/ChinaOrderModal.tsx
git commit -m "feat: add ChinaOrderModal form component"
```

---

## Task 5: ChinaOrderBanner + Wire Into Products Page

**Files:**
- Create: `src/components/products/ChinaOrderBanner.tsx`
- Modify: `src/app/(marketplace)/products/page.tsx`

- [ ] **Step 1: Create the banner component**

```typescript
// src/components/products/ChinaOrderBanner.tsx
'use client'

import { useState } from 'react'
import ChinaOrderModal from './ChinaOrderModal'

export default function ChinaOrderBanner() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <div className="bg-gradient-to-r from-[#DB2777] to-[#EC4899] rounded-xl p-4 flex items-center gap-4 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-28 h-28 rounded-full bg-white/10 translate-x-8 -translate-y-8 pointer-events-none" />
        <div className="absolute bottom-0 right-20 w-20 h-20 rounded-full bg-white/[0.06] translate-y-8 pointer-events-none" />
        <span className="text-4xl flex-shrink-0">🇨🇳</span>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm sm:text-base">Don't see exactly what you want?</p>
          <p className="text-white/85 text-xs sm:text-sm">Place a custom order — describe any product and we'll source it from China for you</p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="flex-shrink-0 bg-white text-[#DB2777] font-bold text-xs sm:text-sm px-4 py-2.5 rounded-lg shadow hover:shadow-md transition-shadow whitespace-nowrap"
        >
          ✍️ Place Custom Order
        </button>
      </div>
      {isOpen && <ChinaOrderModal onClose={() => setIsOpen(false)} />}
    </>
  )
}
```

- [ ] **Step 2: Add the import to the products page**

At the top of `src/app/(marketplace)/products/page.tsx`, add after the existing imports:

```typescript
import ChinaOrderBanner from "@/components/products/ChinaOrderBanner";
```

- [ ] **Step 3: Render the banner in the products page**

In `src/app/(marketplace)/products/page.tsx`, find the Results Count comment (around line 235):

```tsx
      {/* Results Count */}
      {productsWithStock.length > 0 && (
```

Insert immediately before it:

```tsx
      {/* China Order Banner */}
      {searchParams.china === 'true' && <ChinaOrderBanner />}

      {/* Results Count */}
      {productsWithStock.length > 0 && (
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Test manually**

```bash
npm run dev
```

Open http://localhost:3000/products and verify:

1. Click **🇨🇳 From China** filter — pink banner appears above the product grid
2. Click **✍️ Place Custom Order** — modal opens with one empty product row
3. Fill Item 1: description "Blue denim jacket size M", qty 2 — upload a JPG — filename appears with ✓
4. Click **＋ Add another item** — second row appears
5. Fill Item 2: description "White sneakers size 40", qty 1, no image
6. Enter budget "10,000", name "Test User", phone "0712345678"
7. Click **Send Order via WhatsApp** — button shows "Uploading images..." briefly, then WhatsApp opens with a pre-filled message containing both items, image URL for item 1, budget, and footer
8. Click the × or outside the modal — modal closes and state resets on next open
9. Click **All Products** filter — banner disappears

- [ ] **Step 6: Run all tests**

```bash
npx jest --no-coverage
```

Expected: all tests pass (including pre-existing tests)

- [ ] **Step 7: Commit**

```bash
git add src/components/products/ChinaOrderBanner.tsx src/app/(marketplace)/products/page.tsx
git commit -m "feat: add China order banner and wire into products page"
```
