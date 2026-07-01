import React from 'react'
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import { formatOrderId } from '@/lib/utils/orderId'
import type { OrderForEmail, OrderItemForEmail } from './templates'

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 11, padding: 40, color: '#222' },
  header: { backgroundColor: '#1a1a2e', color: '#fff', padding: 20, marginBottom: 24 },
  headerTitle: { fontSize: 20, color: '#fff', letterSpacing: 2 },
  headerSub: { fontSize: 10, color: '#aaa', marginTop: 4 },
  section: { marginBottom: 16 },
  label: { fontSize: 9, color: '#888', textTransform: 'uppercase', marginBottom: 2 },
  value: { fontSize: 12 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f4f4f4', padding: '6 8', marginTop: 12 },
  tableRow: { flexDirection: 'row', padding: '6 8', borderBottomWidth: 1, borderBottomColor: '#eee' },
  col1: { flex: 3 },
  col2: { flex: 1, textAlign: 'right' },
  col3: { flex: 1, textAlign: 'right' },
  col4: { flex: 1, textAlign: 'right' },
  tableHeaderText: { fontSize: 9, color: '#555', fontFamily: 'Helvetica-Bold' },
  total: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
  totalLabel: { fontFamily: 'Helvetica-Bold', marginRight: 16 },
  totalValue: { fontFamily: 'Helvetica-Bold' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', fontSize: 9, color: '#aaa' },
})

function formatCurrency(n: number) {
  return `KES ${n.toFixed(2)}`
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })
}

function paymentLabel(m: string) {
  const map: Record<string, string> = { mpesa: 'M-Pesa', card: 'Card', cash: 'Cash' }
  return map[m] ?? m
}

export default function InvoicePDF({
  order,
  items,
  customerName,
}: {
  order: OrderForEmail
  items: OrderItemForEmail[]
  customerName: string
}) {
  const num = formatOrderId(order.id)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>LEEZTRUESTYLES</Text>
          <Text style={styles.headerSub}>leeztruestyles44@gmail.com</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Invoice Number</Text>
          <Text style={styles.value}>#{num}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Date</Text>
          <Text style={styles.value}>{formatDate(order.created_at)}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Billed To</Text>
          <Text style={styles.value}>{customerName}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Payment Method</Text>
          <Text style={styles.value}>{paymentLabel(order.payment_method)}</Text>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.col1, styles.tableHeaderText]}>Product</Text>
          <Text style={[styles.col2, styles.tableHeaderText]}>Qty</Text>
          <Text style={[styles.col3, styles.tableHeaderText]}>Unit Price</Text>
          <Text style={[styles.col4, styles.tableHeaderText]}>Subtotal</Text>
        </View>

        {items.map((item, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.col1}>{item.product_name}</Text>
            <Text style={styles.col2}>{item.quantity}</Text>
            <Text style={styles.col3}>{formatCurrency(item.unit_price)}</Text>
            <Text style={styles.col4}>{formatCurrency(item.quantity * item.unit_price)}</Text>
          </View>
        ))}

        <View style={styles.total}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatCurrency(order.total_amount)}</Text>
        </View>

        <Text style={styles.footer}>
          Leeztruestyles · leeztruestyles44@gmail.com · Thank you for your business!
        </Text>
      </Page>
    </Document>
  )
}

export async function generateInvoiceBuffer(
  order: OrderForEmail,
  items: OrderItemForEmail[],
  customerName: string
): Promise<Buffer> {
  return renderToBuffer(<InvoicePDF order={order} items={items} customerName={customerName} />)
}
