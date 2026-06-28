# Analytics Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/dashboard/analytics` page showing signup growth charts, stat cards, and a searchable user table, visible to admin and manager roles only.

**Architecture:** A new `GET /api/dashboard/analytics/users` route fetches all users from the `users` table using the admin Supabase client and returns users list plus pre-computed aggregations (signupsByDay, signupsByMonth, stat counts). The analytics page is a client component that fetches this route on mount and composes two focused child components: `SignupChart` (Recharts BarChart with 30-day/12-month toggle) and `UserTable` (client-side search + pagination). Role gating is enforced both in the API route (401/403) and via `canAccessSection` in `roles.ts`/`AdminNav.tsx`.

**Tech Stack:** Next.js App Router, Supabase (server client for auth, admin client for data), TypeScript, Tailwind CSS, Recharts (`BarChart`, `Bar`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `ResponsiveContainer`), Jest (`@jest-environment node`)

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Modify | `src/lib/auth/roles.ts` | Add `'analytics'` to `DashboardSection`, `canAccessSection`, `getAllowedSections` |
| Modify | `src/components/admin/AdminNav.tsx` | Add `'analytics'` to local type + `canAccessSection`, add `AnalyticsIcon`, add nav item |
| Create | `src/app/api/dashboard/analytics/users/route.ts` | GET — auth + role check, fetch users, compute aggregations |
| Create | `tests/api/dashboard/analytics/users.test.ts` | API route unit tests |
| Create | `src/components/dashboard/analytics/SignupChart.tsx` | BarChart with 30d/12m toggle |
| Create | `src/components/dashboard/analytics/UserTable.tsx` | Searchable paginated user table |
| Create | `src/app/(admin)/dashboard/analytics/page.tsx` | Client page: fetch data, compose layout |

---

## Task 1: Update roles.ts and AdminNav.tsx

**Files:**
- Modify: `src/lib/auth/roles.ts`
- Modify: `src/components/admin/AdminNav.tsx`

- [ ] **Step 1: Add `'analytics'` to `DashboardSection` in `roles.ts`**

  Find line 58 in `src/lib/auth/roles.ts`:
  ```ts
  export type DashboardSection = 'dashboard' | 'products' | 'orders' | 'inventory' | 'employees' | 'payments' | 'pos' | 'profile' | 'settings' | 'reviews' | 'loyalty' | 'importation';
  ```
  Replace with:
  ```ts
  export type DashboardSection = 'dashboard' | 'products' | 'orders' | 'inventory' | 'employees' | 'payments' | 'pos' | 'profile' | 'settings' | 'reviews' | 'loyalty' | 'importation' | 'analytics';
  ```

- [ ] **Step 2: Add `analytics` case to `canAccessSection` in `roles.ts`**

  After the `if (section === 'importation')` block (around line 84), add:
  ```ts
  // Admin and manager only for analytics
  if (section === 'analytics') {
    return userRole === 'admin' || userRole === 'manager';
  }
  ```

- [ ] **Step 3: Add `'analytics'` to `getAllowedSections` in `roles.ts`**

  Find line 94:
  ```ts
  const allSections: DashboardSection[] = ['dashboard', 'products', 'orders', 'inventory', 'employees', 'payments', 'pos', 'profile', 'settings', 'reviews', 'loyalty', 'importation'];
  ```
  Replace with:
  ```ts
  const allSections: DashboardSection[] = ['dashboard', 'products', 'orders', 'inventory', 'employees', 'payments', 'pos', 'profile', 'settings', 'reviews', 'loyalty', 'importation', 'analytics'];
  ```

- [ ] **Step 4: Update `AdminNav.tsx` local `DashboardSection` type (line 12)**

  Find:
  ```ts
  type DashboardSection = 'dashboard' | 'products' | 'orders' | 'inventory' | 'employees' | 'payments' | 'pos' | 'profile' | 'settings' | 'reviews' | 'loyalty' | 'importation';
  ```
  Replace with:
  ```ts
  type DashboardSection = 'dashboard' | 'products' | 'orders' | 'inventory' | 'employees' | 'payments' | 'pos' | 'profile' | 'settings' | 'reviews' | 'loyalty' | 'importation' | 'analytics';
  ```

- [ ] **Step 5: Update `canAccessSection` in `AdminNav.tsx` (line 22)**

  Find:
  ```ts
  if (['reviews', 'loyalty', 'importation'].includes(section)) return userRole === 'admin' || userRole === 'manager';
  ```
  Replace with:
  ```ts
  if (['reviews', 'loyalty', 'importation', 'analytics'].includes(section)) return userRole === 'admin' || userRole === 'manager';
  ```

- [ ] **Step 6: Add `AnalyticsIcon` component to `AdminNav.tsx`**

  Add this function after `ImportationIcon` (around line 117):
  ```tsx
  function AnalyticsIcon() {
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    );
  }
  ```

- [ ] **Step 7: Add analytics nav item to the Team group in `AdminNav.tsx`**

  Find the Team group (around line 231):
  ```tsx
  {
    label: 'Team',
    icon: <EmployeesIcon />,
    items: [
      { href: '/dashboard/employees', label: 'Employees', section: 'employees', icon: <EmployeesIcon /> },
      { href: '/dashboard/importation', label: 'Importation', section: 'importation', icon: <ImportationIcon /> },
    ],
  },
  ```
  Replace with:
  ```tsx
  {
    label: 'Team',
    icon: <EmployeesIcon />,
    items: [
      { href: '/dashboard/employees', label: 'Employees', section: 'employees', icon: <EmployeesIcon /> },
      { href: '/dashboard/importation', label: 'Importation', section: 'importation', icon: <ImportationIcon /> },
      { href: '/dashboard/analytics', label: 'Analytics', section: 'analytics', icon: <AnalyticsIcon /> },
    ],
  },
  ```

- [ ] **Step 8: Run TypeScript check**

  ```bash
  npx tsc --noEmit 2>&1 | grep -E "(roles|AdminNav)" | head -20
  ```
  Expected: no new errors in those two files.

- [ ] **Step 9: Commit**

  ```bash
  git add src/lib/auth/roles.ts src/components/admin/AdminNav.tsx
  git commit -m "feat(auth): add analytics section to role system and admin nav"
  ```

---

## Task 2: Write the API route test (failing first)

**Files:**
- Create: `tests/api/dashboard/analytics/users.test.ts`

- [ ] **Step 1: Create the test file**

  Create `tests/api/dashboard/analytics/users.test.ts`:
  ```ts
  /**
   * @jest-environment node
   */

  import { GET } from '@/app/api/dashboard/analytics/users/route'
  import { NextRequest } from 'next/server'

  const mockGetUser = jest.fn()
  const mockGetUserRole = jest.fn()
  const mockFrom = jest.fn()
  const mockSelect = jest.fn()
  const mockOrder = jest.fn()

  jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(() => ({
      auth: { getUser: mockGetUser },
    })),
  }))

  jest.mock('@/lib/supabase/admin', () => ({
    createAdminClient: jest.fn(() => ({
      from: mockFrom,
    })),
  }))

  jest.mock('@/lib/auth/roles', () => ({
    getUserRole: mockGetUserRole,
    canAccessSection: jest.fn((role: string | null, section: string) => {
      if (!role) return false
      if (section === 'analytics') return role === 'admin' || role === 'manager'
      return false
    }),
  }))

  function makeRequest() {
    return new NextRequest('http://localhost/api/dashboard/analytics/users')
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockFrom.mockReturnValue({ select: mockSelect })
    mockSelect.mockReturnValue({ order: mockOrder })
  })

  describe('GET /api/dashboard/analytics/users', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })
      const res = await GET(makeRequest())
      expect(res.status).toBe(401)
    })

    it('returns 403 when role is seller', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
      mockGetUserRole.mockResolvedValue('seller')
      const res = await GET(makeRequest())
      expect(res.status).toBe(403)
    })

    it('returns 200 with correct shape for admin', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
      mockGetUserRole.mockResolvedValue('admin')
      mockOrder.mockResolvedValue({
        data: [
          {
            id: 'u1',
            full_name: 'Jane Doe',
            email: 'jane@test.com',
            created_at: '2026-06-28T10:00:00.000Z',
          },
        ],
        error: null,
      })
      const res = await GET(makeRequest())
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toHaveProperty('users')
      expect(body).toHaveProperty('signupsByDay')
      expect(body).toHaveProperty('signupsByMonth')
      expect(body).toHaveProperty('totalUsers')
      expect(body).toHaveProperty('thisMonth')
      expect(body).toHaveProperty('today')
      expect(body).toHaveProperty('newThisWeek')
      expect(body.signupsByDay).toHaveLength(30)
      expect(body.signupsByMonth).toHaveLength(12)
      expect(body.totalUsers).toBe(1)
    })

    it('returns 200 with correct shape for manager', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u2' } } })
      mockGetUserRole.mockResolvedValue('manager')
      mockOrder.mockResolvedValue({ data: [], error: null })
      const res = await GET(makeRequest())
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.totalUsers).toBe(0)
    })

    it('returns 500 on database error', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
      mockGetUserRole.mockResolvedValue('admin')
      mockOrder.mockResolvedValue({ data: null, error: new Error('DB error') })
      const res = await GET(makeRequest())
      expect(res.status).toBe(500)
    })
  })
  ```

- [ ] **Step 2: Run tests to verify they fail**

  ```bash
  npx jest tests/api/dashboard/analytics/users.test.ts --no-coverage 2>&1 | tail -20
  ```
  Expected: FAIL — `Cannot find module '@/app/api/dashboard/analytics/users/route'`

---

## Task 3: Implement the API route

**Files:**
- Create: `src/app/api/dashboard/analytics/users/route.ts`

- [ ] **Step 1: Create the route file**

  Create `src/app/api/dashboard/analytics/users/route.ts`:
  ```ts
  import { NextRequest, NextResponse } from 'next/server'
  import { createClient } from '@/lib/supabase/server'
  import { createAdminClient } from '@/lib/supabase/admin'
  import { getUserRole, canAccessSection } from '@/lib/auth/roles'

  export const dynamic = 'force-dynamic'

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  export async function GET(request: NextRequest) {
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

      const userRole = await getUserRole(user.id)
      if (!canAccessSection(userRole, 'analytics')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const adminClient = createAdminClient()
      const { data: allUsers, error } = await adminClient
        .from('users')
        .select('id, full_name, email, created_at')
        .order('created_at', { ascending: false })

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
      }

      const users = allUsers || []
      const now = new Date()

      // Midnight UTC for each boundary
      const todayStartISO = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
      ).toISOString()
      const monthStartISO = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
      ).toISOString()
      const weekAgoISO = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 7)
      ).toISOString()

      const totalUsers = users.length
      const today = users.filter(u => u.created_at >= todayStartISO).length
      const thisMonth = users.filter(u => u.created_at >= monthStartISO).length
      const newThisWeek = users.filter(u => u.created_at >= weekAgoISO).length

      // Last 30 days: one entry per UTC calendar day, oldest first
      const signupsByDay = []
      for (let i = 29; i >= 0; i--) {
        const d = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i)
        )
        const dateStr = d.toISOString().slice(0, 10) // "YYYY-MM-DD"
        const count = users.filter(u => u.created_at.startsWith(dateStr)).length
        signupsByDay.push({ date: dateStr, count })
      }

      // Last 12 calendar months, oldest first
      const signupsByMonth = []
      for (let i = 11; i >= 0; i--) {
        const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
        const year = d.getUTCFullYear()
        const month = d.getUTCMonth() // 0-indexed
        const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`
        const count = users.filter(u => u.created_at.startsWith(monthPrefix)).length
        signupsByMonth.push({ month: MONTHS[month], count })
      }

      return NextResponse.json({
        users,
        signupsByDay,
        signupsByMonth,
        totalUsers,
        thisMonth,
        today,
        newThisWeek,
      })
    } catch (error) {
      console.error('[API] Analytics users error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
  ```

- [ ] **Step 2: Run tests to verify they pass**

  ```bash
  npx jest tests/api/dashboard/analytics/users.test.ts --no-coverage 2>&1 | tail -20
  ```
  Expected: PASS — 5 tests, all green.

- [ ] **Step 3: Commit**

  ```bash
  git add src/app/api/dashboard/analytics/users/route.ts tests/api/dashboard/analytics/users.test.ts
  git commit -m "feat(analytics): add users API route with signup aggregations"
  ```

---

## Task 4: Build SignupChart component

**Files:**
- Create: `src/components/dashboard/analytics/SignupChart.tsx`

- [ ] **Step 1: Create the component**

  Create `src/components/dashboard/analytics/SignupChart.tsx`:
  ```tsx
  'use client'

  import { useState } from 'react'
  import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
  } from 'recharts'

  interface SignupsByDay {
    date: string
    count: number
  }

  interface SignupsByMonth {
    month: string
    count: number
  }

  interface SignupChartProps {
    signupsByDay: SignupsByDay[]
    signupsByMonth: SignupsByMonth[]
  }

  export default function SignupChart({ signupsByDay, signupsByMonth }: SignupChartProps) {
    const [view, setView] = useState<'30d' | '12m'>('30d')

    const dayData = signupsByDay.map(d => ({
      label: String(parseInt(d.date.split('-')[2], 10)),
      count: d.count,
    }))

    const monthData = signupsByMonth.map(d => ({
      label: d.month,
      count: d.count,
    }))

    const data = view === '30d' ? dayData : monthData

    return (
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">Signup Growth</h2>
          <div className="flex border border-white/20 rounded-lg overflow-hidden">
            <button
              onClick={() => setView('30d')}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                view === '30d' ? 'bg-[#EC4899] text-white' : 'text-white/50 hover:text-white'
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => setView('12m')}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                view === '12m' ? 'bg-[#EC4899] text-white' : 'text-white/50 hover:text-white'
              }`}
            >
              12 Months
            </button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.05)"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              stroke="rgba(255,255,255,0.25)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              interval={view === '30d' ? 4 : 0}
            />
            <YAxis
              stroke="rgba(255,255,255,0.25)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(10,0,20,0.92)',
                border: '1px solid rgba(249,168,212,0.2)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '13px',
              }}
              formatter={(value: number) => [value, 'Signups']}
              labelStyle={{ color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            />
            <Bar dataKey="count" fill="#EC4899" radius={[3, 3, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  npx tsc --noEmit 2>&1 | grep "SignupChart" | head -10
  ```
  Expected: no errors for `SignupChart.tsx`.

---

## Task 5: Build UserTable component

**Files:**
- Create: `src/components/dashboard/analytics/UserTable.tsx`

- [ ] **Step 1: Create the component**

  Create `src/components/dashboard/analytics/UserTable.tsx`:
  ```tsx
  'use client'

  import { useState, useMemo } from 'react'

  interface User {
    id: string
    full_name: string | null
    email: string
    created_at: string
  }

  interface UserTableProps {
    users: User[]
  }

  const AVATAR_COLORS = ['#EC4899', '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444']
  const PAGE_SIZE = 20
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000

  function getAvatarColor(name: string): string {
    let hash = 0
    for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
  }

  function getInitials(fullName: string | null): string {
    if (!fullName) return '?'
    const parts = fullName.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return '?'
    if (parts.length === 1) return parts[0][0].toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  export default function UserTable({ users }: UserTableProps) {
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const now = Date.now()

    const filtered = useMemo(() => {
      const q = search.toLowerCase()
      if (!q) return users
      return users.filter(
        u =>
          (u.full_name ?? '').toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      )
    }, [users, search])

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const safePage = Math.min(page, totalPages)
    const pageUsers = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

    function handleSearch(value: string) {
      setSearch(value)
      setPage(1)
    }

    return (
      <div className="glass-card overflow-hidden">
        <div className="p-4 flex items-center justify-between border-b border-white/10">
          <h2 className="text-white font-semibold">All Users</h2>
          <input
            type="text"
            placeholder="Search name or email..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="bg-white/5 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white/80 placeholder:text-white/30 focus:outline-none focus:border-[#EC4899] w-56"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 px-4 text-xs font-medium text-white/40 uppercase tracking-wider">
                  User
                </th>
                <th className="text-left py-2 px-4 text-xs font-medium text-white/40 uppercase tracking-wider">
                  Email
                </th>
                <th className="text-left py-2 px-4 text-xs font-medium text-white/40 uppercase tracking-wider">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody>
              {pageUsers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-white/30 text-sm">
                    {search ? 'No users match your search' : 'No users yet'}
                  </td>
                </tr>
              ) : (
                pageUsers.map(user => {
                  const displayName = user.full_name || user.email
                  const initials = getInitials(user.full_name)
                  const color = getAvatarColor(displayName)
                  const isNew = now - new Date(user.created_at).getTime() < WEEK_MS
                  return (
                    <tr
                      key={user.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ background: color }}
                          >
                            {initials}
                          </div>
                          <span className="text-sm font-medium text-white/90">
                            {user.full_name || '—'}
                          </span>
                          {isNew && (
                            <span className="text-xs font-semibold bg-[#fce7f3] text-[#DB2777] rounded px-1.5 py-0.5">
                              New
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-white/60">{user.email}</td>
                      <td className="py-3 px-4 text-sm text-white/40">
                        {new Date(user.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between">
            <span className="text-xs text-white/40">
              {filtered.length} user{filtered.length !== 1 ? 's' : ''}
              {search ? ' found' : ' total'}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="px-3 py-1.5 text-xs text-white/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed border border-white/20 rounded-lg transition-colors"
              >
                Prev
              </button>
              <span className="text-xs text-white/40">
                {safePage} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="px-3 py-1.5 text-xs text-white/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed border border-white/20 rounded-lg transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  npx tsc --noEmit 2>&1 | grep "UserTable" | head -10
  ```
  Expected: no errors for `UserTable.tsx`.

---

## Task 6: Build the analytics page

**Files:**
- Create: `src/app/(admin)/dashboard/analytics/page.tsx`

- [ ] **Step 1: Create the page component**

  Create `src/app/(admin)/dashboard/analytics/page.tsx`:
  ```tsx
  'use client'

  import { useState, useEffect } from 'react'
  import SignupChart from '@/components/dashboard/analytics/SignupChart'
  import UserTable from '@/components/dashboard/analytics/UserTable'

  interface User {
    id: string
    full_name: string | null
    email: string
    created_at: string
  }

  interface AnalyticsData {
    users: User[]
    signupsByDay: { date: string; count: number }[]
    signupsByMonth: { month: string; count: number }[]
    totalUsers: number
    thisMonth: number
    today: number
    newThisWeek: number
  }

  export default function AnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
      fetch('/api/dashboard/analytics/users')
        .then(res => {
          if (!res.ok) throw new Error(`Error ${res.status}`)
          return res.json()
        })
        .then((json: AnalyticsData) => setData(json))
        .catch(err => setError(err.message))
        .finally(() => setLoading(false))
    }, [])

    if (loading) {
      return (
        <div className="space-y-6 pt-16 lg:pt-0 animate-pulse">
          <div className="h-8 w-40 bg-white/10 rounded-lg" />
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-4">
            <div className="glass-card h-72 bg-white/5" />
            <div className="flex flex-col gap-4">
              <div className="glass-card h-20 bg-white/5" />
              <div className="glass-card h-20 bg-white/5" />
              <div className="glass-card h-20 bg-white/5" />
            </div>
          </div>
          <div className="glass-card h-64 bg-white/5" />
        </div>
      )
    }

    if (error || !data) {
      return (
        <div className="pt-16 lg:pt-0">
          <p className="text-white/50 text-sm">{error ?? 'Failed to load analytics'}</p>
        </div>
      )
    }

    return (
      <div className="space-y-6 animate-fade-in pt-16 lg:pt-0">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Analytics</h1>
          <p className="text-white/50 text-sm">User growth &amp; sign-up tracking</p>
        </div>

        {/* Chart + stat cards side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-4 items-start">
          <SignupChart
            signupsByDay={data.signupsByDay}
            signupsByMonth={data.signupsByMonth}
          />

          <div className="flex flex-col gap-4">
            {/* Total Users */}
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-white/50 text-xs font-medium uppercase tracking-widest">
                  Total Users
                </h3>
                <svg
                  className="w-4 h-4 text-[#f9a8d4]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <p className="text-2xl font-bold text-white">
                {data.totalUsers.toLocaleString()}
              </p>
              <p className="text-xs text-green-400 font-semibold mt-1">
                +{data.newThisWeek} this week
              </p>
            </div>

            {/* This Month */}
            <div className="glass-card p-5">
              <h3 className="text-white/50 text-xs font-medium uppercase tracking-widest mb-1">
                This Month
              </h3>
              <p className="text-2xl font-bold text-white">
                {data.thisMonth.toLocaleString()}
              </p>
            </div>

            {/* Today */}
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-white/50 text-xs font-medium uppercase tracking-widest">
                  Today
                </h3>
                <svg
                  className="w-4 h-4 text-[#f9a8d4]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
              <p className="text-2xl font-bold text-white">{data.today.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* User table */}
        <UserTable users={data.users} />
      </div>
    )
  }
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  npx tsc --noEmit 2>&1 | grep -E "(analytics|SignupChart|UserTable)" | head -20
  ```
  Expected: no errors in any of the new files.

- [ ] **Step 3: Commit**

  ```bash
  git add src/components/dashboard/analytics/SignupChart.tsx src/components/dashboard/analytics/UserTable.tsx src/app/(admin)/dashboard/analytics/page.tsx
  git commit -m "feat(analytics): add analytics page with signup chart and user table"
  ```

---

## Task 7: Verify end-to-end

- [ ] **Step 1: Run all new tests**

  ```bash
  npx jest tests/api/dashboard/analytics/ --no-coverage
  ```
  Expected: 5 tests pass.

- [ ] **Step 2: Run TypeScript check across all changed files**

  ```bash
  npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -30
  ```
  Expected: no new errors introduced by this feature (pre-existing errors in unrelated files are acceptable).

- [ ] **Step 3: Start dev server and manually verify**

  ```bash
  npm run dev
  ```
  Navigate to `http://localhost:3000/dashboard/analytics` as an admin/manager user. Verify:
  - "Analytics" appears in the sidebar under Team → Importation
  - Signup Growth bar chart renders with pink bars
  - "30 Days" / "12 Months" toggle switches the chart
  - Three stat cards (Total Users with "+N this week" badge, This Month, Today) appear to the right of the chart
  - User table loads with Avatar initials, name, email, joined date
  - "New" badge shows on users who joined within the last 7 days
  - Search box filters the table instantly
  - Pagination appears when there are more than 20 users

- [ ] **Step 4: Final commit (if any cleanup needed)**

  ```bash
  git add -p
  git commit -m "fix(analytics): polish and cleanup"
  ```
  Skip this step if no changes are needed.
