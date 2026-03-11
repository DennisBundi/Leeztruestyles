/** @jest-environment node */
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'

const mockOrder = {
  id: 'order-uuid-1',
  user_id: 'user-1',
  status: 'shipped',
}

const mockSingle = jest.fn()
const mockEq = jest.fn().mockReturnValue({ single: mockSingle })
const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
const mockUpdateEq = jest.fn().mockResolvedValue({ error: null })
const mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEq })

const mockAdminClient: any = {
  from: jest.fn().mockReturnValue({
    select: mockSelect,
    update: mockUpdate,
  }),
}

const mockSupabaseClient: any = {
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    }),
  },
}

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => mockAdminClient),
}))

describe('POST /api/orders/[id]/deliver', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSingle.mockResolvedValue({ data: mockOrder, error: null })
    mockEq.mockReturnValue({ single: mockSingle })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockUpdateEq.mockResolvedValue({ error: null })
    mockUpdate.mockReturnValue({ eq: mockUpdateEq })
    mockAdminClient.from.mockReturnValue({ select: mockSelect, update: mockUpdate })
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
  })

  it('returns 401 when not authenticated', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    })
    const { POST } = await import('@/app/api/orders/[id]/deliver/route')
    const req = new NextRequest('http://localhost/api/orders/order-uuid-1/deliver', { method: 'POST' })
    const res = await POST(req, { params: Promise.resolve({ id: 'order-uuid-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 404 when order not found', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
    const { POST } = await import('@/app/api/orders/[id]/deliver/route')
    const req = new NextRequest('http://localhost/api/orders/order-uuid-1/deliver', { method: 'POST' })
    const res = await POST(req, { params: Promise.resolve({ id: 'order-uuid-1' }) })
    expect(res.status).toBe(404)
  })

  it('returns 403 when order belongs to a different user', async () => {
    mockSingle.mockResolvedValueOnce({ data: { ...mockOrder, user_id: 'other-user' }, error: null })
    const { POST } = await import('@/app/api/orders/[id]/deliver/route')
    const req = new NextRequest('http://localhost/api/orders/order-uuid-1/deliver', { method: 'POST' })
    const res = await POST(req, { params: Promise.resolve({ id: 'order-uuid-1' }) })
    expect(res.status).toBe(403)
  })

  it('returns 409 when order is not in shipped status', async () => {
    mockSingle.mockResolvedValueOnce({ data: { ...mockOrder, status: 'paid' }, error: null })
    const { POST } = await import('@/app/api/orders/[id]/deliver/route')
    const req = new NextRequest('http://localhost/api/orders/order-uuid-1/deliver', { method: 'POST' })
    const res = await POST(req, { params: Promise.resolve({ id: 'order-uuid-1' }) })
    expect(res.status).toBe(409)
  })

  it('marks a shipped order as delivered', async () => {
    const { POST } = await import('@/app/api/orders/[id]/deliver/route')
    const req = new NextRequest('http://localhost/api/orders/order-uuid-1/deliver', { method: 'POST' })
    const res = await POST(req, { params: Promise.resolve({ id: 'order-uuid-1' }) })
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'delivered' })
  })
})
