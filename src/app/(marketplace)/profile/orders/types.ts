export type CustomerOrderItem = {
  id: string
  product_name: string
  product_image: string | null
  size: string | null
  color: string | null
  quantity: number
  unit_price: number
}

export type CustomerOrder = {
  id: string
  order_number: string
  date: string
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded'
  payment_method: string
  total_amount: number
  items: CustomerOrderItem[]
}
