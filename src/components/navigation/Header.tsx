'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const itemCount = useCartStore((state) => state.getItemCount());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    const hasSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL && 
                        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'placeholder' &&
                        process.env.NEXT_PUBLIC_SUPABASE_URL.trim() !== '';
    
    if (hasSupabase) {
      // Get initial user
      supabase.auth.getUser().then(({ data }) => {
        setUser(data.user);
        setLoading(false);
      }).catch(() => {
        setUser(null);
        setLoading(false);
      });

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });

      return () => subscription.unsubscribe();
    } else {
      setLoading(false);
    }
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    router.push('/');
    router.refresh();
  };

  // Don't render header on admin routes
  if (pathname?.startsWith('/dashboard') || pathname?.startsWith('/pos')) {
    return null;
  }

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/products', label: 'Products' },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
  ];

  return (
    <header className="bg-white/95 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-gray-100">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link 
            href="/" 
            className="flex items-center hover:opacity-80 transition-opacity"
          >
            <Image
              src="/images/leeztruelogo.jpeg"
              alt="Leez True Styles Logo"
              width={60}
              height={60}
              className="h-12 w-12 object-cover rounded-full"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`relative font-medium transition-colors ${
                  pathname === link.href
                    ? 'text-primary'
                    : 'text-gray-700 hover:text-primary'
                }`}
              >
                {link.label}
                {pathname === link.href && (
                  <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </Link>
            ))}
          </nav>

          {/* Cart Icon & Auth Links & Mobile Menu */}
          <div className="flex items-center gap-4">
            {/* Auth Button (Desktop) */}
            {!loading && (
              <div className="hidden md:flex items-center">
                {user ? (
                  <div className="flex items-center gap-3">
                    <Link
                      href="/dashboard"
                      className="text-gray-700 hover:text-primary transition-colors font-medium text-sm"
                    >
                      Account
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-none hover:bg-gray-200 transition-colors font-medium text-sm"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/signin"
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium text-sm"
                  >
                    Sign In
                  </Link>
                )}
              </div>
            )}

            {/* Cart Icon */}
            <Link
              href="/checkout"
              className="relative p-2 text-gray-700 hover:text-primary transition-colors"
              aria-label="Shopping cart"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-scale-in">
                  {itemCount}
                </span>
              )}
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-700 hover:text-primary transition-colors"
              aria-label="Toggle menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-gray-100 animate-slide-up">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    pathname === link.href
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {/* Mobile Auth Links */}
              {!loading && (
                <div className="px-4 pt-2 border-t border-gray-100 flex flex-col gap-2">
                  {user ? (
                    <>
                      <Link
                        href="/dashboard"
                        onClick={() => setMobileMenuOpen(false)}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-colors text-center"
                      >
                        Account
                      </Link>
                      <button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          handleSignOut();
                        }}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-none hover:bg-gray-200 transition-colors font-medium"
                      >
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <Link
                      href="/signin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium text-center"
                    >
                      Sign In
                    </Link>
                  )}
                </div>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}

