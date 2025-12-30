/**
 * Tests for Orders API routes
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

// Mock Supabase
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: 'user-1', email: 'admin@test.com' } },
      error: null,
    }),
  },
  from: jest.fn(() => mockSupabaseClient),
  select: jest.fn(() => mockSupabaseClient),
  insert: jest.fn(() => mockSupabaseClient),
  update: jest.fn(() => mockSupabaseClient),
  delete: jest.fn(() => mockSupabaseClient),
  eq: jest.fn(() => mockSupabaseClient),
  order: jest.fn(() => mockSupabaseClient),
  in: jest.fn(() => mockSupabaseClient),
};

const mockAdminClient = {
  ...mockSupabaseClient,
  from: jest.fn(() => mockAdminClient),
  select: jest.fn(() => mockAdminClient),
  in: jest.fn(() => mockAdminClient),
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
}));

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => mockAdminClient),
}));

jest.mock('@/lib/auth/roles', () => ({
  getUserRole: jest.fn().mockResolvedValue('admin'),
}));

describe('Orders API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/orders', () => {
    it('should return orders for authenticated user', async () => {
      mockSupabaseClient.select.mockResolvedValueOnce({
        data: [
          {
            id: 'order-1',
            user_id: 'user-1',
            seller_id: 'seller-1',
            total_amount: 5000,
            status: 'completed',
            created_at: new Date().toISOString(),
          },
        ],
        error: null,
      });

      mockAdminClient.select.mockResolvedValueOnce({
        data: [{ id: 'user-1', full_name: 'Test User', email: 'test@test.com' }],
        error: null,
      });

      mockAdminClient.select.mockResolvedValueOnce({
        data: [{ id: 'seller-1', employee_code: 'EMP001', role: 'seller' }],
        error: null,
      });

      const { GET } = await import('@/app/api/orders/route');
      const request = new NextRequest('http://localhost:3000/api/orders');
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('orders');
      expect(Array.isArray(data.orders)).toBe(true);
    });

    it('should return 401 for unauthenticated user', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const { GET } = await import('@/app/api/orders/route');
      const request = new NextRequest('http://localhost:3000/api/orders');
      
      const response = await GET(request);
      
      expect(response.status).toBe(401);
    });

    it('should show all orders for sellers', async () => {
      const { getUserRole } = require('@/lib/auth/roles');
      getUserRole.mockResolvedValueOnce('seller');

      mockSupabaseClient.select.mockResolvedValueOnce({
        data: [
          { id: 'order-1', total_amount: 5000, status: 'completed' },
          { id: 'order-2', total_amount: 3000, status: 'pending' },
        ],
        error: null,
      });

      mockAdminClient.select.mockResolvedValue({ data: [], error: null });

      const { GET } = await import('@/app/api/orders/route');
      const request = new NextRequest('http://localhost:3000/api/orders');
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.orders.length).toBe(2); // Sellers see all orders
    });
  });

  describe('DELETE /api/orders', () => {
    it('should delete order for admin user', async () => {
      mockAdminClient.delete.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const { DELETE } = await import('@/app/api/orders/route');
      const request = new NextRequest('http://localhost:3000/api/orders?id=order-1');
      
      const response = await DELETE(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockAdminClient.delete).toHaveBeenCalled();
    });

    it('should return 403 for non-admin user', async () => {
      const { getUserRole } = require('@/lib/auth/roles');
      getUserRole.mockResolvedValueOnce('seller');

      const { DELETE } = await import('@/app/api/orders/route');
      const request = new NextRequest('http://localhost:3000/api/orders?id=order-1');
      
      const response = await DELETE(request);
      
      expect(response.status).toBe(403);
    });

    it('should return 400 if order ID is missing', async () => {
      const { DELETE } = await import('@/app/api/orders/route');
      const request = new NextRequest('http://localhost:3000/api/orders');
      
      const response = await DELETE(request);
      
      expect(response.status).toBe(400);
    });
  });
});
