'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const itemCount = useCartStore((state) => state.getItemCount());


  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'manager' | 'seller' | null>(null);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);


  // Track if we just opened the modal to prevent immediate closing
  const justOpenedRef = useRef(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showSignOutModal) {
      justOpenedRef.current = false;
      return;
    }

    // Set flag when modal opens to prevent immediate closing
    justOpenedRef.current = true;
    const timeoutId = setTimeout(() => {
      justOpenedRef.current = false;
    }, 100); // Allow 100ms for the opening click to complete

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Ignore clicks that happened right after opening the modal
      if (justOpenedRef.current) {
        return;
      }

      // Don't close if clicking inside the dropdown container (button or dropdown menu)
      if (buttonRef.current && buttonRef.current.contains(target)) {
        return;
      }
      
      // Also check if clicking on a link inside the dropdown
      if (target.closest('.absolute.right-0.mt-2')) {
        return;
      }
      
      // Close the dropdown
      setShowSignOutModal(false);
    };

    // Use a small delay before adding the listener to avoid catching the opening click
    const listenerTimeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 150);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(listenerTimeoutId);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showSignOutModal]);



  useEffect(() => {
    let mounted = true;
    const supabase = createClient();
    const hasSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== 'placeholder' &&
      process.env.NEXT_PUBLIC_SUPABASE_URL.trim() !== '';

    // Set a maximum loading time - always show auth buttons after 500ms
    // Reduced timeout to show buttons faster and prevent blocking
    const maxLoadingTimer = setTimeout(() => {
      if (mounted) {
        setLoading(false);
      }
    }, 500);

    // Safety fallback: Ensure loading is always false after maximum 2 seconds
    // This prevents the button from being stuck in loading state
    const safetyTimer = setTimeout(() => {
      if (mounted) {
        setLoading(false);
      }
    }, 2000);

    if (hasSupabase) {
      const checkUserRole = async (userId: string) => {
        try {
          const { data: employeeData } = await supabase
            .from('employees')
            .select('role')
            .eq('user_id', userId)
            .single();

          if (employeeData) {
            const role = employeeData.role as 'admin' | 'manager' | 'seller';
            if (mounted) {
              setUserRole(role);
              setIsAdmin(role === 'admin' || role === 'manager');
            }
          } else {
            if (mounted) {
              setUserRole(null);
              setIsAdmin(false);
            }
          }
        } catch (e) {
          console.error("Error checking role:", e);
          if (mounted) {
            setUserRole(null);
            setIsAdmin(false);
          }
        }
      };

      const initAuth = async () => {
        try {
          // Race condition to prevent infinite loading if Supabase hangs
          const getUserPromise = supabase.auth.getUser();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Auth timeout')), 5000) // Reduced to 5 seconds
          );

          const { data } = await Promise.race([getUserPromise, timeoutPromise]) as any;

          if (!mounted) return;

          const currentUser = data?.user ?? null;
          console.log("Header Auth Check (getUser):", !!currentUser);

          if (currentUser) {
            setUser(currentUser);
            checkUserRole(currentUser.id);
          } else {
            // Fallback to session check
            const { data: { session } } = await supabase.auth.getSession();
            console.log("Header Auth Check (getSession fallback):", !!session?.user);
            if (session?.user) {
              setUser(session.user);
              checkUserRole(session.user.id);
            } else {
              setUser(null);
            }
          }
        } catch (error) {
          console.error("Header auth check failed/timeout:", error);
          if (mounted) {
            // Always set loading to false on error to show buttons
            setLoading(false);
            // Fallback to session check on error
            try {
              const { data: { session } } = await supabase.auth.getSession();
              console.log("Header Auth Check (Error Fallback):", !!session?.user);
              if (session?.user) {
                setUser(session.user);
                checkUserRole(session.user.id);
              } else {
                setUser(null);
              }
            } catch (innerError) {
              console.error("Header session fallback failed:", innerError);
              setUser(null);
            }
            // Always set loading to false in error cases to show buttons
            if (mounted) {
              setLoading(false);
            }
          }
        } finally {
          if (mounted) {
            clearTimeout(maxLoadingTimer);
            setLoading(false);
          }
        }
      };

      initAuth();

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return;
        console.log("Header Auth State Change:", event, !!session?.user);

        const currentUser = session?.user ?? null;
        setUser(currentUser); // Always update state on change

        if (currentUser) {
          checkUserRole(currentUser.id);
        } else {
          setUserRole(null);
          setIsAdmin(false);
        }
      });

      return () => {
        mounted = false;
        clearTimeout(maxLoadingTimer);
        clearTimeout(safetyTimer);
        subscription.unsubscribe();
      };
    } else {
      // No Supabase config - show auth buttons immediately
      clearTimeout(maxLoadingTimer);
      clearTimeout(safetyTimer);
      setLoading(false);
    }
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    // Clear cart specific to this user session
    useCartStore.getState().clearCart();

    await supabase.auth.signOut();
    setUser(null);
    setUserRole(null);
    setIsAdmin(false);
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
    <header className="bg-white/95 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-gray-100 relative" style={{ isolation: 'isolate' }}>
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
                className={`relative font-medium transition-colors ${pathname === link.href
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
          <div className="flex items-center gap-4 relative z-[60]">

            {/* Auth Button (Desktop) */}
            <div className="hidden md:flex items-center relative" ref={buttonRef}>
              {loading && user === null ? (
                // Show Sign Up button during loading
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const newState = !showSignOutModal;
                      setShowSignOutModal(newState);
                    }}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium text-sm flex items-center gap-2 cursor-pointer"
                    type="button"
                  >
                    Sign Up
                    <svg className={`w-4 h-4 transition-transform ${showSignOutModal ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showSignOutModal && (
                    <div 
                      className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link
                        href="/signin"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
                        onClick={() => setShowSignOutModal(false)}
                      >
                        Sign In
                      </Link>
                      <Link
                        href="/signup"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
                        onClick={() => setShowSignOutModal(false)}
                      >
                        Create Account
                      </Link>
                    </div>
                  )}
                </div>
              ) : user ? (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const newState = !showSignOutModal;
                      setShowSignOutModal(newState);
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-none hover:bg-gray-200 transition-colors font-medium text-sm flex items-center gap-2 cursor-pointer"
                    type="button"
                  >
                    {isAdmin ? "Admin" : "Account"}
                    <svg className={`w-4 h-4 transition-transform ${showSignOutModal ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showSignOutModal && (
                    <div 
                      className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {userRole ? (
                        // Admin, Manager, or Seller - show Dashboard
                        <Link
                          href={userRole === 'seller' ? "/dashboard/products" : "/dashboard"}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
                          onClick={() => setShowSignOutModal(false)}
                        >
                          Dashboard
                        </Link>
                      ) : (
                        // Regular user - show Profile
                        <Link
                          href="/profile"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
                          onClick={() => setShowSignOutModal(false)}
                        >
                          Profile
                        </Link>
                      )}
                      <button
                        onClick={() => {
                          setShowSignOutModal(false);
                          handleSignOut();
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        type="button"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                // Not logged in - show Sign Up button
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const newState = !showSignOutModal;
                      setShowSignOutModal(newState);
                    }}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium text-sm flex items-center gap-2 cursor-pointer"
                    type="button"
                  >
                    Sign Up
                    <svg className={`w-4 h-4 transition-transform ${showSignOutModal ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showSignOutModal && (
                    <div 
                      className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link
                        href="/signin"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
                        onClick={() => setShowSignOutModal(false)}
                      >
                        Sign In
                      </Link>
                      <Link
                        href="/signup"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
                        onClick={() => setShowSignOutModal(false)}
                      >
                        Create Account
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Cart Icon */}
            <Link
              href="/checkout"
              className="relative p-2 text-gray-700 hover:text-primary transition-colors"
              aria-label="Shopping cart"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {isMounted && itemCount > 0 && (
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
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${pathname === link.href
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  {link.label}
                </Link>
              ))}
              {/* Mobile Auth Links */}
              <div className="px-4 pt-2 border-t border-gray-100 flex flex-col gap-2">
                {loading && user === null ? (
                  // Show Sign In options during loading for mobile
                  <div className="flex flex-col gap-2">
                    <Link
                      href="/signin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-colors text-center cursor-pointer"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-4 py-2 bg-primary/80 text-white rounded-lg hover:bg-primary-dark transition-colors font-medium text-center cursor-pointer"
                    >
                      Create Account
                    </Link>
                  </div>
                ) : user ? (
                  <>
                    <Link
                      href={userRole ? (userRole === 'seller' ? "/dashboard/products" : "/dashboard") : "/profile"}
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-colors text-center cursor-pointer"
                    >
                      {userRole ? "Dashboard" : "Profile"}
                    </Link>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleSignOut();
                      }}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-none hover:bg-gray-200 transition-colors font-medium cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  // Not logged in - show Sign In options
                  <div className="flex flex-col gap-2">
                    <Link
                      href="/signin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-colors text-center cursor-pointer"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium text-center cursor-pointer"
                    >
                      Create Account
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </nav>
        )}


      </div>
    </header>
  );
}

