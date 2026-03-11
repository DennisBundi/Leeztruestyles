'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-600',
  refunded: 'bg-gray-100 text-gray-600',
}

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/signin')
        return
      }
      fetch('/api/orders/customer')
        .then((r) => r.json())
        .then((data) => {
          if (data.error) throw new Error(data.error)
          setOrders(data.orders)
        })
        .catch(() => setError('Failed to load orders'))
        .finally(() => setLoading(false))
    })
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/profile" className="text-sm text-gray-500 hover:text-gray-700">
            ← Profile
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6">{error}</div>
        )}

        {!error && orders.length === 0 && (
          <div className="bg-white shadow rounded-2xl p-8 text-center">
            <p className="text-gray-500 mb-4">You haven't placed any orders yet.</p>
            <Link
              href="/home"
              className="px-5 py-2.5 bg-primary text-white font-semibold rounded-none hover:bg-primary-dark transition-all"
            >
              Start Shopping
            </Link>
          </div>
        )}

        <div className="space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/profile/orders/${order.id}`}
              className="block bg-white shadow rounded-2xl p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-bold text-gray-900">{order.order_number}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {new Date(order.date).toLocaleDateString('en-KE', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-gray-900">
                    KSh {order.total_amount.toLocaleString()}
                  </p>
                  <span
                    className={`mt-1 inline-block text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_STYLES[order.status] ?? 'bg-gray-100 text-gray-600'}`}
                  >
                    {order.status}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
