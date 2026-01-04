
'use client'

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { signup } from '@/app/auth/actions';

import { Suspense } from 'react';

function SignUpContent() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Note: We redirect immediately on success, so this success message UI is kept as fallback
  // but should rarely be seen since redirect happens quickly
  // Moved after all hooks to comply with Rules of Hooks

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('[SignUp] Form submitted');
    setError(null);
    setSuccessMessage(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        console.log('[SignUp] Starting signup process...');
        const result = await signup(formData);
        console.log('[SignUp] Signup result:', result);
        
        if (result?.error) {
          console.log('[SignUp] Signup error:', result.error);
          setError(result.error);
        } else if (result?.success || result?.message) {
          console.log('[SignUp] Signup success:', result.message);
          // Redirect after successful signup
          const redirectTo = redirectUrl || "/";
          console.log('[SignUp] Redirecting to:', redirectTo);
          console.log('[SignUp] Redirect URL from params:', redirectUrl);
          
          // Clear caches before redirect to prevent chunk load errors
          const clearCaches = async () => {
            if (typeof window !== 'undefined' && 'caches' in window) {
              try {
                const names = await caches.keys();
                await Promise.all(
                  names
                    .filter((name) => name.includes('next'))
                    .map((name) => caches.delete(name))
                );
                console.log('[SignUp] Caches cleared');
              } catch (err) {
                console.warn('[SignUp] Failed to clear caches:', err);
              }
            }
          };
          
          // Clear caches first, then redirect with full page reload
          clearCaches().then(() => {
            setTimeout(() => {
              console.log('[SignUp] Executing redirect to:', redirectTo);
              // Use window.location.href with cache bypass to force fresh page load
              const separator = redirectTo.includes('?') ? '&' : '?';
              window.location.href = `${redirectTo}${separator}_t=${Date.now()}`;
            }, 200);
          });
        }
      } catch (err: any) {
        console.error("[SignUp] Signup error:", err);
        setError(err?.message || "An error occurred during signup. Please try again.");
      }
    });
  };

  // Conditional return must be after all hooks
  if (successMessage && !isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-light/40 via-white to-primary/20 p-4">
        <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8 sm:p-10 text-center animate-in zoom-in-95 duration-300">
          <div className="rounded-full bg-green-100 p-4 mx-auto w-20 h-20 flex items-center justify-center mb-6 shadow-inner">
            <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Account Created!</h2>
          <p className="text-gray-600 mb-8 text-lg">
            You have successfully signed up. Welcome to Leez True Styles!
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={() => window.location.href = redirectUrl}
              className="inline-flex justify-center w-full py-3.5 px-4 rounded-none text-base font-bold text-white bg-primary hover:bg-primary-dark shadow-lg shadow-primary/30 transform transition-all duration-200 hover:-translate-y-0.5"
            >
              {redirectUrl === '/' ? 'Continue Shopping' : 'Continue to Checkout'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-light/40 via-white to-primary/20 relative overflow-hidden py-12">
      {/* Decorative background blobs */}
      <div className="absolute top-[-10%] left-[-5%] w-96 h-96 bg-primary/30 rounded-full blur-3xl opacity-50 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-secondary/20 rounded-full blur-3xl opacity-50 pointer-events-none" />

      <div className="w-full max-w-md p-4 relative z-10">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8 sm:p-10">
          <div className="text-center mb-8">
            <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-secondary-dark to-primary-dark bg-clip-text text-transparent">
                Create Account
              </h1>
            </Link>
            <p className="mt-3 text-gray-600 font-medium tracking-wide">
              Join Leeztruestyles today
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
            <div>
              <label
                htmlFor="fullName"
                className="block text-sm font-semibold text-gray-700 ml-1 mb-2"
              >
                Full Name
              </label>
              <div className="relative group">
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  className="block w-full px-5 py-3.5 rounded-2xl border border-gray-200 bg-white/50 focus:bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200 ease-in-out shadow-sm group-hover:shadow-md"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-gray-700 ml-1 mb-2"
              >
                Email address
              </label>
              <div className="relative group">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full px-5 py-3.5 rounded-2xl border border-gray-200 bg-white/50 focus:bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200 ease-in-out shadow-sm group-hover:shadow-md"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-gray-700 ml-1 mb-2"
              >
                Password
              </label>
              <div className="relative group">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  className="block w-full px-5 py-3.5 rounded-2xl border border-gray-200 bg-white/50 focus:bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200 ease-in-out shadow-sm group-hover:shadow-md"
                  placeholder="••••••••"
                />
                <p className="mt-2 text-xs text-gray-500 ml-1">Must be at least 6 characters</p>
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            )}


            <div className="pt-2">
              <button
                type="submit"
                disabled={isPending}
                onClick={(e) => {
                  console.log('[SignUp] Button clicked, isPending:', isPending);
                }}
                className="w-full flex justify-center py-3.5 px-4 rounded-none text-base font-bold text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary shadow-lg shadow-primary/30 transform transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 relative z-10 pointer-events-auto"
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Account...
                  </span>
                ) : (
                  'Sign Up'
                )}
              </button>
            </div>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white/50 backdrop-blur px-4 text-gray-500 font-medium">
                  Already have an account?
                </span>
              </div>
            </div>

            <div className="mt-8 text-center">
              <Link
                href="/signin"
                className="inline-flex items-center justify-center font-bold text-secondary-dark hover:text-secondary transition-colors"
              >
                Sign in instead
                <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <SignUpContent />
    </Suspense>
  );
}
