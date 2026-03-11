'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import type { CustomerOrder } from '../types'

const TIMELINE_STEPS: Array<CustomerOrder['status']> = ['pending', 'processing', 'completed']
const TERMINAL_STATUSES: Array<CustomerOrder['status']> = ['cancelled', 'refunded']

function StatusTimeline({ status }: { status: CustomerOrder['status'] }) {
  if (TERMINAL_STATUSES.includes(status)) {
    return (
      <div className="mb-2">
        <span className="inline-block px-3 py-1.5 rounded-full text-sm font-semibold bg-gray-100 text-gray-600 capitalize">
          Order {status}
        </span>
      </div>
    )
  }

  const currentIndex = TIMELINE_STEPS.indexOf(status)

  return (
    <div className="mb-2">
      <div className="flex items-center">
        {TIMELINE_STEPS.map((step, i) => {
          const isActive = i <= currentIndex
          const isLast = i === TIMELINE_STEPS.length - 1
          return (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                    isActive
                      ? 'bg-primary border-primary text-white'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}
                >
                  {isActive ? '✓' : i + 1}
                </div>
                <span className={`mt-1 text-xs capitalize ${isActive ? 'text-primary font-semibold' : 'text-gray-400'}`}>
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
  const orderId = Array.isArray(params.id) ? params.id[0] : (params.id ?? '')

  const [order, setOrder] = useState<CustomerOrder | null>(null)
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
          const found = (data.orders as CustomerOrder[]).find((o) => o.id === orderId)
          if (!found) {
            setError('Order not found.')
          } else {
            setOrder(found)
          }
        })
        .catch(() => setError('Failed to load order.'))
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
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6 flex items-center gap-4">
            <Link href="/profile/orders" className="text-sm text-gray-500 hover:text-gray-700">
              ← My Orders
            </Link>
          </div>
          <div className="bg-red-50 text-red-700 p-4 rounded-2xl">{error ?? 'Order not found.'}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Link href="/profile/orders" className="text-sm text-gray-500 hover:text-gray-700">
            ← My Orders
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{order.order_number}</h1>
        </div>

        {/* Order Meta */}
        <div className="bg-white shadow rounded-2xl p-6 mb-4">
          <p className="text-sm text-gray-500 mb-1">
            {new Date(order.date).toLocaleDateString('en-KE', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
            {' · '}
            {order.payment_method.toUpperCase()}
          </p>
        </div>

        {/* Status Timeline */}
        <div className="bg-white shadow rounded-2xl p-6 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Order Status</h2>
          <StatusTimeline status={order.status} />
        </div>

        {/* Items Card */}
        <div className="bg-white shadow rounded-2xl p-6 mb-4">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Items ({order.items.length})
          </h2>
          <div className="divide-y divide-gray-100">
            {order.items.map((item) => (
              <div key={item.id} className="py-4 flex items-center gap-4">
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  {item.product_image ? (
                    <Image
                      src={item.product_image}
                      alt={item.product_name}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 20.25h18A1.5 1.5 0 0022.5 18.75V6.75A1.5 1.5 0 0021 5.25H3A1.5 1.5 0 001.5 6.75v12c0 .828.672 1.5 1.5 1.5z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{item.product_name}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {item.size && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {item.size}
                      </span>
                    )}
                    {item.color && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {item.color}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Qty: {item.quantity} × KSh {item.unit_price.toLocaleString('en-KE')}
                  </p>
                  {order.status === 'completed' && (
                    <Link
                      href={`/products/${item.product_id}`}
                      className="inline-flex items-center gap-1 mt-2 text-sm font-semibold text-primary-dark hover:text-primary transition-colors"
                    >
                      Write a Review
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </Link>
                  )}
                </div>

                {/* Line total */}
                <p className="font-semibold text-gray-900 flex-shrink-0">
                  KSh {(item.quantity * item.unit_price).toLocaleString('en-KE')}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Order Total */}
        <div className="bg-white shadow rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold text-gray-900">Order Total</span>
            <span className="text-xl font-bold text-gray-900">
              KSh {order.total_amount.toLocaleString('en-KE')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
