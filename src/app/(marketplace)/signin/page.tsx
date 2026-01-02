
'use client'

import React, { useState, useEffect, useRef, Suspense, useTransition } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { login } from '@/app/auth/actions';

function SignInContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirectParam = searchParams.get('redirect');
  const errorParam = searchParams.get('error');
  const [error, setError] = useState<string | null>(errorParam ? decodeURIComponent(errorParam) : null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    console.log('[SignIn] Component mounted');
    const form = formRef.current;
    const button = buttonRef.current;
    if (form) {
      console.log('[SignIn] Form element found');
    }
    if (button) {
      console.log('[SignIn] Button element found:', button);
      // Test if button is clickable
      button.addEventListener('click', (e) => {
        console.log('[SignIn] Native click listener fired!');
      }, { once: true });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[SignIn] ===== FORM SUBMISSION STARTED =====');
    setError(null);

    const formData = new FormData(e.currentTarget);
    console.log('[SignIn] FormData extracted:', {
      email: formData.get('email'),
      hasPassword: !!formData.get('password')
    });

    startTransition(async () => {
      try {
        console.log('[SignIn] Starting login process...');
        await login(formData);
        // If login succeeds, redirect() will be called in the server action
        console.log('[SignIn] Login completed - redirect should happen');
      } catch (err: any) {
        // Next.js redirect() throws NEXT_REDIRECT error - this is expected
        if (err?.digest?.startsWith('NEXT_REDIRECT')) {
          console.log('[SignIn] Redirect detected - letting Next.js handle it');
          throw err; // Re-throw so Next.js handles the redirect
        }
        // Actual error - display to user
        console.error('[SignIn] Login error:', err);
        setError(err?.message || 'An error occurred during login. Please try again.');
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-light/40 via-white to-primary/20 relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-primary/30 rounded-full blur-3xl opacity-50 pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-secondary/20 rounded-full blur-3xl opacity-50 pointer-events-none" />

      <div className="w-full max-w-md p-8 relative z-[60]" style={{ isolation: 'isolate' }}>
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8 sm:p-10 relative z-[60]">
          <div className="text-center mb-10">
            <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-secondary-dark to-primary-dark bg-clip-text text-transparent">
                Leeztruestyles
              </h1>
            </Link>
            <p className="mt-3 text-gray-600 font-medium tracking-wide">
              Welcome back
            </p>
          </div>

          <form 
            ref={formRef}
            onSubmit={handleSubmit}
            className="space-y-6 relative z-[60]"
            style={{ isolation: 'isolate', position: 'relative', zIndex: 60 }}
          >
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
                  autoComplete="current-password"
                  required
                  className="block w-full px-5 py-3.5 rounded-2xl border border-gray-200 bg-white/50 focus:bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200 ease-in-out shadow-sm group-hover:shadow-md"
                  placeholder="••••••••"
                />
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


            <div className="relative z-[70]" style={{ pointerEvents: 'auto', isolation: 'isolate', position: 'relative' }}>
              <button
                ref={buttonRef}
                type="submit"
                disabled={isPending}
                onClick={(e) => {
                  console.log('[SignIn] Button onClick triggered!', { isPending, type: e.type, target: e.target });
                  // Don't prevent default - let form onSubmit handle it
                }}
                onMouseDown={(e) => {
                  console.log('[SignIn] Button onMouseDown triggered!');
                  e.stopPropagation(); // Prevent event bubbling to Header
                }}
                onMouseUp={(e) => {
                  console.log('[SignIn] Button onMouseUp triggered!');
                  e.stopPropagation(); // Prevent event bubbling to Header
                }}
                style={{ 
                  pointerEvents: 'auto', 
                  cursor: isPending ? 'not-allowed' : 'pointer', 
                  zIndex: 70,
                  position: 'relative',
                  isolation: 'isolate',
                  width: '100%'
                }}
                className="w-full flex justify-center py-3.5 px-4 rounded-none text-base font-bold text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary shadow-lg shadow-primary/30 transform transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 relative z-[70]"
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
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
                  New to Leeztruestyles?
                </span>
              </div>
            </div>

            <div className="mt-8 text-center">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center font-bold text-secondary-dark hover:text-secondary transition-colors"
              >
                Create an account
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

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}
