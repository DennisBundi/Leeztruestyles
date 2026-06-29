/** @jest-environment node */
import { describe, it, expect, beforeEach, jest } from '@jest/globals'

// Mock resend client
const mockEmailSend = jest.fn().mockResolvedValue({ id: 'email-id-1' })
jest.mock('@/lib/email/resend', () => ({
  resendClient: { emails: { send: mockEmailSend } },
}))

// Mock data
const mockOrder = {
  id: 'f1a2b3c4-d5e6-7890-abcd-ef1234567890',
  created_at: '2026-01-15T10:00:00Z',
  payment_method: 'mpesa',
  total_amount: 3500,
  user_id: 'user-uuid-1',
}
const mockItems = [
  { products: { name: 'Ankara Dress' }, quantity: 1, unit_price: 3500 },
]
const mockUserWithEmail = { full_name: 'Jane Doe', email: 'jane@example.com' }
const mockUserNoEmail = { full_name: 'Jane Doe', email: null }

// Build chained mock for Supabase admin
function makeSingle(data: unknown) {
  return { single: jest.fn().mockResolvedValue({ data, error: null }) }
}

function makeAdminClient(userRow: typeof mockUserWithEmail | typeof mockUserNoEmail) {
  return {
    from: jest.fn((table: string) => {
      if (table === 'orders') {
        return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue(makeSingle(mockOrder)) }) }
      }
      if (table === 'order_items') {
        return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ data: mockItems, error: null }) }) }
      }
      if (table === 'users') {
        return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue(makeSingle(userRow)) }) }
      }
      return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue(makeSingle(null)) }) }
    }),
  }
}

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

describe('sendOrderConfirmation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('sends two emails when customer email is resolvable', async () => {
    const { createAdminClient } = require('@/lib/supabase/admin')
    createAdminClient.mockReturnValue(makeAdminClient(mockUserWithEmail))

    const { sendOrderConfirmation } = await import('@/lib/email/service')
    await sendOrderConfirmation('f1a2b3c4-d5e6-7890-abcd-ef1234567890')

    expect(mockEmailSend).toHaveBeenCalledTimes(2)
    const calls = mockEmailSend.mock.calls
    const allRecipients = calls.flatMap((c: any) => c[0].to)
    expect(allRecipients).toContain('jane@example.com')
    expect(allRecipients).toContain('leeztruestyles44@gmail.com')
  })

  it('sends only the store copy when customer has no email', async () => {
    const { createAdminClient } = require('@/lib/supabase/admin')
    createAdminClient.mockReturnValue(makeAdminClient(mockUserNoEmail))

    const { sendOrderConfirmation } = await import('@/lib/email/service')
    await sendOrderConfirmation('f1a2b3c4-d5e6-7890-abcd-ef1234567890')

    expect(mockEmailSend).toHaveBeenCalledTimes(1)
    expect(mockEmailSend.mock.calls[0][0].to).toContain('leeztruestyles44@gmail.com')
  })

  it('uses the customerEmail override instead of DB lookup', async () => {
    const { createAdminClient } = require('@/lib/supabase/admin')
    createAdminClient.mockReturnValue(makeAdminClient(mockUserNoEmail))

    const { sendOrderConfirmation } = await import('@/lib/email/service')
    await sendOrderConfirmation('f1a2b3c4-d5e6-7890-abcd-ef1234567890', 'override@example.com')

    const allRecipients = mockEmailSend.mock.calls.flatMap((c: any) => c[0].to)
    expect(allRecipients).toContain('override@example.com')
  })

  it('swallows errors without rethrowing', async () => {
    const { createAdminClient } = require('@/lib/supabase/admin')
    createAdminClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }) }),
        }),
      }),
    })

    const { sendOrderConfirmation } = await import('@/lib/email/service')
    await expect(sendOrderConfirmation('bad-id')).resolves.toBeUndefined()
  })
})

describe('sendDeliveryConfirmation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('sends two emails when customer email is resolvable', async () => {
    const { createAdminClient } = require('@/lib/supabase/admin')
    createAdminClient.mockReturnValue(makeAdminClient(mockUserWithEmail))

    const { sendDeliveryConfirmation } = await import('@/lib/email/service')
    await sendDeliveryConfirmation('f1a2b3c4-d5e6-7890-abcd-ef1234567890')

    expect(mockEmailSend).toHaveBeenCalledTimes(2)
  })
})

describe('sendCancellationEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('sends two emails when customer email is resolvable', async () => {
    const { createAdminClient } = require('@/lib/supabase/admin')
    createAdminClient.mockReturnValue(makeAdminClient(mockUserWithEmail))

    const { sendCancellationEmail } = await import('@/lib/email/service')
    await sendCancellationEmail('f1a2b3c4-d5e6-7890-abcd-ef1234567890')

    expect(mockEmailSend).toHaveBeenCalledTimes(2)
  })
})
