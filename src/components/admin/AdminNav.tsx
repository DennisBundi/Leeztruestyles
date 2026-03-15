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

  const navGroups = allNavGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => canAccessSection(userRole, item.section)),
    }))
    .filter(group => group.items.length > 0);

  // Auto-expand group containing the active route
  useEffect(() => {
    const active: Record<string, boolean> = {};
    navGroups.forEach(group => {
      const hasActive = group.items.some(item =>
        pathname === item.href || pathname?.startsWith(item.href + '/')
      );
      if (hasActive) active[group.label] = true;
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
          <div className="w-10 h-10 shrink-0 rounded-full overflow-hidden ring-2 ring-primary/50">
            <Image
              src="/images/leeztruelogo.jpeg"
              alt="Leez True Styles"
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <span className="text-white font-bold text-lg tracking-wide">LEEZ</span>
            <span className="text-primary text-xs font-semibold ml-1.5 uppercase tracking-widest">Admin</span>
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
            <span className={isDashboardActive ? 'text-primary' : 'text-white/50'}>
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
                <button
                  onClick={() => toggleGroup(group.label)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 ${
                    hasActiveChild
                      ? 'text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className={hasActiveChild ? 'text-primary' : 'text-white/50'}>
                    {group.icon}
                  </span>
                  <span className="text-sm font-medium flex-1 text-left">{group.label}</span>
                  <span className="text-white/40">
                    <ChevronIcon open={isOpen} />
                  </span>
                </button>

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
                          <span className={isActive ? 'text-primary' : 'text-white/40'}>
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
                {userRole === 'admin' ? 'Administrator' : userRole === 'manager' ? 'Manager' : 'Sales Person'}
              </div>
              <div className="text-xs text-white/40 mt-0.5">
                {employee.employee_code || ''}
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

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 glass border-b border-white/10">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-white font-bold tracking-wide">LEEZ <span className="text-primary text-xs font-semibold">ADMIN</span></span>
        <Link href="/" className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </Link>
      </div>
    </>
  );
}
