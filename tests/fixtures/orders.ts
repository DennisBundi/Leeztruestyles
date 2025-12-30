/**
 * Test fixtures for orders
 */

export const mockOrder = {
  id: 'order-123',
  user_id: 'user-123',
  seller_id: 'seller-123',
  sale_type: 'online' as const,
  total_amount: 2000,
  status: 'pending' as const,
  payment_method: 'mpesa' as const,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const mockPOSOrder = {
  ...mockOrder,
  id: 'order-456',
  sale_type: 'pos' as const,
  status: 'completed' as const,
  payment_method: 'cash' as const,
  social_platform: 'walkin' as const,
  commission: 60, // 3% of 2000
};

export const mockOrderItems = [
  {
    id: 'item-1',
    order_id: 'order-123',
    product_id: '550e8400-e29b-41d4-a716-446655440000',
    quantity: 2,
    price: 1000,
    size: 'M',
    color: 'Red',
  },
  {
    id: 'item-2',
    order_id: 'order-123',
    product_id: '550e8400-e29b-41d4-a716-446655440001',
    quantity: 1,
    price: 2000,
  },
];

export const mockCustomerInfo = {
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+254712345678',
  address: '123 Test Street, Nairobi',
};

