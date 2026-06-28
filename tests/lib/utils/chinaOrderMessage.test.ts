import { formatChinaOrderMessage, ChinaOrderData } from '@/lib/utils/chinaOrderMessage'

describe('formatChinaOrderMessage', () => {
  const base: ChinaOrderData = {
    items: [{ description: 'Blue hoodie, size L', quantity: 2 }],
    name: 'Jane Wanjiku',
    phone: '0712345678',
  }

  it('includes header, name, phone, item description and qty', () => {
    const result = formatChinaOrderMessage(base)
    expect(result).toContain('🇨🇳 *New China Order Request*')
    expect(result).toContain('👤 *Jane Wanjiku* · 0712345678')
    expect(result).toContain('📦 *Item 1*')
    expect(result).toContain('Blue hoodie, size L')
    expect(result).toContain('Qty: 2')
    expect(result).toContain('Sent from leeztruestyles.com')
  })

  it('omits image line when no imageUrl', () => {
    const result = formatChinaOrderMessage(base)
    expect(result).not.toContain('📷')
  })

  it('includes image URL when provided', () => {
    const result = formatChinaOrderMessage({
      ...base,
      items: [{ ...base.items[0], imageUrl: 'https://example.com/jacket.jpg' }],
    })
    expect(result).toContain('📷 https://example.com/jacket.jpg')
  })

  it('omits budget line when no budget provided', () => {
    const result = formatChinaOrderMessage(base)
    expect(result).not.toContain('💰')
  })

  it('includes budget when provided', () => {
    const result = formatChinaOrderMessage({ ...base, totalBudget: '15,000' })
    expect(result).toContain('💰 *Total budget:* KES 15,000')
  })

  it('numbers multiple items correctly', () => {
    const result = formatChinaOrderMessage({
      ...base,
      items: [
        { description: 'Jacket', quantity: 1 },
        { description: 'Shoes, size 40', quantity: 2 },
      ],
    })
    expect(result).toContain('📦 *Item 1*')
    expect(result).toContain('Jacket')
    expect(result).toContain('📦 *Item 2*')
    expect(result).toContain('Shoes, size 40')
  })
})
