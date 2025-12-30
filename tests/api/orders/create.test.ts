/**
 * Tests for Orders API - Create endpoint
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { mockOrder, mockCustomerInfo } from '../../fixtures/orders';
import { mockProduct } from '../../fixtures/products';
import { mockUser, mockEmployee } from '../../fixtures/users';

// Mock Supabase
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: mockUser.id, email: mockUser.email } },
      error: null,
    }),
  },
  from: jest.fn(() => mockSupabaseClient),
  select: jest.fn(() => mockSupabaseClient),
  insert: jest.fn(() => mockSupabaseClient),
  update: jest.fn(() => mockSupabaseClient),
  delete: jest.fn(() => mockSupabaseClient),
  eq: jest.fn(() => mockSupabaseClient),
  single: jest.fn(),
  order: jest.fn(() => mockSupabaseClient),
  in: jest.fn(() => mockSupabaseClient),
};

const mockAdminClient = {
  ...mockSupabaseClient,
  from: jest.fn(() => mockAdminClient),
  select: jest.fn(() => mockAdminClient),
  insert: jest.fn(() => mockAdminClient),
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
}));

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => mockAdminClient),
}));

jest.mock('@/lib/auth/roles', () => ({
  getUserRole: jest.fn().mockResolvedValue('seller'),
  getEmployee: jest.fn().mockResolvedValue(mockEmployee),
}));

describe('Orders API - Create', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/orders/create', () => {
    it('should create order with existing products', async () => {
      // Mock order creation
      mockSupabaseClient.insert.mockResolvedValueOnce({
        data: [{ ...mockOrder, id: 'new-order-123' }],
        error: null,
      });

      // Mock order items creation
      mockSupabaseClient.insert.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      // Mock user upsert
      mockSupabaseClient.insert.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const { POST } = await import('@/app/api/orders/create/route');

      const orderData = {
        items: [
          {
            product_id: mockProduct.id,
            quantity: 2,
            price: mockProduct.price,
            size: 'M',
            color: 'Red',
          },
        ],
        customer_info: mockCustomerInfo,
        sale_type: 'online',
      };

      const request = new NextRequest('http://localhost:3000/api/orders/create', {
        method: 'POST',
        body: JSON.stringify(orderData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('order_id');
      expect(mockSupabaseClient.insert).toHaveBeenCalled();
    });

    it('should create order with custom products', async () => {
      // Mock custom product creation
      mockAdminClient.insert.mockResolvedValueOnce({
        data: [{ id: 'custom-product-123', name: 'Custom Product', price: 500 }],
        error: null,
      });

      // Mock inventory creation
      mockAdminClient.insert.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      // Mock order creation
      mockSupabaseClient.insert.mockResolvedValueOnce({
        data: [{ ...mockOrder, id: 'new-order-456' }],
        error: null,
      });

      // Mock order items creation
      mockSupabaseClient.insert.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      // Mock user upsert
      mockSupabaseClient.insert.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const { POST } = await import('@/app/api/orders/create/route');

      const orderData = {
        items: [
          {
            product_data: {
              name: 'Custom Product',
              price: 500,
              description: 'A custom product',
            },
            quantity: 1,
            price: 500,
          },
        ],
        customer_info: mockCustomerInfo,
        sale_type: 'online',
      };

      const request = new NextRequest('http://localhost:3000/api/orders/create', {
        method: 'POST',
        body: JSON.stringify(orderData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('order_id');
      expect(mockAdminClient.insert).toHaveBeenCalled(); // Custom product creation
    });

    it('should create POS order with commission for non-admin seller', async () => {
      const { getEmployee } = require('@/lib/auth/roles');
      getEmployee.mockResolvedValueOnce({
        ...mockEmployee,
        role: 'seller',
      });

      // Mock order creation with commission
      mockSupabaseClient.insert.mockResolvedValueOnce({
        data: [{ ...mockOrder, id: 'pos-order-123', commission: 60 }],
        error: null,
      });

      // Mock order items creation
      mockSupabaseClient.insert.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      // Mock user upsert
      mockSupabaseClient.insert.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const { POST } = await import('@/app/api/orders/create/route');

      const orderData = {
        items: [
          {
            product_id: mockProduct.id,
            quantity: 2,
            price: mockProduct.price,
          },
        ],
        customer_info: mockCustomerInfo,
        sale_type: 'pos',
        social_platform: 'walkin',
      };

      const request = new NextRequest('http://localhost:3000/api/orders/create', {
        method: 'POST',
        body: JSON.stringify(orderData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      // Check that commission was included in order creation
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          commission: expect.any(Number),
        })
      );
    });

    it('should not apply commission for admin seller', async () => {
      const { getEmployee } = require('@/lib/auth/roles');
      getEmployee.mockResolvedValueOnce({
        ...mockEmployee,
        role: 'admin',
      });

      // Mock order creation without commission
      mockSupabaseClient.insert.mockResolvedValueOnce({
        data: [{ ...mockOrder, id: 'pos-order-admin', commission: 0 }],
        error: null,
      });

      // Mock order items creation
      mockSupabaseClient.insert.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      // Mock user upsert
      mockSupabaseClient.insert.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const { POST } = await import('@/app/api/orders/create/route');

      const orderData = {
        items: [
          {
            product_id: mockProduct.id,
            quantity: 2,
            price: mockProduct.price,
          },
        ],
        customer_info: mockCustomerInfo,
        sale_type: 'pos',
        social_platform: 'walkin',
      };

      const request = new NextRequest('http://localhost:3000/api/orders/create', {
        method: 'POST',
        body: JSON.stringify(orderData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('should require authentication', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const { POST } = await import('@/app/api/orders/create/route');

      const orderData = {
        items: [
          {
            product_id: mockProduct.id,
            quantity: 1,
            price: mockProduct.price,
          },
        ],
        customer_info: mockCustomerInfo,
        sale_type: 'online',
      };

      const request = new NextRequest('http://localhost:3000/api/orders/create', {
        method: 'POST',
        body: JSON.stringify(orderData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Authentication required');
    });

    it('should validate required fields', async () => {
      const { POST } = await import('@/app/api/orders/create/route');

      const invalidOrderData = {
        items: [], // Empty items
        customer_info: mockCustomerInfo,
      };

      const request = new NextRequest('http://localhost:3000/api/orders/create', {
        method: 'POST',
        body: JSON.stringify(invalidOrderData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });

    it('should require social_platform for POS orders', async () => {
      const { POST } = await import('@/app/api/orders/create/route');

      const orderData = {
        items: [
          {
            product_id: mockProduct.id,
            quantity: 1,
            price: mockProduct.price,
          },
        ],
        customer_info: mockCustomerInfo,
        sale_type: 'pos',
        // Missing social_platform
      };

      const request = new NextRequest('http://localhost:3000/api/orders/create', {
        method: 'POST',
        body: JSON.stringify(orderData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
      expect(data.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'social_platform',
            message: expect.stringContaining('required'),
          }),
        ])
      );
    });

    it('should handle custom product creation failure', async () => {
      // Mock custom product creation failure
      mockAdminClient.insert.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const { POST } = await import('@/app/api/orders/create/route');

      const orderData = {
        items: [
          {
            product_data: {
              name: 'Custom Product',
              price: 500,
            },
            quantity: 1,
            price: 500,
          },
        ],
        customer_info: mockCustomerInfo,
        sale_type: 'online',
      };

      const request = new NextRequest('http://localhost:3000/api/orders/create', {
        method: 'POST',
        body: JSON.stringify(orderData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create custom products');
    });

    it('should handle order items creation failure and cleanup', async () => {
      // Mock order creation
      mockSupabaseClient.insert.mockResolvedValueOnce({
        data: [{ ...mockOrder, id: 'order-to-cleanup' }],
        error: null,
      });

      // Mock order items creation failure
      mockSupabaseClient.insert.mockResolvedValueOnce({
        data: null,
        error: { message: 'Failed to create items' },
      });

      // Mock order deletion for cleanup
      mockSupabaseClient.delete.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const { POST } = await import('@/app/api/orders/create/route');

      const orderData = {
        items: [
          {
            product_id: mockProduct.id,
            quantity: 1,
            price: mockProduct.price,
          },
        ],
        customer_info: mockCustomerInfo,
        sale_type: 'online',
      };

      const request = new NextRequest('http://localhost:3000/api/orders/create', {
        method: 'POST',
        body: JSON.stringify(orderData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create order items');
      // Verify cleanup was attempted
      expect(mockSupabaseClient.delete).toHaveBeenCalled();
    });

    it('should create POS order with completed status', async () => {
      const { getEmployee } = require('@/lib/auth/roles');
      getEmployee.mockResolvedValueOnce(mockEmployee);

      // Mock order creation with completed status
      mockSupabaseClient.insert.mockResolvedValueOnce({
        data: [{ ...mockOrder, id: 'pos-order-completed', status: 'completed' }],
        error: null,
      });

      // Mock order items creation
      mockSupabaseClient.insert.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      // Mock user upsert
      mockSupabaseClient.insert.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const { POST } = await import('@/app/api/orders/create/route');

      const orderData = {
        items: [
          {
            product_id: mockProduct.id,
            quantity: 1,
            price: mockProduct.price,
          },
        ],
        customer_info: mockCustomerInfo,
        sale_type: 'pos',
        social_platform: 'whatsapp',
      };

      const request = new NextRequest('http://localhost:3000/api/orders/create', {
        method: 'POST',
        body: JSON.stringify(orderData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      // Verify order was created with completed status
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
        })
      );
    });
  });
});

