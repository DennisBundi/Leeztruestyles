'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export default function AdminNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    // Only try to get user if Supabase is properly configured
    const hasSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== 'placeholder' &&
      process.env.NEXT_PUBLIC_SUPABASE_URL.trim() !== '';

    if (hasSupabase) {
      supabase.auth.getUser().then(({ data }) => {
        setUser(data.user);
      }).catch(() => {
        // Silently fail in preview mode
        setUser(null);
      });
    } else {
      // Preview mode - set a dummy user
      setUser({ email: 'admin@preview.com' });
    }
  }, []);

  const handleSignOut = async () => {
    const hasSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== 'placeholder' &&
      process.env.NEXT_PUBLIC_SUPABASE_URL.trim() !== '';

    if (hasSupabase) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    router.push('/');
    router.refresh();
  };

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/dashboard/products', label: 'Products', icon: '🛍️' },
    { href: '/dashboard/orders', label: 'Orders', icon: '📦' },
    { href: '/dashboard/inventory', label: 'Inventory', icon: '📋' },
    { href: '/dashboard/employees', label: 'Employees', icon: '👥' },
    { href: '/dashboard/payments', label: 'Payments', icon: '💳' },
    { href: '/pos', label: 'POS System', icon: '💰' },
  ];

  return (
    <>
      {/* Top Bar */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors lg:hidden"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <Link href="/dashboard" className="flex items-center gap-2">
                <Image
                  src="/images/leeztruelogo.jpeg"
                  alt="Leez True Styles Logo"
                  width={40}
                  height={40}
                  className="h-8 w-8 object-cover rounded-full"
                />
                <span className="text-sm font-semibold text-gray-600 hidden sm:inline">Admin</span>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/"
                target="_blank"
                className="text-sm text-gray-600 hover:text-primary transition-colors hidden sm:flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View Store
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar */}
      <aside className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 transition-all duration-300 z-30 ${sidebarOpen ? 'w-64' : 'w-0 lg:w-20'
        } ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} overflow-hidden`}>
        <nav className="h-full py-6 px-4 overflow-y-auto flex flex-col">
          {/* Navigation Items */}
          <ul className="space-y-2 flex-1">
            {navItems.map((item) => {
              // For dashboard, only match exact path
              // For other routes, match exact path or child routes
              const isActive = item.href === '/dashboard'
                ? pathname === item.href
                : pathname === item.href || pathname?.startsWith(item.href + '/');
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                        ? 'bg-gradient-to-r from-primary/10 to-primary-light/10 text-primary font-semibold border-l-4 border-primary'
                        : 'text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className={`${sidebarOpen ? 'block' : 'hidden lg:hidden'}`}>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* User Info & Sign Out - Bottom of Sidebar */}
          {user && (
            <div className={`border-t border-gray-200 pt-4 mt-4 ${sidebarOpen ? 'block' : 'hidden lg:hidden'}`}>
              <div className="px-3 mb-3">
                <div className="text-sm font-medium text-gray-900 truncate">{user.email}</div>
                <div className="text-xs text-gray-500 mt-0.5">Administrator</div>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          )}
        </nav>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  );
}

