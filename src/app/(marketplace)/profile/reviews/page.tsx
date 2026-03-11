'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import StarRating from '@/components/reviews/StarRating'

type MyReview = {
  id: string
  product_id: string
  product_name: string
  rating: number
  text: string
  status: 'pending' | 'approved'
  image_urls: string[]
  created_at: string
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-700',
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Under Review',
  approved: 'Published',
}

type FilterTab = 'all' | 'pending' | 'approved'

export default function MyReviewsPage() {
  const router = useRouter()
  const [reviews, setReviews] = useState<MyReview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<FilterTab>('all')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/signin')
        setLoading(false)
        return
      }
      fetch('/api/reviews/my')
        .then((r) => r.json())
        .then((data) => {
          if (data.error) throw new Error(data.error)
          setReviews(data.data ?? [])
        })
        .catch(() => setError('Failed to load your reviews.'))
        .finally(() => setLoading(false))
    })
  }, [router])

  const filtered = tab === 'all' ? reviews : reviews.filter((r) => r.status === tab)

  const tabCount = (t: FilterTab) =>
    t === 'all' ? reviews.length : reviews.filter((r) => r.status === t).length

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
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Link href="/profile" className="text-sm text-gray-500 hover:text-gray-700">
            ← Profile
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">My Reviews</h1>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-2xl mb-6">{error}</div>
        )}

        {/* Filter Tabs */}
        {reviews.length > 0 && (
          <div className="flex gap-2 mb-5">
            {(['all', 'pending', 'approved'] as FilterTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                  tab === t
                    ? 'bg-primary-dark text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 shadow-sm'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
                <span className="ml-1.5 text-xs opacity-70">({tabCount(t)})</span>
              </button>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!error && filtered.length === 0 && (
          <div className="bg-white shadow rounded-2xl p-10 text-center">
            <div className="w-14 h-14 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-primary-dark" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
            </div>
            <p className="text-gray-600 font-medium mb-1">
              {tab === 'all' ? "You haven't written any reviews yet." : `No ${tab} reviews.`}
            </p>
            {tab === 'all' && (
              <p className="text-gray-400 text-sm mb-5">
                Shop and share your experience to earn loyalty points.
              </p>
            )}
            {tab === 'all' && (
              <Link
                href="/home"
                className="px-5 py-2.5 bg-primary text-white font-semibold rounded-none hover:bg-primary-dark transition-all"
              >
                Start Shopping
              </Link>
            )}
          </div>
        )}

        {/* Review Cards */}
        <div className="space-y-4">
          {filtered.map((review) => (
            <div key={review.id} className="bg-white shadow rounded-2xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/products/${review.product_id}`}
                    className="font-semibold text-gray-900 hover:text-primary-dark transition-colors line-clamp-1"
                  >
                    {review.product_name}
                  </Link>
                  <div className="flex items-center gap-3 mt-1.5">
                    <StarRating rating={review.rating} size="sm" readonly />
                    <span className="text-xs text-gray-400">
                      {new Date(review.created_at).toLocaleDateString('en-KE', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">{review.text}</p>
                  {review.image_urls?.length > 0 && (
                    <p className="mt-1.5 text-xs text-gray-400">
                      {review.image_urls.length} photo{review.image_urls.length > 1 ? 's' : ''} attached
                    </p>
                  )}
                </div>
                <span
                  className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BADGE[review.status] ?? 'bg-gray-100 text-gray-600'}`}
                >
                  {STATUS_LABEL[review.status] ?? review.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
