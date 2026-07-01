import { formatOrderId } from '@/lib/utils/orderId'

export interface EmailTemplate {
  subject: string
  html: string
}

export interface OrderForEmail {
  id: string
  created_at: string
  payment_method: string
  total_amount: number
}

export interface OrderItemForEmail {
  product_name: string
  quantity: number
  unit_price: number
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatCurrency(amount: number): string {
  return `KES ${amount.toFixed(2)}`
}

function paymentLabel(method: string): string {
  const labels: Record<string, string> = { mpesa: 'M-Pesa', card: 'Card', cash: 'Cash' }
  return labels[method] ?? method
}

function css(): string {
  return `
    body{font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0}
    .wrap{max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden}
    .hdr{background:#1a1a2e;color:#fff;padding:24px;text-align:center}
    .hdr h1{margin:0;font-size:24px;letter-spacing:1px}
    .body{padding:24px}
    .num{font-size:13px;color:#666;margin-bottom:8px}
    table{width:100%;border-collapse:collapse;margin:16px 0}
    th{background:#f4f4f4;text-align:left;padding:8px 12px;font-size:13px}
    td{padding:8px 12px;border-bottom:1px solid #eee;font-size:14px}
    .total{font-weight:bold;font-size:16px;text-align:right;margin-top:8px}
    .ftr{background:#f4f4f4;padding:16px 24px;text-align:center;font-size:12px;color:#888}
    .cta{display:inline-block;background:#25d366;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;margin-top:16px}
    .banner{background:#e8f4fd;border-left:4px solid #2196f3;padding:12px 16px;margin-bottom:16px;font-size:14px}
  `
}

function shell(body: string): string {
  return `<!DOCTYPE html><html><head><style>${css()}</style></head><body><div class="wrap">${body}</div></body></html>`
}

const HDR = `<div class="hdr"><h1>Leeztruestyles</h1></div>`
const FTR = `<div class="ftr">Leeztruestyles &middot; leeztruestyles44@gmail.com</div>`
const WA = `<a class="cta" href="https://wa.me/254700000000">Contact us on WhatsApp</a>`

export function orderConfirmationTemplate(
  order: OrderForEmail,
  items: OrderItemForEmail[],
  customerName: string,
  isStoreCopy = false
): EmailTemplate {
  const num = formatOrderId(order.id)
  const subject = `Order Confirmed — #${num}`

  const banner = isStoreCopy
    ? `<div class="banner">&#128230; New order received &mdash; ${customerName}</div>`
    : ''

  const rows = items
    .map(
      (i) =>
        `<tr><td>${i.product_name}</td><td style="text-align:center">${i.quantity}</td>` +
        `<td style="text-align:right">${formatCurrency(i.unit_price)}</td>` +
        `<td style="text-align:right">${formatCurrency(i.quantity * i.unit_price)}</td></tr>`
    )
    .join('')

  const body = `
    ${HDR}
    <div class="body">
      ${banner}
      <h2>Thank you for your order, ${customerName}!</h2>
      <div class="num">Order #${num} &middot; ${formatDate(order.created_at)}</div>
      <table>
        <thead><tr><th>Product</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Subtotal</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="total">Total: ${formatCurrency(order.total_amount)}</div>
      <p>Payment: ${paymentLabel(order.payment_method)}</p>
      <p>We&#39;ll notify you when your order is on its way.</p>
      ${WA}
    </div>
    ${FTR}`

  return { subject, html: shell(body) }
}

export function deliveryConfirmationTemplate(
  order: OrderForEmail,
  items: OrderItemForEmail[],
  customerName: string,
  isStoreCopy = false
): EmailTemplate {
  const num = formatOrderId(order.id)
  const subject = `Your order has been delivered — #${num}`

  const banner = isStoreCopy
    ? `<div class="banner">&#9989; Order #${num} marked as delivered &mdash; ${customerName}</div>`
    : ''

  const productNames = items.map((i) => i.product_name).join(', ')

  const body = `
    ${HDR}
    <div class="body">
      ${banner}
      <h2>Your order has arrived!</h2>
      <div class="num">Order #${num}</div>
      <p>Items: ${productNames}</p>
      <p>Thank you for shopping with Leeztruestyles!</p>
      ${WA.replace('Contact us on WhatsApp', 'Contact us on WhatsApp for any issues')}
    </div>
    ${FTR}`

  return { subject, html: shell(body) }
}

export function cancellationTemplate(
  order: OrderForEmail,
  customerName: string,
  isStoreCopy = false
): EmailTemplate {
  const num = formatOrderId(order.id)
  const subject = `Order Cancelled — #${num}`

  const banner = isStoreCopy
    ? `<div class="banner">&#10060; Order #${num} has been cancelled &mdash; ${customerName}</div>`
    : ''

  const body = `
    ${HDR}
    <div class="body">
      ${banner}
      <h2>Your order has been cancelled</h2>
      <div class="num">Order #${num}</div>
      <p>If you made a payment, your refund will be processed within 3&ndash;5 business days.</p>
      ${WA.replace('Contact us on WhatsApp', 'Contact us on WhatsApp for questions')}
    </div>
    ${FTR}`

  return { subject, html: shell(body) }
}

export function welcomeTemplate(customerName: string): EmailTemplate {
  const body = `
    ${HDR}
    <div class="body">
      <h2>Welcome to Leeztruestyles, ${customerName}!</h2>
      <p>We're thrilled to have you. Explore our latest collections and find your style.</p>
      <p>As a member you'll earn Leez Rewards points on every purchase, get early access to new arrivals, and enjoy exclusive member offers.</p>
      ${WA}
    </div>
    ${FTR}`
  return { subject: 'Welcome to Leeztruestyles!', html: shell(body) }
}

export function orderProcessingTemplate(
  order: OrderForEmail,
  items: OrderItemForEmail[],
  customerName: string,
  isStoreCopy = false
): EmailTemplate {
  const num = formatOrderId(order.id)
  const subject = `Your order is preparing — #${num}`

  const banner = isStoreCopy
    ? `<div class="banner">&#9201; Order #${num} is now processing &mdash; ${customerName}</div>`
    : ''

  const rows = items
    .map(
      (i) =>
        `<tr><td>${i.product_name}</td><td style="text-align:center">${i.quantity}</td>` +
        `<td style="text-align:right">${formatCurrency(i.unit_price)}</td></tr>`
    )
    .join('')

  const body = `
    ${HDR}
    <div class="body">
      ${banner}
      <h2>We're preparing your order, ${customerName}!</h2>
      <div class="num">Order #${num} &middot; ${formatDate(order.created_at)}</div>
      <table>
        <thead><tr><th>Product</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="total">Total: ${formatCurrency(order.total_amount)}</div>
      <p>We'll let you know as soon as it's on its way.</p>
      ${WA}
    </div>
    ${FTR}`

  return { subject, html: shell(body) }
}

export function refundTemplate(
  order: OrderForEmail,
  customerName: string,
  isStoreCopy = false
): EmailTemplate {
  const num = formatOrderId(order.id)
  const subject = `Refund initiated — #${num}`

  const banner = isStoreCopy
    ? `<div class="banner">&#128260; Refund initiated for order #${num} &mdash; ${customerName}</div>`
    : ''

  const body = `
    ${HDR}
    <div class="body">
      ${banner}
      <h2>Your refund is on its way, ${customerName}</h2>
      <div class="num">Order #${num}</div>
      <p>We've initiated a refund of <strong>${formatCurrency(order.total_amount)}</strong> for your order.</p>
      <p>Please allow 3&ndash;5 business days for the funds to reflect in your account.</p>
      ${WA.replace('Contact us on WhatsApp', 'Contact us on WhatsApp for any questions')}
    </div>
    ${FTR}`

  return { subject, html: shell(body) }
}

export function invoiceEmailTemplate(
  order: OrderForEmail,
  customerName: string
): EmailTemplate {
  const num = formatOrderId(order.id)
  const subject = `Your invoice — #${num}`

  const body = `
    ${HDR}
    <div class="body">
      <h2>Hi ${customerName}, here is your invoice</h2>
      <div class="num">Order #${num} &middot; ${formatDate(order.created_at)}</div>
      <p>Please find your invoice attached as a PDF. Keep it for your records.</p>
      <p>Total paid: <strong>${formatCurrency(order.total_amount)}</strong> via ${paymentLabel(order.payment_method)}.</p>
      ${WA}
    </div>
    ${FTR}`

  return { subject, html: shell(body) }
}

export function referralRewardTemplate(
  referrerName: string,
  referredFirstName: string,
  pointsAwarded: number
): EmailTemplate {
  const body = `
    ${HDR}
    <div class="body">
      <h2>You earned points, ${referrerName}!</h2>
      <p><strong>${referredFirstName}</strong> just completed their first purchase using your referral code.</p>
      <p>We've added <strong>${pointsAwarded} Leez Rewards points</strong> to your account.</p>
      <p>Keep sharing your code to earn more rewards!</p>
      ${WA}
    </div>
    ${FTR}`

  return { subject: `You earned ${pointsAwarded} points from a referral!`, html: shell(body) }
}

export function birthdayOfferTemplate(
  customerName: string,
  discountCode: string,
  expiresAt: string
): EmailTemplate {
  const body = `
    ${HDR}
    <div class="body">
      <h2>Happy Birthday, ${customerName}! &#127874;</h2>
      <p>From all of us at Leeztruestyles, we hope you have a wonderful day.</p>
      <p>Here's a birthday gift — <strong>10% off</strong> your next order:</p>
      <div style="background:#f4f4f4;border-radius:6px;padding:16px;text-align:center;font-size:22px;font-weight:bold;letter-spacing:3px;margin:16px 0">
        ${discountCode}
      </div>
      <p style="font-size:13px;color:#666">Valid until ${formatDate(expiresAt)}. One use per account.</p>
      ${WA.replace('Contact us on WhatsApp', 'Shop now and treat yourself')}
    </div>
    ${FTR}`

  return { subject: `Happy Birthday! Here's a gift from Leeztruestyles 🎂`, html: shell(body) }
}

export function importationWaitlistTemplate(customerName: string): EmailTemplate {
  const body = `
    ${HDR}
    <div class="body">
      <h2>You're on the list, ${customerName}!</h2>
      <p>Thank you for your interest in Leeztruestyles Importation Services.</p>
      <p>We'll review your application and get in touch as soon as we're ready to onboard new clients.</p>
      <p>In the meantime, feel free to reach out if you have any questions.</p>
      ${WA}
    </div>
    ${FTR}`

  return {
    subject: `You're on the Leeztruestyles Importation Waitlist`,
    html: shell(body),
  }
}
