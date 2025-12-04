'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');

  return (
    <div className="container mx-auto px-4 py-16 md:py-24">
      <div className="max-w-2xl mx-auto text-center animate-fade-in">
        {/* Success Icon */}
        <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg animate-scale-in">
          <svg
            className="w-12 h-12 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        {/* Success Message */}
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
          Order Placed Successfully! 🎉
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-lg mx-auto">
          Thank you for your purchase! Your order has been received and is being processed. You'll receive a confirmation email shortly.
        </p>

        {/* Order ID */}
        {orderId && (
          <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-6 mb-8 inline-block">
            <p className="text-sm text-gray-600 mb-2">Order ID</p>
            <p className="text-lg font-mono font-bold text-primary">{orderId}</p>
          </div>
        )}

        {/* Next Steps */}
        <div className="bg-gradient-to-br from-primary/10 to-primary-light/10 rounded-2xl p-6 mb-8 text-left">
          <h2 className="text-xl font-bold mb-4 text-gray-900">What's Next?</h2>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start gap-3">
              <svg className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>You'll receive an order confirmation email</span>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>We'll process your order and prepare it for shipping</span>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>You'll get tracking information once your order ships</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/products"
            className="px-8 py-4 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark hover:shadow-xl transition-all hover:scale-105"
          >
            Continue Shopping
          </Link>
          <Link
            href="/"
            className="px-8 py-4 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:border-primary hover:text-primary transition-all"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

