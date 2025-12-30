/**
 * Tests for Products API - Color Stocks endpoint
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { mockProduct } from '../../../fixtures/products';
import { mockUser } from '../../../fixtures/users';

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
  eq: jest.fn(() => mockSupabaseClient),
  limit: jest.fn(() => mockSupabaseClient),
};

const mockAdminClient = {
  ...mockSupabaseClient,
  from: jest.fn(() => mockAdminClient),
  select: jest.fn(() => mockAdminClient),
  eq: jest.fn(() => mockAdminClient),
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
}));

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => mockAdminClient),
}));

describe('Products API - Color Stocks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/products/[id]/color-stocks', () => {
    it('should return color stocks for product', async () => {
      const mockColorStocks = [
        { color: 'Red', size: 'M', stock_quantity: 10 },
        { color: 'Blue', size: 'L', stock_quantity: 5 },
      ];

      mockAdminClient.select.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      mockAdminClient.select.mockResolvedValueOnce({
        data: mockColorStocks,
        error: null,
      });

      const { GET } = await import('@/app/api/products/[id]/color-stocks/route');
      const request = new NextRequest('http://localhost:3000/api/products/123/color-stocks');

      const response = await GET(request, { params: { id: mockProduct.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('colorStocks');
      expect(data.colorStocks).toEqual(mockColorStocks);
    });

    it('should return empty array if table does not exist', async () => {
      mockAdminClient.select.mockResolvedValueOnce({
        data: null,
        error: { code: '42P01', message: 'relation "product_size_colors" does not exist' },
      });

      const { GET } = await import('@/app/api/products/[id]/color-stocks/route');
      const request = new NextRequest('http://localhost:3000/api/products/123/color-stocks');

      const response = await GET(request, { params: { id: mockProduct.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.colorStocks).toEqual([]);
    });

    it('should require authentication', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const { GET } = await import('@/app/api/products/[id]/color-stocks/route');
      const request = new NextRequest('http://localhost:3000/api/products/123/color-stocks');

      const response = await GET(request, { params: { id: mockProduct.id } });

      expect(response.status).toBe(401);
    });

    it('should require product ID', async () => {
      const { GET } = await import('@/app/api/products/[id]/color-stocks/route');
      const request = new NextRequest('http://localhost:3000/api/products//color-stocks');

      const response = await GET(request, { params: { id: '' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Product ID is required');
    });

    it('should handle database errors', async () => {
      mockAdminClient.select.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      mockAdminClient.select.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const { GET } = await import('@/app/api/products/[id]/color-stocks/route');
      const request = new NextRequest('http://localhost:3000/api/products/123/color-stocks');

      const response = await GET(request, { params: { id: mockProduct.id } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch color stocks');
    });
  });
});

