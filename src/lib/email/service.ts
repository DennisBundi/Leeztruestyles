import { createAdminClient } from '@/lib/supabase/admin'
import { resendClient } from './resend'
import {
  orderConfirmationTemplate,
  deliveryConfirmationTemplate,
  cancellationTemplate,
  type OrderForEmail,
  type OrderItemForEmail,
} from './templates'

const STORE_EMAIL = 'leeztruestyles44@gmail.com'
const FROM_EMAIL = 'orders@leeztruestyles.com'
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

async function dispatch(recipients: string[], subject: string, html: string): Promise<void> {
  await resendClient.emails.send({ from: FROM_EMAIL, to: recipients, reply_to: REPLY_TO, subject, html })
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
