# Admin Dashboard Redesign — Phase 1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restyle the admin dashboard and sidebar with glassmorphism over a deep brand gradient (rose-950 → pink-900 → purple-950).

**Architecture:** Add reusable glass Tailwind utilities via plugin, apply a fixed gradient background at the layout level, overhaul AdminNav with grouped collapsible navigation, restyle the dashboard page cards/charts/tables.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS v3 (TypeScript config), Recharts, React useState

---

## Task 1: Add Glass Utilities to Tailwind Config

**Files:**
- Modify: `tailwind.config.ts`

**Step 1: Add the plugin import and glass utilities**

Replace the entire file with:

```ts
import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "#f9a8d4",
          dark: "#f472b6",
          light: "#fbcfe8",
        },
        secondary: {
          DEFAULT: "#EC4899",
          dark: "#DB2777",
          light: "#F472B6",
        },
      },
    },
  },
  plugins: [
    plugin(function ({ addUtilities }) {
      addUtilities({
        ".glass": {
          "backdrop-filter": "blur(12px)",
          "-webkit-backdrop-filter": "blur(12px)",
          "background-color": "rgba(255, 255, 255, 0.08)",
          "border": "1px solid rgba(255, 255, 255, 0.15)",
        },
        ".glass-card": {
          "backdrop-filter": "blur(16px)",
          "-webkit-backdrop-filter": "blur(16px)",
          "background-color": "rgba(255, 255, 255, 0.10)",
          "border": "1px solid rgba(255, 255, 255, 0.20)",
          "border-radius": "1rem",
        },
        ".glass-strong": {
          "backdrop-filter": "blur(24px)",
          "-webkit-backdrop-filter": "blur(24px)",
          "background-color": "rgba(255, 255, 255, 0.18)",
          "border": "1px solid rgba(255, 255, 255, 0.30)",
          "border-radius": "0.75rem",
        },
        ".glass-sidebar": {
          "backdrop-filter": "blur(20px)",
          "-webkit-backdrop-filter": "blur(20px)",
          "background-color": "rgba(0, 0, 0, 0.35)",
          "border-right": "1px solid rgba(255, 255, 255, 0.10)",
        },
      });
    }),
  ],
};

export default config;
```

**Step 2: Verify dev server still compiles**

Check terminal — no TypeScript errors expected. If you see `Cannot find module 'tailwindcss/plugin'`, run:
```bash
npm install --save-dev @types/tailwindcss
```

**Step 3: Commit**

```bash
git add tailwind.config.ts
git commit -m "feat(admin): add glass utility classes to tailwind config"
```

---

## Task 2: Apply Gradient Background to Admin Layout

**Files:**
- Modify: `src/app/(admin)/dashboard/layout.tsx`

**Step 1: Replace the layout background**

Find both occurrences of `bg-gray-50 dark:bg-gray-900` and replace with the gradient. There are two: one in the preview-mode branch (no Supabase) and one in the authenticated branch.

Change:
```tsx
<div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
```

To (both occurrences):
```tsx
<div className="min-h-screen bg-gradient-to-br from-rose-950 via-pink-900 to-purple-950 transition-colors duration-200">
```

**Step 2: Make the gradient fixed so it doesn't scroll**

Wrap the gradient in a fixed background layer. Replace the outer div in the authenticated return with:

```tsx
return (
  <div className="min-h-screen relative">
    {/* Fixed gradient background */}
    <div className="fixed inset-0 bg-gradient-to-br from-rose-950 via-pink-900 to-purple-950 -z-10" />
    <AdminNav userRole={userRole} employee={employee} />
    <div className="ml-20 lg:ml-64 transition-all duration-300 min-h-[calc(100vh-4rem)]">
      <main className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  </div>
);
```

Do the same for the preview-mode return (no Supabase branch).

**Step 3: Verify**

Navigate to `http://localhost:3008/dashboard` — you should see the deep rose/purple gradient behind the (still-unstyled) content.

**Step 4: Commit**

```bash
git add src/app/(admin)/dashboard/layout.tsx
git commit -m "feat(admin): apply fixed brand gradient background to admin layout"
```

---

## Task 3: Restyle AdminNav — Glass Sidebar with Grouped Navigation

**Files:**
- Modify: `src/components/admin/AdminNav.tsx`

This is a full replacement of the component. The logic (auth, role fetching, sign out) is preserved exactly. Only the data structure and JSX change.

**Step 1: Replace the full file**

```tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState, useRef } from 'react';
import type { Employee } from '@/types';

type UserRole = 'admin' | 'manager' | 'seller';
type DashboardSection = 'dashboard' | 'products' | 'orders' | 'inventory' | 'employees' | 'payments' | 'pos' | 'profile' | 'settings' | 'reviews' | 'loyalty' | 'importation';

function canAccessSection(userRole: UserRole | null, section: DashboardSection): boolean {
  if (!userRole) return false;
  if (userRole === 'seller') {
    return ['orders', 'pos', 'products', 'profile', 'settings'].includes(section);
  }
  if (['orders', 'payments', 'pos', 'profile', 'settings', 'products'].includes(section)) return true;
  if (['dashboard', 'inventory'].includes(section)) return userRole === 'admin' || userRole === 'manager';
  if (section === 'employees') return userRole === 'admin';
  if (['reviews', 'loyalty', 'importation'].includes(section)) return userRole === 'admin' || userRole === 'manager';
  return false;
}

interface NavItem {
  href: string;
  label: string;
  section: DashboardSection;
  icon: React.ReactNode;
}

interface NavGroup {
  label: string;
  icon: React.ReactNode;
  items: NavItem[];
}

function DashboardIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function ProductsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  );
}

function InventoryIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}

function OrdersIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

function PaymentsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}

function POSIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7H6a2 2 0 00-2 2v9a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
  );
}

function ReviewsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  );
}

function LoyaltyIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    </svg>
  );
}

function EmployeesIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function ImportationIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
      fill="none" stroke="currentColor" viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

interface AdminNavProps {
  userRole?: UserRole | null;
  employee?: Employee | null;
}

export default function AdminNav({ userRole: propUserRole, employee: propEmployee }: AdminNavProps = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const resolvedRole = useRef<UserRole | null>(propUserRole || null);
  const [userRole, setUserRole] = useState<UserRole | null>(propUserRole || null);
  const [employee, setEmployee] = useState<Employee | null>(propEmployee || null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (propUserRole) {
      resolvedRole.current = propUserRole;
      setUserRole(propUserRole);
    }
    if (propEmployee) {
      setEmployee(propEmployee);
    }
  }, [propUserRole, propEmployee]);

  useEffect(() => {
    const supabase = createClient();
    const hasSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== 'placeholder' &&
      process.env.NEXT_PUBLIC_SUPABASE_URL.trim() !== '';

    if (!hasSupabase) {
      if (!resolvedRole.current) {
        resolvedRole.current = 'admin';
        setUserRole('admin');
      }
      return;
    }

    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        try {
          const response = await fetch('/api/auth/role');
          const { role } = await response.json();
          if (role) {
            resolvedRole.current = role;
            setUserRole(role);
            const { data: empData } = await supabase
              .from('employees')
              .select('*')
              .eq('user_id', data.user.id)
              .single();
            if (empData) setEmployee(empData as Employee);
          }
        } catch (error) {
          console.error('Error fetching role:', error);
        }
      }
    }).catch(() => {});
  }, []);

  // Auto-expand the group containing the active route
  useEffect(() => {
    const active: Record<string, boolean> = {};
    navGroups.forEach(group => {
      if (group.items) {
        const hasActive = group.items.some(item =>
          item.href === '/dashboard'
            ? pathname === item.href
            : pathname === item.href || pathname?.startsWith(item.href + '/')
        );
        if (hasActive) active[group.label] = true;
      }
    });
    setOpenGroups(prev => ({ ...prev, ...active }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

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

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  // All nav groups with their children
  const allNavGroups: NavGroup[] = [
    {
      label: 'Catalogue',
      icon: <ProductsIcon />,
      items: [
        { href: '/dashboard/products', label: 'Products', section: 'products', icon: <ProductsIcon /> },
        { href: '/dashboard/inventory', label: 'Inventory', section: 'inventory', icon: <InventoryIcon /> },
      ],
    },
    {
      label: 'Sales',
      icon: <OrdersIcon />,
      items: [
        { href: '/dashboard/orders', label: 'Orders', section: 'orders', icon: <OrdersIcon /> },
        { href: '/dashboard/payments', label: 'Payments', section: 'payments', icon: <PaymentsIcon /> },
        { href: '/pos', label: 'POS System', section: 'pos', icon: <POSIcon /> },
      ],
    },
    {
      label: 'Customers',
      icon: <ReviewsIcon />,
      items: [
        { href: '/dashboard/reviews', label: 'Reviews', section: 'reviews', icon: <ReviewsIcon /> },
        { href: '/dashboard/loyalty', label: 'Loyalty', section: 'loyalty', icon: <LoyaltyIcon /> },
      ],
    },
    {
      label: 'Team',
      icon: <EmployeesIcon />,
      items: [
        { href: '/dashboard/employees', label: 'Employees', section: 'employees', icon: <EmployeesIcon /> },
        { href: '/dashboard/importation', label: 'Importation', section: 'importation', icon: <ImportationIcon /> },
      ],
    },
    {
      label: 'Account',
      icon: <ProfileIcon />,
      items: [
        { href: '/dashboard/profile', label: 'Profile', section: 'profile', icon: <ProfileIcon /> },
        { href: '/dashboard/settings', label: 'Settings', section: 'settings', icon: <SettingsIcon /> },
      ],
    },
  ];

  // Filter groups — remove items user can't access, remove empty groups
  const navGroups = allNavGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => canAccessSection(userRole, item.section)),
    }))
    .filter(group => group.items.length > 0);

  const isDashboardActive = pathname === '/dashboard';

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-screen glass-sidebar z-30 flex flex-col transition-all duration-300
        ${sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full lg:translate-x-0'}`}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
          <Image
            src="/images/leeztruelogo.jpeg"
            alt="Leez True Styles"
            width={36}
            height={36}
            className="rounded-full object-cover ring-2 ring-rose-400/50"
          />
          <div>
            <span className="text-white font-bold text-lg tracking-wide">LEEZ</span>
            <span className="text-rose-400 text-xs font-semibold ml-1.5 uppercase tracking-widest">Admin</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">

          {/* Dashboard standalone */}
          <Link
            href="/dashboard"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 ${
              isDashboardActive
                ? 'glass-strong text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <span className={isDashboardActive ? 'text-rose-400' : 'text-white/50'}>
              <DashboardIcon />
            </span>
            <span className="text-sm font-medium">Dashboard</span>
          </Link>

          {/* Grouped nav */}
          {navGroups.map(group => {
            const isOpen = openGroups[group.label] ?? false;
            const hasActiveChild = group.items.some(item =>
              pathname === item.href || pathname?.startsWith(item.href + '/')
            );

            return (
              <div key={group.label}>
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(group.label)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 ${
                    hasActiveChild
                      ? 'text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className={hasActiveChild ? 'text-rose-400' : 'text-white/50'}>
                    {group.icon}
                  </span>
                  <span className="text-sm font-medium flex-1 text-left">{group.label}</span>
                  <span className="text-white/40">
                    <ChevronIcon open={isOpen} />
                  </span>
                </button>

                {/* Sub-items */}
                {isOpen && (
                  <div className="mt-1 ml-4 pl-3 border-l border-white/10 space-y-1">
                    {group.items.map(item => {
                      const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 ${
                            isActive
                              ? 'glass-strong text-white'
                              : 'text-white/50 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <span className={isActive ? 'text-rose-400' : 'text-white/40'}>
                            {item.icon}
                          </span>
                          <span className="text-sm">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom: user info + sign out */}
        <div className="px-3 py-4 border-t border-white/10">
          {employee && (
            <div className="px-3 mb-3">
              <div className="text-sm font-medium text-white truncate">
                {employee.name || 'Admin'}
              </div>
              <div className="text-xs text-white/40 mt-0.5">
                {userRole === 'admin' ? 'Administrator' : userRole === 'manager' ? 'Manager' : 'Sales Person'}
                {employee.employee_code && ` · ${employee.employee_code}`}
              </div>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all duration-150 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile top bar (hamburger only) */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 glass border-b border-white/10">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-white font-bold tracking-wide">LEEZ <span className="text-rose-400 text-xs font-semibold">ADMIN</span></span>
        <Link href="/" className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </Link>
      </div>
    </>
  );
}
```

**Step 2: Update the layout margin to match sidebar width**

In `src/app/(admin)/dashboard/layout.tsx`, the content area currently has `ml-20 lg:ml-64`. Since the new sidebar is always 64 on desktop (no collapsed icon mode), this stays correct. No change needed.

**Step 3: Verify**

- Sidebar appears with dark glass effect over the gradient
- Groups expand/collapse with chevron animation
- Active route highlights in rose-400
- Mobile hamburger toggles the sidebar

**Step 4: Commit**

```bash
git add src/components/admin/AdminNav.tsx
git commit -m "feat(admin): restyle sidebar with glass effect and grouped collapsible nav"
```

---

## Task 4: Restyle Dashboard Page

**Files:**
- Modify: `src/app/(admin)/dashboard/page.tsx`

**Step 1: Replace the JSX return block**

Keep all state, data fetching, and logic exactly as-is. Only replace the `return (...)` block starting at line 258.

Replace from `return (` down to the closing `);` with:

```tsx
  return (
    <div className="space-y-6 animate-fade-in pt-16 lg:pt-0">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-1">Dashboard</h1>
        <p className="text-white/50 text-sm">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="glass-card border-l-4 border-rose-400 p-4">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-white/80 text-sm flex-1">{error}</p>
            <button
              onClick={() => { setError(null); fetchDashboardData(); }}
              className="text-rose-400 hover:text-rose-300 text-sm font-medium underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/dashboard/orders" className="glass-card p-5 hover:bg-white/15 transition-all duration-200 cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white/50 text-xs font-medium uppercase tracking-widest">Total Sales</h3>
            <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-white">
            {loading ? '...' : error ? '—' : `KES ${(totalSales || 0).toLocaleString()}`}
          </p>
          <p className="text-white/40 text-xs mt-1">All time</p>
        </Link>

        <Link href="/dashboard/orders" className="glass-card p-5 hover:bg-white/15 transition-all duration-200 cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white/50 text-xs font-medium uppercase tracking-widest">Total Orders</h3>
            <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-white">
            {loading ? '...' : error ? '—' : totalOrders}
          </p>
          <p className="text-white/40 text-xs mt-1">
            {loading ? '...' : `${completedOrders} completed · ${pendingOrders} pending`}
          </p>
        </Link>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white/50 text-xs font-medium uppercase tracking-widest">Today's Sales</h3>
            <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-white">
            {loading ? '...' : error ? '—' : `KES ${(todaySales || 0).toLocaleString()}`}
          </p>
          <p className="text-white/40 text-xs mt-1">
            {loading ? '...' : `${todayOrders} orders today`}
          </p>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white/50 text-xs font-medium uppercase tracking-widest">Today's Profits</h3>
            <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-white">
            {loading ? '...' : error ? '—' : `KES ${(todayProfits || 0).toLocaleString()}`}
          </p>
          <p className="text-white/40 text-xs mt-1">
            {loading ? '...' : `${totalCustomers} customers total`}
          </p>
        </div>
      </div>

      {/* Stock Alerts */}
      {!loading && lowStock && Array.isArray(lowStock) && lowStock.length > 0 && (() => {
        const lowStockItems = lowStock.filter((item: any) => {
          const isOutOfStock = item.stock_quantity === 0 || item.status === 'out_of_stock' || item.status === 'no_inventory';
          return !isOutOfStock;
        });
        const outOfStockItems = lowStock.filter((item: any) => {
          const isOutOfStock = item.stock_quantity === 0 || item.status === 'out_of_stock' || item.status === 'no_inventory';
          return isOutOfStock;
        });
        if (lowStockItems.length === 0 && outOfStockItems.length === 0) return null;

        return (
          <div className="glass-card border-l-4 border-rose-400 p-5">
            <div className="flex items-center gap-3 mb-4">
              <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h2 className="text-white font-semibold">Stock Alerts</h2>
              <span className="ml-auto bg-rose-500/20 text-rose-300 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                {lowStockItems.length + outOfStockItems.length}
              </span>
            </div>
            {outOfStockItems.length > 0 && (
              <div className="mb-3 p-3 bg-red-500/15 border border-red-400/20 rounded-lg">
                <span className="text-red-300 text-sm font-medium">
                  Out of Stock: {outOfStockItems.length} {outOfStockItems.length === 1 ? 'product' : 'products'}
                </span>
              </div>
            )}
            {lowStockItems.length > 0 && (
              <div className="space-y-2 max-h-44 overflow-y-auto">
                {lowStockItems.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                    <span className="text-white/70 text-sm">{item.name || 'Unknown Product'}</span>
                    <span className="text-rose-300 text-xs font-semibold bg-rose-500/15 px-2 py-0.5 rounded-full">
                      {item.stock_quantity} units
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Social Platform Analytics */}
      <SocialPlatformAnalytics />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sales Chart */}
        <div className="glass-card p-5">
          <h2 className="text-white font-semibold mb-4">Sales This Week</h2>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-rose-400"></div>
            </div>
          ) : salesByDay.length === 0 ? (
            <div className="text-center py-8 text-white/30">
              <p className="text-sm">No sales data available</p>
            </div>
          ) : (
            <div className="w-full">
              <ResponsiveContainer width="100%" height={250}>
                <LineChart
                  data={salesByDay.map((day) => ({ day: day.day, sales: day.sales || 0 }))}
                  margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="day" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0,0,0,0.75)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                    formatter={(value: any) => [`KES ${Number(value).toLocaleString()}`, 'Sales']}
                    labelStyle={{ color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    stroke="#fb7185"
                    strokeWidth={2.5}
                    dot={{ fill: '#fb7185', r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#f43f5e', stroke: 'rgba(255,255,255,0.3)', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-white/40">
                <span>Week Total</span>
                <span className="text-white font-semibold">
                  KES {salesByDay.reduce((sum, day) => sum + (day.sales || 0), 0).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Top Products */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Top Products</h2>
            <Link href="/dashboard/products" className="text-rose-400 hover:text-rose-300 text-xs font-medium transition-colors">
              View All
            </Link>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-rose-400"></div>
            </div>
          ) : topProducts.length === 0 ? (
            <div className="text-center py-8 text-white/30">
              <p className="text-sm">No product sales data available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topProducts.map((product, index) => (
                <div key={product.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-400 text-xs font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-sm text-white/80 font-medium">{product.name}</div>
                      <div className="text-xs text-white/40">{product.sales} units sold</div>
                    </div>
                  </div>
                  <span className="text-rose-400 text-sm font-bold">{product.sales}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">Recent Orders</h2>
          <Link href="/dashboard/orders" className="text-rose-400 hover:text-rose-300 text-xs font-medium flex items-center gap-1 transition-colors">
            View All
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 px-3 text-xs font-medium text-white/40 uppercase tracking-wider">Order</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-white/40 uppercase tracking-wider">Customer</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-white/40 uppercase tracking-wider">Amount</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-white/40 uppercase tracking-wider">Status</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-white/40 uppercase tracking-wider">Date</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-white/40 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody>
              {recentOrdersLoading ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-white/30 text-sm">Loading...</td>
                </tr>
              ) : recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-white/30 text-sm">No recent orders</td>
                </tr>
              ) : (
                recentOrders.map((order: any) => (
                  <tr key={order.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-3 font-mono text-xs text-white/50">
                      {order.order_number ? `#${order.order_number}` : `#${formatOrderId(order.id)}`}
                    </td>
                    <td className="py-3 px-3 text-sm text-white/80 font-medium">
                      {order.customer || 'Guest'}
                    </td>
                    <td className="py-3 px-3 text-sm text-white font-semibold">
                      KES {(order.amount || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        order.status === 'completed'
                          ? 'bg-green-500/20 text-green-300'
                          : order.status === 'pending'
                          ? 'bg-yellow-500/20 text-yellow-300'
                          : 'bg-white/10 text-white/50'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs text-white/40">
                      {order.date instanceof Date ? order.date.toLocaleDateString() : new Date(order.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3">
                      <Link href={`/dashboard/orders/${order.id}`} className="text-rose-400 hover:text-rose-300 text-xs font-medium transition-colors">
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
```

**Step 2: Verify**

- All 4 stat cards use uniform glass style
- Secondary stats (completed, pending, customers) are folded into card sub-labels
- Charts have dark tooltip and white axis lines
- Recent orders table uses white/opacity text
- No more per-card blue/green/purple tinting

**Step 3: Commit**

```bash
git add src/app/(admin)/dashboard/page.tsx
git commit -m "feat(admin): restyle dashboard page with glass cards and unified color scheme"
```

---

## Final Verification

1. Navigate to `http://localhost:3008/dashboard`
2. Confirm gradient background is fixed (doesn't scroll)
3. Confirm sidebar groups expand/collapse
4. Confirm active route highlights in rose-400
5. Confirm all 4 stat cards are uniform glass style
6. Confirm charts render with dark tooltip
7. Test on mobile — hamburger should open/close sidebar overlay
