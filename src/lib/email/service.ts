import { createAdminClient } from '@/lib/supabase/admin'
import { resendClient } from './resend'
import { generateInvoiceBuffer } from './invoice-pdf'
import { formatOrderId } from '@/lib/utils/orderId'
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
  type OrderForEmail,
  type OrderItemForEmail,
} from './templates'

const STORE_EMAIL = 'leeztruestyles44@gmail.com'
const FROM_EMAIL = 'orders@leeztruestyles.com'
const FROM_HELLO = 'hello@leeztruestyles.com'
const REPLY_TO = 'leeztruestyles44@gmail.com'

async function fetchOrderWithItems(
  orderId: string
): Promise<{ order: OrderForEmail & { user_id: string | null }; items: OrderItemForEmail[] }> {
  const admin = createAdminClient()

  const { data: order, error: orderError } = await admin
    .from('orders')
    .select('id, created_at, payment_method, total_amount, user_id')
    .eq('id', orderId)
    .single()

  if (orderError || !order) throw new Error(`Order not found: ${orderId}`)

  const { data: rawItems, error: itemsError } = await admin
    .from('order_items')
    .select('quantity, unit_price, products(name)')
    .eq('order_id', orderId)

  if (itemsError) throw new Error(`Failed to fetch items: ${itemsError.message}`)

  const items: OrderItemForEmail[] = (rawItems ?? []).map((i: any) => ({
    product_name: i.products?.name ?? 'Unknown product',
    quantity: i.quantity,
    unit_price: i.unit_price,
  }))

  return { order, items }
}

async function fetchCustomerName(userId: string | null): Promise<string> {
  if (!userId) return 'Customer'
  const admin = createAdminClient()
  const { data } = await admin.from('users').select('full_name').eq('id', userId).single()
  return (data as any)?.full_name ?? 'Customer'
}

async function resolveEmail(userId: string | null, override?: string): Promise<string | null> {
  if (override) return override
  if (!userId) return null
  const admin = createAdminClient()
  const { data } = await admin.from('users').select('email').eq('id', userId).single()
  return (data as any)?.email ?? null
}

async function dispatch(recipients: string[], subject: string, html: string, from = FROM_EMAIL): Promise<void> {
  await resendClient.emails.send({ from, to: recipients, replyTo: REPLY_TO, subject, html })
}

export async function sendOrderConfirmation(orderId: string, customerEmail?: string): Promise<void> {
  try {
    const { order, items } = await fetchOrderWithItems(orderId)
    const name = await fetchCustomerName(order.user_id)
    const email = await resolveEmail(order.user_id, customerEmail)

    if (email) {
      const t = orderConfirmationTemplate(order, items, name, false)
      await dispatch([email], t.subject, t.html)
    }
    const st = orderConfirmationTemplate(order, items, name, true)
    await dispatch([STORE_EMAIL], st.subject, st.html)
  } catch (error) {
    console.error('[email] sendOrderConfirmation failed:', error)
  }
}

export async function sendDeliveryConfirmation(orderId: string, customerEmail?: string): Promise<void> {
  try {
    const { order, items } = await fetchOrderWithItems(orderId)
    const name = await fetchCustomerName(order.user_id)
    const email = await resolveEmail(order.user_id, customerEmail)

    if (email) {
      const t = deliveryConfirmationTemplate(order, items, name, false)
      await dispatch([email], t.subject, t.html)
    }
    const st = deliveryConfirmationTemplate(order, items, name, true)
    await dispatch([STORE_EMAIL], st.subject, st.html)
  } catch (error) {
    console.error('[email] sendDeliveryConfirmation failed:', error)
  }
}

export async function sendCancellationEmail(orderId: string, customerEmail?: string): Promise<void> {
  try {
    const { order } = await fetchOrderWithItems(orderId)
    const name = await fetchCustomerName(order.user_id)
    const email = await resolveEmail(order.user_id, customerEmail)

    if (email) {
      const t = cancellationTemplate(order, name, false)
      await dispatch([email], t.subject, t.html)
    }
    const st = cancellationTemplate(order, name, true)
    await dispatch([STORE_EMAIL], st.subject, st.html)
  } catch (error) {
    console.error('[email] sendCancellationEmail failed:', error)
  }
}

export async function sendWelcomeEmail(userId: string): Promise<void> {
  try {
    const admin = createAdminClient()
    const { data: user } = await admin.from('users').select('email, full_name').eq('id', userId).single()
    if (!user?.email) return
    const t = welcomeTemplate(user.full_name ?? 'Customer')
    await dispatch([user.email], t.subject, t.html, FROM_HELLO)
  } catch (error) {
    console.error('[email] sendWelcomeEmail failed:', error)
  }
}

export async function sendOrderProcessingEmail(orderId: string): Promise<void> {
  try {
    const { order, items } = await fetchOrderWithItems(orderId)
    const name = await fetchCustomerName(order.user_id)
    const email = await resolveEmail(order.user_id)

    if (email) {
      const t = orderProcessingTemplate(order, items, name, false)
      await dispatch([email], t.subject, t.html)
    }
    const st = orderProcessingTemplate(order, items, name, true)
    await dispatch([STORE_EMAIL], st.subject, st.html)
  } catch (error) {
    console.error('[email] sendOrderProcessingEmail failed:', error)
  }
}

export async function sendRefundEmail(orderId: string): Promise<void> {
  try {
    const { order } = await fetchOrderWithItems(orderId)
    const name = await fetchCustomerName(order.user_id)
    const email = await resolveEmail(order.user_id)

    if (email) {
      const t = refundTemplate(order, name, false)
      await dispatch([email], t.subject, t.html)
    }
    const st = refundTemplate(order, name, true)
    await dispatch([STORE_EMAIL], st.subject, st.html)
  } catch (error) {
    console.error('[email] sendRefundEmail failed:', error)
  }
}

export async function sendInvoiceEmail(orderId: string, customerEmail?: string): Promise<void> {
  try {
    const { order, items } = await fetchOrderWithItems(orderId)
    const name = await fetchCustomerName(order.user_id)
    const email = await resolveEmail(order.user_id, customerEmail)
    if (!email) return

    const pdfBuffer = await generateInvoiceBuffer(order, items, name)
    const num = formatOrderId(order.id)
    const t = invoiceEmailTemplate(order, name)
    await resendClient.emails.send({
      from: FROM_EMAIL,
      to: [email],
      replyTo: REPLY_TO,
      subject: t.subject,
      html: t.html,
      attachments: [{ filename: `invoice-${num}.pdf`, content: pdfBuffer }],
    })
  } catch (error) {
    console.error('[email] sendInvoiceEmail failed:', error)
  }
}

export async function sendReferralRewardEmail(
  referrerId: string,
  referredFirstName: string,
  pointsAwarded: number
): Promise<void> {
  try {
    const admin = createAdminClient()
    const { data: user } = await admin.from('users').select('email, full_name').eq('id', referrerId).single()
    if (!user?.email) return
    const t = referralRewardTemplate(user.full_name ?? 'Customer', referredFirstName, pointsAwarded)
    await dispatch([user.email], t.subject, t.html)
  } catch (error) {
    console.error('[email] sendReferralRewardEmail failed:', error)
  }
}

export async function sendBirthdayOfferEmail(
  userId: string,
  discountCode: string,
  expiresAt: string
): Promise<void> {
  try {
    const admin = createAdminClient()
    const { data: user } = await admin.from('users').select('email, full_name').eq('id', userId).single()
    if (!user?.email) return
    const t = birthdayOfferTemplate(user.full_name ?? 'Customer', discountCode, expiresAt)
    await dispatch([user.email], t.subject, t.html)
  } catch (error) {
    console.error('[email] sendBirthdayOfferEmail failed:', error)
  }
}

export async function sendImportationWaitlistEmail(email: string, name: string): Promise<void> {
  try {
    const t = importationWaitlistTemplate(name)
    await dispatch([email], t.subject, t.html)
  } catch (error) {
    console.error('[email] sendImportationWaitlistEmail failed:', error)
  }
}
