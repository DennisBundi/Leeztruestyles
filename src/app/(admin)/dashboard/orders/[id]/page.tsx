'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface OrderApiResponse {
  order?: AdminOrderDetail
  error?: string
}

interface UpdateApiResponse {
  error?: string
}

type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded' | 'paid' | 'shipped' | 'delivered'

interface AdminOrderDetail {
  id: string
  order_number: string
  date: string
  status: OrderStatus
  payment_method: string
  sale_type: string
  total_amount: number
  customer: { full_name: string; email: string; phone: string | null }
  seller: string | null
  items: {
    id: string
    product_id: string
    product_name: string
    product_image: string | null
    size: string | null
    color: string | null
    quantity: number
    unit_price: number
  }[]
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-yellow-500/20 text-yellow-300',
  processing: 'bg-blue-500/20 text-blue-300',
  completed: 'bg-green-500/20 text-green-300',
  cancelled: 'bg-white/10 text-white/60',
  refunded: 'bg-red-500/20 text-red-300',
  paid: 'bg-emerald-500/20 text-emerald-300',
  shipped: 'bg-indigo-500/20 text-indigo-300',
  delivered: 'bg-green-500/20 text-green-300',
}

const ALL_STATUSES: OrderStatus[] = ['pending', 'processing', 'completed', 'cancelled', 'refunded', 'paid', 'shipped', 'delivered']

export default function AdminOrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = Array.isArray(params.id) ? params.id[0] : (params.id ?? '')

  const [order, setOrder] = useState<AdminOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [feedbackType, setFeedbackType] = useState<'success' | 'error' | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => {
    setFeedbackMessage(null)
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/signin')
        setLoading(false)
        return
      }
      fetch(`/api/orders/${orderId}`)
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.json()
        })
        .then((data: OrderApiResponse) => {
          if (data.error === 'Forbidden' || data.error === 'Unauthorized') {
            router.push('/')
            return
          }
          if (data.error) throw new Error(data.error)
          setOrder(data.order ?? null)
        })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : 'Failed to load order.'
          setError(message)
        })
        .finally(() => setLoading(false))
    }).catch(() => {
      setError('Failed to verify authentication.')
      setLoading(false)
    })
  }, [router, orderId])

  async function handleStatusUpdate(newStatus: OrderStatus) {
    if (!order || newStatus === order.status || updatingStatus) return
    setUpdatingStatus(true)
    setFeedbackMessage(null)
    try {
      const res = await fetch('/api/orders/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id, status: newStatus }),
      })
      const data: UpdateApiResponse = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? 'Update failed')
      setOrder((prev) => (prev ? { ...prev, status: newStatus } : prev))
      setFeedbackMessage(`Status updated to "${newStatus}".`)
      setFeedbackType('success')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update status.'
      setFeedbackMessage(message)
      setFeedbackType('error')
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <Link href="/dashboard/orders" className="text-sm text-white/50 hover:text-white">
              ← Orders
            </Link>
          </div>
          <div className="bg-red-50 text-red-700 p-4 rounded-2xl">{error ?? 'Order not found.'}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 pt-16 lg:pt-12">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/orders" className="text-sm text-white/50 hover:text-white">
              ← Orders
            </Link>
            <h1 className="text-2xl font-bold text-white">{order.order_number}</h1>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-semibold capitalize ${STATUS_COLORS[order.status]}`}
          >
            {order.status}
          </span>
        </div>

        {/* Order Meta card */}
        <div className="glass-card p-6 mb-4">
          <h2 className="text-sm font-semibold text-white/70 mb-3">Order Details</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-white/50">Date</p>
              <p className="font-medium text-white">
                {new Date(order.date).toLocaleDateString('en-KE', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div>
              <p className="text-white/50">Payment Method</p>
              <p className="font-medium text-white">{order.payment_method.toUpperCase()}</p>
            </div>
            <div>
              <p className="text-white/50">Type</p>
              <p className="font-medium text-white capitalize">{order.sale_type}</p>
            </div>
            {order.seller && (
              <div>
                <p className="text-white/50">Seller</p>
                <p className="font-medium text-white">{order.seller}</p>
              </div>
            )}
          </div>
        </div>

        {/* Customer card */}
        <div className="glass-card p-6 mb-4">
          <h2 className="text-sm font-semibold text-white/70 mb-3">Customer</h2>
          <div className="text-sm space-y-1">
            <p className="font-medium text-white">{order.customer.full_name}</p>
            <p className="text-white/50">{order.customer.email}</p>
            {order.customer.phone && (
              <p className="text-white/50">{order.customer.phone}</p>
            )}
          </div>
        </div>

        {/* Status Update card */}
        <div className="glass-card p-6 mb-4">
          <h2 className="text-sm font-semibold text-white/70 mb-3">Update Status</h2>
          <div className="flex flex-wrap gap-2">
            {ALL_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => handleStatusUpdate(s)}
                disabled={updatingStatus}
                aria-pressed={order.status === s}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold capitalize transition-all border-2 ${
                  order.status === s
                    ? `${STATUS_COLORS[s]} border-current ring-2 ring-offset-1 ring-current`
                    : 'bg-white/5 text-white/60 border-white/20 hover:bg-white/10'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {s}
              </button>
            ))}
          </div>
          {feedbackMessage && (
            <p className={`mt-2 text-xs ${feedbackType === 'success' ? 'text-green-600' : 'text-red-600'}`}>{feedbackMessage}</p>
          )}
        </div>

        {/* Items card */}
        <div className="glass-card p-6 mb-4">
          <h2 className="text-base font-semibold text-white mb-4">
            Items ({order.items.length})
          </h2>
          <div className="divide-y divide-white/10">
            {order.items.map((item) => (
              <div key={item.id} className="py-4 flex items-center gap-4">
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                  {item.product_image ? (
                    <Image
                      src={item.product_image}
                      alt={item.product_name}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/30">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 20.25h18A1.5 1.5 0 0022.5 18.75V6.75A1.5 1.5 0 0021 5.25H3A1.5 1.5 0 001.5 6.75v12c0 .828.672 1.5 1.5 1.5z"
                        />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{item.product_name}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {item.size && (
                      <span className="text-xs bg-white/10 text-white/60 px-2 py-0.5 rounded-full">
                        {item.size}
                      </span>
                    )}
                    {item.color && (
                      <span className="text-xs bg-white/10 text-white/60 px-2 py-0.5 rounded-full">
                        {item.color}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white/50 mt-1">
                    Qty: {item.quantity} × KSh {item.unit_price.toLocaleString('en-KE')}
                  </p>
                </div>

                {/* Line total */}
                <p className="font-semibold text-white flex-shrink-0">
                  KSh {(item.quantity * item.unit_price).toLocaleString('en-KE')}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Total card */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold text-white/70">Order Total</span>
            <span className="text-xl font-bold text-white">
              KSh {order.total_amount.toLocaleString('en-KE')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
