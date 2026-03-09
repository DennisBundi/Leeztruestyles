'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';
import Link from 'next/link';

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const clearCart = useCartStore((state) => state.clearCart);

  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [error, setError] = useState('');

  useEffect(() => {
    const reference = searchParams.get('reference') || searchParams.get('trxref');

    if (!reference) {
      setStatus('failed');
      setError('No payment reference found. Please contact support.');
      return;
    }

    const verifyPayment = async () => {
      try {
        const response = await fetch(`/api/payments/verify?reference=${encodeURIComponent(reference)}`);
        const data = await response.json();

        if (data.success && data.order_id) {
          setStatus('success');
          clearCart();
          router.push(`/checkout/success?order_id=${data.order_id}`);
        } else {
          setStatus('failed');
          setError(data.error || 'Payment verification failed. If you were charged, please contact support.');
        }
      } catch (err) {
        setStatus('failed');
        setError('Could not verify payment. If you were charged, please contact support.');
      }
    };

    verifyPayment();
  }, [searchParams, router, clearCart]);

  if (status === 'verifying') {
    return (
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-6" />
        <h1 className="text-2xl font-bold mb-2">Verifying your payment...</h1>
        <p className="text-gray-600">Please wait while we confirm your payment. Do not close this page.</p>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">Payment Verification Failed</h1>
        <p className="text-gray-600 mb-6">{error}</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/checkout"
            className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-all"
          >
            Try Again
          </Link>
          <Link
            href="/contact"
            className="px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:border-primary hover:text-primary transition-all"
          >
            Contact Support
          </Link>
        </div>
      </div>
    );
  }

  // Success state — user is being redirected
  return (
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
      <h1 className="text-2xl font-bold mb-2">Payment confirmed!</h1>
      <p className="text-gray-600">Redirecting to your order summary...</p>
    </div>
  );
}

export default function CheckoutCallbackPage() {
  return (
    <div className="container mx-auto px-4 py-16 md:py-24 min-h-[60vh] flex items-center justify-center">
      <Suspense fallback={
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <p className="text-gray-600">Loading...</p>
        </div>
      }>
        <CallbackContent />
      </Suspense>
    </div>
  );
}
