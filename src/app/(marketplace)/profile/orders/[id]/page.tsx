'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

type OrderItem = {
  id: string
  product_name: string
  product_image: string | null
  size: string | null
  color: string | null
  quantity: number
  unit_price: number
}

type Order = {
  id: string
  order_number: string
  date: string
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded'
  payment_method: string
  total_amount: number
  items: OrderItem[]
}

const TIMELINE_STEPS: Array<Order['status']> = ['pending', 'processing', 'completed']

const TERMINAL_STATUSES: Array<Order['status']> = ['cancelled', 'refunded']

function StatusTimeline({ status }: { status: Order['status'] }) {
  if (TERMINAL_STATUSES.includes(status)) {
    return (
      <div className="mb-6">
        <span className="inline-block px-3 py-1.5 rounded-full text-sm font-semibold bg-gray-100 text-gray-600 capitalize">
          Order {status}
        </span>
      </div>
    )
  }

  const currentIndex = TIMELINE_STEPS.indexOf(status)

  return (
    <div className="mb-6">
      <div className="flex items-center">
        {TIMELINE_STEPS.map((step, i) => {
          const isCompleted = i <= currentIndex
          const isLast = i === TIMELINE_STEPS.length - 1
          return (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                    isCompleted
                      ? 'bg-primary border-primary text-white'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}
                >
                  {isCompleted ? '✓' : i + 1}
                </div>
                <span className={`mt-1 text-xs capitalize ${isCompleted ? 'text-primary font-semibold' : 'text-gray-400'}`}>
                  {step}
                </span>
              </div>
              {!isLast && (
                <div
                  className={`flex-1 h-0.5 mx-1 mb-4 ${i < currentIndex ? 'bg-primary' : 'bg-gray-200'}`}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function OrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/signin')
        setLoading(false)
        return
      }
      fetch('/api/orders/customer')
        .then((r) => r.json())
        .then((data) => {
          if (data.error) throw new Error(data.error)
          const found = data.orders.find((o: Order) => o.id === orderId)
          if (!found) throw new Error('Order not found')
          setOrder(found)
        })
        .catch((e) => setError(e.message ?? 'Failed to load order'))
        .finally(() => setLoading(false))
    })
  }, [router, orderId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <p className="text-red-600">{error ?? 'Order not found'}</p>
          <Link href="/profile/orders" className="text-sm text-primary mt-4 block">
            ← Back to My Orders
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <Link href="/profile/orders" className="text-sm text-gray-500 hover:text-gray-700">
            ← My Orders
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">{order.order_number}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date(order.date).toLocaleDateString('en-KE', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
            {' · '}
            {order.payment_method.toUpperCase()}
          </p>
        </div>

        {/* Status timeline */}
        <div className="bg-white shadow rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Order Status</h2>
          <StatusTimeline status={order.status} />
        </div>

        {/* Items */}
        <div className="bg-white shadow rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Items</h2>
          <div className="divide-y divide-gray-100">
            {order.items.map((item) => (
              <div key={item.id} className="py-4 flex gap-4 items-start">
                {item.product_image ? (
                  <Image
                    src={item.product_image}
                    alt={item.product_name}
                    width={64}
                    height={64}
                    className="rounded-xl object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gray-100 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{item.product_name}</p>
                  {(item.size || item.color) && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {[item.size, item.color].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 mt-0.5">Qty: {item.quantity}</p>
                </div>
                <p className="font-semibold text-gray-900 flex-shrink-0">
                  KSh {(item.quantity * item.unit_price).toLocaleString('en-KE')}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="bg-white shadow rounded-2xl p-6">
          <div className="flex justify-between items-center">
            <span className="font-bold text-gray-900 text-lg">Total</span>
            <span className="font-bold text-gray-900 text-lg">
              KSh {order.total_amount.toLocaleString('en-KE')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
