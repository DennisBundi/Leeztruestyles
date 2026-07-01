/** @jest-environment node */
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'

const mockEmailSend = jest.fn().mockResolvedValue({ id: 'email-id' })
jest.mock('@/lib/email/resend', () => ({
  resendClient: { emails: { send: mockEmailSend } },
}))

jest.mock('@/lib/email/invoice-pdf', () => ({
  generateInvoiceBuffer: jest.fn().mockResolvedValue(Buffer.from('fake-pdf')),
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

function makeAdminClient(users: Array<{ id: string; full_name: string; email: string }>) {
  return {
    from: jest.fn((table: string) => {
      if (table === 'loyalty_accounts') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: users.map(u => ({ user_id: u.id })), error: null }),
            }),
          }),
        }
      }
      if (table === 'users') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: users[0], error: null }),
            }),
          }),
        }
      }
      if (table === 'reward_codes') {
        return {
          insert: jest.fn().mockResolvedValue({ error: null }),
        }
      }
      return {}
    }),
  }
}

function makeRequest(secret: string) {
  return new NextRequest('http://localhost/api/cron/birthday-emails', {
    headers: { Authorization: `Bearer ${secret}` },
  })
}

describe('GET /api/cron/birthday-emails', () => {
  const originalEnv = process.env.CRON_SECRET

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.CRON_SECRET = 'test-secret'
  })

  afterEach(() => {
    process.env.CRON_SECRET = originalEnv
  })

  it('returns 401 when Authorization header is missing', async () => {
    const { GET } = await import('@/app/api/cron/birthday-emails/route')
    const req = new NextRequest('http://localhost/api/cron/birthday-emails')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 when secret is wrong', async () => {
    const { GET } = await import('@/app/api/cron/birthday-emails/route')
    const res = await GET(makeRequest('wrong-secret'))
    expect(res.status).toBe(401)
  })

  it('sends birthday emails for matched users and returns count', async () => {
    const { createAdminClient } = require('@/lib/supabase/admin')
    createAdminClient.mockReturnValue(
      makeAdminClient([{ id: 'user-1', full_name: 'Jane Doe', email: 'jane@example.com' }])
    )

    const { GET } = await import('@/app/api/cron/birthday-emails/route')
    const res = await GET(makeRequest('test-secret'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.sent).toBe(1)
    expect(mockEmailSend).toHaveBeenCalledTimes(1)
  })

  it('returns 200 with sent:0 when no birthdays today', async () => {
    const { createAdminClient } = require('@/lib/supabase/admin')
    createAdminClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'loyalty_accounts') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }
        }
        return {}
      }),
    })

    const { GET } = await import('@/app/api/cron/birthday-emails/route')
    const res = await GET(makeRequest('test-secret'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.sent).toBe(0)
    expect(mockEmailSend).not.toHaveBeenCalled()
  })
})
