/**
 * @jest-environment node
 */
import { GET } from '@/app/api/dashboard/analytics/users/route'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole, canAccessSection } from '@/lib/auth/roles'
import { NextRequest } from 'next/server'

jest.mock('@/lib/supabase/server')
jest.mock('@/lib/supabase/admin')
jest.mock('@/lib/auth/roles')

const mockGetUser = jest.fn()
const mockOrder = jest.fn()
const mockSelect = jest.fn(() => ({ order: mockOrder }))
const mockFrom = jest.fn(() => ({ select: mockSelect }))

function makeRequest() {
  return new NextRequest('http://localhost/api/dashboard/analytics/users')
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(createClient as jest.Mock).mockResolvedValue({ auth: { getUser: mockGetUser } })
  ;(createAdminClient as jest.Mock).mockReturnValue({ from: mockFrom })
  ;(canAccessSection as jest.Mock).mockImplementation(
    (role: string | null, section: string) => {
      if (!role) return false
      if (section === 'analytics') return role === 'admin' || role === 'manager'
      return false
    }
  )
})

describe('GET /api/dashboard/analytics/users', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns 403 when role is seller', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    ;(getUserRole as jest.Mock).mockResolvedValue('seller')
    const res = await GET(makeRequest())
    expect(res.status).toBe(403)
  })

  it('returns 200 with correct shape for admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    ;(getUserRole as jest.Mock).mockResolvedValue('admin')
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
    ;(getUserRole as jest.Mock).mockResolvedValue('manager')
    mockOrder.mockResolvedValue({ data: [], error: null })
    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.totalUsers).toBe(0)
  })

  it('returns 500 on database error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    ;(getUserRole as jest.Mock).mockResolvedValue('admin')
    mockOrder.mockResolvedValue({ data: null, error: new Error('DB error') })
    const res = await GET(makeRequest())
    expect(res.status).toBe(500)
  })
})
