/** @jest-environment node */
import { describe, it, expect } from '@jest/globals'
import {
  orderConfirmationTemplate,
  deliveryConfirmationTemplate,
  cancellationTemplate,
  welcomeTemplate,
  orderProcessingTemplate,
  refundTemplate,
  invoiceEmailTemplate,
  referralRewardTemplate,
  birthdayOfferTemplate,
  importationWaitlistTemplate,
} from '@/lib/email/templates'

const mockOrder = {
  id: 'f1a2b3c4-d5e6-7890-abcd-ef1234567890',
  created_at: '2026-01-15T10:00:00Z',
  payment_method: 'mpesa',
  total_amount: 3500,
}

const mockItems = [
  { product_name: 'Ankara Dress', quantity: 2, unit_price: 1500 },
  { product_name: 'Kitenge Skirt', quantity: 1, unit_price: 500 },
]

describe('orderConfirmationTemplate', () => {
  it('returns subject containing order number', () => {
    const { subject } = orderConfirmationTemplate(mockOrder, mockItems, 'Jane Doe')
    expect(subject).toMatch(/LEEZT-/)
    expect(subject).toMatch(/Order Confirmed/)
  })

  it('customer copy contains customer name and items', () => {
    const { html } = orderConfirmationTemplate(mockOrder, mockItems, 'Jane Doe', false)
    expect(html).toContain('Jane Doe')
    expect(html).toContain('Ankara Dress')
    expect(html).toContain('Kitenge Skirt')
    expect(html).toContain('M-Pesa')
  })

  it('customer copy does not contain store banner', () => {
    const { html } = orderConfirmationTemplate(mockOrder, mockItems, 'Jane Doe', false)
    expect(html).not.toContain('New order received')
  })

  it('store copy contains "New order received" banner', () => {
    const { html } = orderConfirmationTemplate(mockOrder, mockItems, 'Jane Doe', true)
    expect(html).toContain('New order received')
  })
})

describe('deliveryConfirmationTemplate', () => {
  it('returns subject containing order number', () => {
    const { subject } = deliveryConfirmationTemplate(mockOrder, mockItems, 'Jane Doe')
    expect(subject).toMatch(/LEEZT-/)
    expect(subject).toMatch(/delivered/)
  })

  it('customer copy contains order number and product names', () => {
    const { html } = deliveryConfirmationTemplate(mockOrder, mockItems, 'Jane Doe', false)
    expect(html).toContain('LEEZT-')
    expect(html).toContain('Ankara Dress')
  })

  it('store copy contains customer name', () => {
    const { html } = deliveryConfirmationTemplate(mockOrder, mockItems, 'Jane Doe', true)
    expect(html).toContain('Jane Doe')
  })
})

describe('cancellationTemplate', () => {
  it('returns subject containing order number', () => {
    const { subject } = cancellationTemplate(mockOrder, 'Jane Doe')
    expect(subject).toMatch(/LEEZT-/)
    expect(subject).toMatch(/Cancelled/)
  })

  it('customer copy contains refund notice', () => {
    const { html } = cancellationTemplate(mockOrder, 'Jane Doe', false)
    expect(html).toContain('refund')
  })

  it('store copy contains customer name', () => {
    const { html } = cancellationTemplate(mockOrder, 'Jane Doe', true)
    expect(html).toContain('Jane Doe')
  })
})

describe('welcomeTemplate', () => {
  it('subject contains Welcome', () => {
    const { subject } = welcomeTemplate('Jane Doe')
    expect(subject).toContain('Welcome')
  })

  it('html contains customer name', () => {
    const { html } = welcomeTemplate('Jane Doe')
    expect(html).toContain('Jane Doe')
    expect(html).toContain('Leeztruestyles')
  })
})

describe('orderProcessingTemplate', () => {
  it('subject contains order number and preparing', () => {
    const { subject } = orderProcessingTemplate(mockOrder, mockItems, 'Jane Doe')
    expect(subject).toMatch(/LEEZT-/)
    expect(subject).toMatch(/preparing/i)
  })

  it('customer copy contains items', () => {
    const { html } = orderProcessingTemplate(mockOrder, mockItems, 'Jane Doe', false)
    expect(html).toContain('Ankara Dress')
    expect(html).not.toContain('being prepared for')
  })

  it('store copy contains customer name banner', () => {
    const { html } = orderProcessingTemplate(mockOrder, mockItems, 'Jane Doe', true)
    expect(html).toContain('Jane Doe')
  })
})

describe('refundTemplate', () => {
  it('subject contains Refund and order number', () => {
    const { subject } = refundTemplate(mockOrder, 'Jane Doe')
    expect(subject).toMatch(/Refund/i)
    expect(subject).toMatch(/LEEZT-/)
  })

  it('html contains refund notice', () => {
    const { html } = refundTemplate(mockOrder, 'Jane Doe', false)
    expect(html).toContain('refund')
    expect(html).toContain('3')
  })

  it('store copy contains customer name', () => {
    const { html } = refundTemplate(mockOrder, 'Jane Doe', true)
    expect(html).toContain('Jane Doe')
  })
})

describe('invoiceEmailTemplate', () => {
  it('subject contains invoice and order number', () => {
    const { subject } = invoiceEmailTemplate(mockOrder, 'Jane Doe')
    expect(subject).toMatch(/invoice/i)
    expect(subject).toMatch(/LEEZT-/)
  })

  it('html mentions PDF attachment', () => {
    const { html } = invoiceEmailTemplate(mockOrder, 'Jane Doe')
    expect(html).toContain('Jane Doe')
    expect(html.toLowerCase()).toContain('attach')
  })
})

describe('referralRewardTemplate', () => {
  it('subject mentions points earned', () => {
    const { subject } = referralRewardTemplate('John', 'Mary', 100)
    expect(subject.toLowerCase()).toContain('point')
  })

  it('html contains referred name and points', () => {
    const { html } = referralRewardTemplate('John', 'Mary', 100)
    expect(html).toContain('Mary')
    expect(html).toContain('100')
  })
})

describe('birthdayOfferTemplate', () => {
  it('subject contains birthday', () => {
    const { subject } = birthdayOfferTemplate('Jane', 'BDAY-ABC123', '2026-07-08')
    expect(subject.toLowerCase()).toContain('birthday')
  })

  it('html contains name and discount code', () => {
    const { html } = birthdayOfferTemplate('Jane', 'BDAY-ABC123', '2026-07-08')
    expect(html).toContain('Jane')
    expect(html).toContain('BDAY-ABC123')
  })
})

describe('importationWaitlistTemplate', () => {
  it('subject confirms waitlist', () => {
    const { subject } = importationWaitlistTemplate('Jane')
    expect(subject.toLowerCase()).toContain('waitlist')
  })

  it('html contains name and next steps', () => {
    const { html } = importationWaitlistTemplate('Jane')
    expect(html).toContain('Jane')
    expect(html.toLowerCase()).toContain('touch')
  })
})
