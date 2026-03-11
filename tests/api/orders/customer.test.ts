/** @jest-environment node */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

// --- Supabase mock (chained builder pattern used throughout this codebase) ---
const mockOrder = {
  id: 'order-uuid-1',
  user_id: 'user-1',
  total_amount: 3500,
  status: 'pending',
  payment_method: 'mpesa',
  created_at: '2026-03-11T10:00:00.000Z',
  order_items: [
    {
      id: 'item-1',
      product_id: 'prod-1',
      quantity: 2,
      price: 1750,
      size: 'M',
      color: 'black',
      products: { name: 'Floral Dress', images: ['https://example.com/img.jpg'] },
    },
  ],
};

const mockSupabaseClient: any = {
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: 'user-1', email: 'customer@test.com' } },
      error: null,
    }),
  },
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockResolvedValue({ data: [mockOrder], error: null }),
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
}));

describe('GET /api/orders/customer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient.from.mockReturnThis();
    mockSupabaseClient.select.mockReturnThis();
    mockSupabaseClient.eq.mockReturnThis();
    mockSupabaseClient.order.mockResolvedValue({ data: [mockOrder], error: null });
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'customer@test.com' } },
      error: null,
    });
  });

  it('returns 401 when user is not authenticated', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });
    const { GET } = await import('@/app/api/orders/customer/route');
    const req = new NextRequest('http://localhost/api/orders/customer');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns orders with items for authenticated customer', async () => {
    const { GET } = await import('@/app/api/orders/customer/route');
    const req = new NextRequest('http://localhost/api/orders/customer');
    const res = await GET(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.orders).toHaveLength(1);
    const order = json.orders[0];
    // formatOrderId('order-uuid-1') => clean='ORDERUUID1' => last6='RUUID1' => 'LEEZT-RUUID1'
    expect(order.order_number).toBe('LEEZT-RUUID1');
    expect(order.status).toBe('pending');
    expect(order.total_amount).toBe(3500);
    expect(order.items).toHaveLength(1);
    expect(order.items[0].product_name).toBe('Floral Dress');
    expect(order.items[0].quantity).toBe(2);
    expect(order.items[0].unit_price).toBe(1750);
  });

  it('returns empty orders array when customer has no orders', async () => {
    mockSupabaseClient.order.mockResolvedValueOnce({ data: [], error: null });
    const { GET } = await import('@/app/api/orders/customer/route');
    const req = new NextRequest('http://localhost/api/orders/customer');
    const res = await GET(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.orders).toEqual([]);
  });

  it('returns 500 when database query fails', async () => {
    mockSupabaseClient.order.mockResolvedValueOnce({
      data: null,
      error: { message: 'DB error' },
    });
    const { GET } = await import('@/app/api/orders/customer/route');
    const req = new NextRequest('http://localhost/api/orders/customer');
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});
