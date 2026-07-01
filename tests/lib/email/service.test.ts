/** @jest-environment node */
import { describe, it, expect, beforeEach, jest } from '@jest/globals'

// Mock resend client
const mockEmailSend = jest.fn().mockResolvedValue({ id: 'email-id-1' })
jest.mock('@/lib/email/resend', () => ({
  resendClient: { emails: { send: mockEmailSend } },
}))

// Add after mockEmailSend declaration (top of file)
const mockPdfGenerate = jest.fn().mockResolvedValue(Buffer.from('fake-pdf'))
jest.mock('@/lib/email/invoice-pdf', () => ({
  generateInvoiceBuffer: (...args: any[]) => mockPdfGenerate(...args),
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

describe('sendWelcomeEmail', () => {
  beforeEach(() => jest.clearAllMocks())

  it('sends one email to the customer', async () => {
    const { createAdminClient } = require('@/lib/supabase/admin')
    createAdminClient.mockReturnValue(makeAdminClient(mockUserWithEmail))

    const { sendWelcomeEmail } = await import('@/lib/email/service')
    await sendWelcomeEmail('user-uuid-1')

    expect(mockEmailSend).toHaveBeenCalledTimes(1)
    expect(mockEmailSend.mock.calls[0][0].to).toContain('jane@example.com')
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

    const { sendWelcomeEmail } = await import('@/lib/email/service')
    await expect(sendWelcomeEmail('bad-id')).resolves.toBeUndefined()
  })
})

describe('sendOrderProcessingEmail', () => {
  beforeEach(() => jest.clearAllMocks())

  it('sends two emails when customer has email', async () => {
    const { createAdminClient } = require('@/lib/supabase/admin')
    createAdminClient.mockReturnValue(makeAdminClient(mockUserWithEmail))

    const { sendOrderProcessingEmail } = await import('@/lib/email/service')
    await sendOrderProcessingEmail('f1a2b3c4-d5e6-7890-abcd-ef1234567890')

    expect(mockEmailSend).toHaveBeenCalledTimes(2)
    const recipients = mockEmailSend.mock.calls.flatMap((c: any) => c[0].to)
    expect(recipients).toContain('jane@example.com')
    expect(recipients).toContain('leeztruestyles44@gmail.com')
  })
})

describe('sendRefundEmail', () => {
  beforeEach(() => jest.clearAllMocks())

  it('sends two emails when customer has email', async () => {
    const { createAdminClient } = require('@/lib/supabase/admin')
    createAdminClient.mockReturnValue(makeAdminClient(mockUserWithEmail))

    const { sendRefundEmail } = await import('@/lib/email/service')
    await sendRefundEmail('f1a2b3c4-d5e6-7890-abcd-ef1234567890')

    expect(mockEmailSend).toHaveBeenCalledTimes(2)
  })

  it('sends only store copy when no customer email', async () => {
    const { createAdminClient } = require('@/lib/supabase/admin')
    createAdminClient.mockReturnValue(makeAdminClient(mockUserNoEmail))

    const { sendRefundEmail } = await import('@/lib/email/service')
    await sendRefundEmail('f1a2b3c4-d5e6-7890-abcd-ef1234567890')

    expect(mockEmailSend).toHaveBeenCalledTimes(1)
    expect(mockEmailSend.mock.calls[0][0].to).toContain('leeztruestyles44@gmail.com')
  })
})

describe('sendInvoiceEmail', () => {
  beforeEach(() => jest.clearAllMocks())

  it('sends one email with PDF attachment when customer has email', async () => {
    const { createAdminClient } = require('@/lib/supabase/admin')
    createAdminClient.mockReturnValue(makeAdminClient(mockUserWithEmail))

    const { sendInvoiceEmail } = await import('@/lib/email/service')
    await sendInvoiceEmail('f1a2b3c4-d5e6-7890-abcd-ef1234567890')

    expect(mockPdfGenerate).toHaveBeenCalledTimes(1)
    expect(mockEmailSend).toHaveBeenCalledTimes(1)
    const call = mockEmailSend.mock.calls[0][0]
    expect(call.to).toContain('jane@example.com')
    expect(call.attachments).toHaveLength(1)
    expect(call.attachments[0].filename).toMatch(/^invoice-LEEZT-/)
  })

  it('does not send when customer has no email and no override', async () => {
    const { createAdminClient } = require('@/lib/supabase/admin')
    createAdminClient.mockReturnValue(makeAdminClient(mockUserNoEmail))

    const { sendInvoiceEmail } = await import('@/lib/email/service')
    await sendInvoiceEmail('f1a2b3c4-d5e6-7890-abcd-ef1234567890')

    expect(mockEmailSend).not.toHaveBeenCalled()
  })

  it('uses customerEmail override', async () => {
    const { createAdminClient } = require('@/lib/supabase/admin')
    createAdminClient.mockReturnValue(makeAdminClient(mockUserNoEmail))

    const { sendInvoiceEmail } = await import('@/lib/email/service')
    await sendInvoiceEmail('f1a2b3c4-d5e6-7890-abcd-ef1234567890', 'override@example.com')

    expect(mockEmailSend).toHaveBeenCalledTimes(1)
    expect(mockEmailSend.mock.calls[0][0].to).toContain('override@example.com')
  })
})
