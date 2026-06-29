/** @jest-environment node */
import { describe, it, expect } from '@jest/globals'
import {
  orderConfirmationTemplate,
  deliveryConfirmationTemplate,
  cancellationTemplate,
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
