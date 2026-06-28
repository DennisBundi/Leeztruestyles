export interface ChinaOrderItem {
  description: string
  quantity: number
  imageUrl?: string
}

export interface ChinaOrderData {
  items: ChinaOrderItem[]
  totalBudget?: string
  name: string
  phone: string
}

export function formatChinaOrderMessage(order: ChinaOrderData): string {
  const itemBlocks = order.items
    .map((item, i) => {
      const lines = [`📦 *Item ${i + 1}*`, item.description, `Qty: ${item.quantity}`]
      if (item.imageUrl) lines.push(`📷 ${item.imageUrl}`)
      return lines.join('\n')
    })
    .join('\n\n')

  const budgetLine = order.totalBudget
    ? `\n💰 *Total budget:* KES ${order.totalBudget}`
    : ''

  return [
    '🇨🇳 *New China Order Request*',
    '━━━━━━━━━━━━━━━━━━',
    `👤 *${order.name}* · ${order.phone}`,
    '',
    itemBlocks,
    budgetLine,
    '━━━━━━━━━━━━━━━━━━',
    'Sent from leeztruestyles.com',
  ].join('\n')
}
