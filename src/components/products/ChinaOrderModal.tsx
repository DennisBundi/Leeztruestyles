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
            <p className="text-sm opacity-85">
              Describe what you&apos;d like sourced — we&apos;ll reach out to confirm &amp; arrange delivery
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-2xl leading-none ml-2"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Items */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Your Items</p>
            {items.map((item, index) => (
              <div key={index} className="bg-pink-50 border border-pink-200 rounded-xl p-4 mb-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#DB2777]">
                    Item {index + 1}
                  </span>
                  {items.length > 1 && (
                    <button
                      onClick={() => removeItem(index)}
                      className="w-5 h-5 bg-pink-100 rounded-full flex items-center justify-center text-[#DB2777] font-bold text-sm"
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="mb-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Product description
                  </label>
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
                    Reference image{' '}
                    <span className="font-normal text-gray-400">(optional)</span>
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
                      <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center text-xl flex-shrink-0">
                        📷
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-700 truncate">
                          {item.imageFile.name}
                        </p>
                        <p className="text-xs text-gray-400">Image selected ✓</p>
                      </div>
                      <button
                        onClick={() => {
                          updateItem(index, { imageFile: null, uploadError: null })
                          if (fileInputRefs.current[index]) fileInputRefs.current[index]!.value = ''
                        }}
                        className="text-[#DB2777] text-lg leading-none"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRefs.current[index]?.click()}
                      className="w-full border-2 border-dashed border-pink-200 rounded-lg p-3 flex items-center gap-3 hover:border-[#DB2777] hover:bg-pink-50 transition-colors text-left"
                    >
                      <div className="w-9 h-9 bg-pink-100 rounded-lg flex items-center justify-center text-lg flex-shrink-0">
                        📷
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-700">
                          Upload a photo or screenshot
                        </p>
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
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
              Your Contact
            </p>
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
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            {isSubmitting ? 'Uploading images...' : 'Send Order via WhatsApp'}
          </button>
        </div>
      </div>
    </div>
  )
}
