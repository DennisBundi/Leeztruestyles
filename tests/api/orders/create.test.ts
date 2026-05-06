/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { mockOrder, mockCustomerInfo } from '../../fixtures/orders';
import { mockProduct } from '../../fixtures/products';
import { mockUser, mockEmployee } from '../../fixtures/users';

// InventoryService mock — factory uses jest.fn() directly (safe for hoisting)
jest.mock('@/services/inventoryService', () => ({
  InventoryService: {
    checkAvailability: jest.fn().mockResolvedValue(true),
    deductStock: jest.fn().mockResolvedValue(true),
    getStock: jest.fn().mockResolvedValue(10),
  },
}));

// Supabase mock — all chainable methods return the mock client;
// single() is the terminal resolver for .insert().select().single() chains.
const mockSingle = jest.fn().mockResolvedValue({ data: null, error: null });

const mockSupabaseClient: any = {
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: mockUser.id, email: mockUser.email } },
      error: null,
    }),
  },
  from: jest.fn(),
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  eq: jest.fn(),
  single: mockSingle,
  order: jest.fn(),
  in: jest.fn(),
  is: jest.fn(),
  gte: jest.fn(),
  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  // upsert is fire-and-forget in the route; must return a thenable
  upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
};

// Wire chain methods (excluding terminals and upsert which returns a Promise)
const EXCLUDED_FROM_CHAIN = new Set(['auth', 'single', 'maybeSingle', 'upsert']);
Object.keys(mockSupabaseClient).forEach((key) => {
  if (typeof mockSupabaseClient[key] === 'function' && !EXCLUDED_FROM_CHAIN.has(key)) {
    mockSupabaseClient[key].mockReturnValue(mockSupabaseClient);
  }
});

const mockAdminClient: any = {
  from: jest.fn(),
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  eq: jest.fn(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
  in: jest.fn(),
  is: jest.fn(),
  gte: jest.fn(),
  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  rpc: jest.fn().mockResolvedValue({ data: false, error: null }),
};

Object.keys(mockAdminClient).forEach((key) => {
  if (typeof mockAdminClient[key] === 'function' && key !== 'single' && key !== 'maybeSingle' && key !== 'rpc') {
    mockAdminClient[key].mockReturnValue(mockAdminClient);
  }
});

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
    // mockReset clears both call history AND the mockReturnValueOnce queues,
    // preventing "once" values set in one test from leaking into the next.
    // clearAllMocks() only clears call history, not the once-queues.
    Object.keys(mockSupabaseClient).forEach((key) => {
      if (typeof mockSupabaseClient[key] === 'function' && !EXCLUDED_FROM_CHAIN.has(key)) {
        mockSupabaseClient[key].mockReset();
        mockSupabaseClient[key].mockReturnValue(mockSupabaseClient);
      }
    });
    Object.keys(mockAdminClient).forEach((key) => {
      if (typeof mockAdminClient[key] === 'function' && key !== 'single' && key !== 'maybeSingle' && key !== 'rpc') {
        mockAdminClient[key].mockReset();
        mockAdminClient[key].mockReturnValue(mockAdminClient);
      }
    });

    // Reset terminals
    mockSupabaseClient.auth.getUser.mockReset();
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: mockUser.id, email: mockUser.email } },
      error: null,
    });
    mockSupabaseClient.single.mockReset();
    mockSupabaseClient.single.mockResolvedValue({ data: null, error: null });
    mockSupabaseClient.maybeSingle.mockReset();
    mockSupabaseClient.maybeSingle.mockResolvedValue({ data: null, error: null });
    mockSupabaseClient.upsert.mockReset();
    mockSupabaseClient.upsert.mockResolvedValue({ data: null, error: null });
    mockAdminClient.single.mockReset();
    mockAdminClient.single.mockResolvedValue({ data: null, error: null });
    mockAdminClient.rpc.mockReset();
    mockAdminClient.rpc.mockResolvedValue({ data: false, error: null });

    // Default: stock is available, deduction succeeds
    const { InventoryService } = require('@/services/inventoryService');
    InventoryService.checkAvailability.mockReset();
    InventoryService.checkAvailability.mockResolvedValue(true);
    InventoryService.deductStock.mockReset();
    InventoryService.deductStock.mockResolvedValue(true);

    // Reset module-level role mocks
    const { getUserRole, getEmployee } = require('@/lib/auth/roles');
    getUserRole.mockReset();
    getUserRole.mockResolvedValue('seller');
    getEmployee.mockReset();
    getEmployee.mockResolvedValue(mockEmployee);
  });

  describe('POST /api/orders/create', () => {
    it('should create order with existing products', async () => {
      // Online order: price validation queries products table via .in() — make it the terminal
      mockSupabaseClient.in.mockResolvedValueOnce({
        data: [{ id: mockProduct.id, price: mockProduct.price }],
        error: null,
      });
      // Order creation uses .insert().select().single() — mock via single()
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { ...mockOrder, id: 'new-order-123' },
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
      // Custom product creation: adminClient.from("products").insert().select() — select() is terminal
      mockAdminClient.select.mockResolvedValueOnce({
        data: [{ id: 'custom-product-123', name: 'Custom Product', price: 500 }],
        error: null,
      });
      // Order creation via single()
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { ...mockOrder, id: 'new-order-456' },
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

      // Order creation with commission via single()
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { ...mockOrder, id: 'pos-order-123', commission: 60 },
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

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { ...mockOrder, id: 'pos-order-admin', commission: 0 },
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
      // Custom product creation via admin single() — return error
      mockAdminClient.single.mockResolvedValueOnce({
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
      // Order creation succeeds via single()
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { ...mockOrder, id: 'order-to-cleanup' },
        error: null,
      });
      // Order creation: first insert chains so .select().single() resolves
      mockSupabaseClient.insert.mockReturnValueOnce(mockSupabaseClient);
      // Items insert: second insert resolves directly with an error
      mockSupabaseClient.insert.mockResolvedValueOnce({
        data: null,
        error: { message: 'Failed to create items' },
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
        social_platform: 'walkin',
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

    it('should reject POS order when product has insufficient stock', async () => {
      // Make stock check fail for the ordered item
      const { InventoryService } = require('@/services/inventoryService');
      InventoryService.checkAvailability.mockResolvedValueOnce(false);

      const { POST } = await import('@/app/api/orders/create/route');

      const request = new NextRequest('http://localhost:3000/api/orders/create', {
        method: 'POST',
        body: JSON.stringify({
          items: [{ product_id: mockProduct.id, quantity: 5, price: mockProduct.price }],
          customer_info: mockCustomerInfo,
          sale_type: 'pos',
          social_platform: 'walkin',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toMatch(/out of stock|insufficient/i);
      // Order must NOT have been created
      expect(mockSupabaseClient.insert).not.toHaveBeenCalled();
    });

    it('should delete POS order when inventory deduction fails', async () => {
      // Stock check passes (default), but deduction throws to trigger rollback
      const { InventoryService } = require('@/services/inventoryService');
      InventoryService.deductStock.mockRejectedValueOnce(new Error('Inventory deduction failed'));

      // Order creation via single() (commission branch for seller role)
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { ...mockOrder, id: 'pos-order-rollback' },
        error: null,
      });
      // Items insert uses default chain (no error)

      const { POST } = await import('@/app/api/orders/create/route');

      const request = new NextRequest('http://localhost:3000/api/orders/create', {
        method: 'POST',
        body: JSON.stringify({
          items: [{ product_id: mockProduct.id, quantity: 2, price: mockProduct.price }],
          customer_info: mockCustomerInfo,
          sale_type: 'pos',
          social_platform: 'walkin',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toMatch(/inventory/i);
      // Order must have been deleted (rolled back)
      expect(mockSupabaseClient.delete).toHaveBeenCalled();
    });

    it('should create POS order with completed status', async () => {
      const { getEmployee } = require('@/lib/auth/roles');
      getEmployee.mockResolvedValueOnce(mockEmployee);

      // Order creation via single() (commission branch since seller role)
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { ...mockOrder, id: 'pos-order-completed', status: 'completed' },
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

