/**
 * Tests for Products API - Sizes endpoint
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { mockProduct } from '../../../fixtures/products';

// Mock Supabase
const mockSupabaseClient = {
  from: jest.fn(() => mockSupabaseClient),
  select: jest.fn(() => mockSupabaseClient),
  eq: jest.fn(() => mockSupabaseClient),
  order: jest.fn(() => mockSupabaseClient),
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
}));

describe('Products API - Sizes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/products/[id]/sizes', () => {
    it('should return product sizes with available stock', async () => {
      const mockSizes = [
        { size: 'S', stock_quantity: 10, reserved_quantity: 2 },
        { size: 'M', stock_quantity: 15, reserved_quantity: 5 },
        { size: 'L', stock_quantity: 8, reserved_quantity: 0 },
      ];

      mockSupabaseClient.select.mockResolvedValueOnce({
        data: mockSizes,
        error: null,
      });

      const { GET } = await import('@/app/api/products/[id]/sizes/route');
      const request = new NextRequest('http://localhost:3000/api/products/123/sizes');

      const response = await GET(request, { params: { id: mockProduct.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('sizes');
      expect(data.sizes).toHaveLength(3);
      expect(data.sizes[0]).toEqual({
        size: 'S',
        available: 8, // 10 - 2
        stock_quantity: 10,
        reserved_quantity: 2,
      });
    });

    it('should return empty array if no sizes found', async () => {
      mockSupabaseClient.select.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const { GET } = await import('@/app/api/products/[id]/sizes/route');
      const request = new NextRequest('http://localhost:3000/api/products/123/sizes');

      const response = await GET(request, { params: { id: mockProduct.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sizes).toEqual([]);
    });

    it('should require product ID', async () => {
      const { GET } = await import('@/app/api/products/[id]/sizes/route');
      const request = new NextRequest('http://localhost:3000/api/products//sizes');

      const response = await GET(request, { params: { id: '' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Product ID is required');
    });

    it('should handle database errors', async () => {
      mockSupabaseClient.select.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const { GET } = await import('@/app/api/products/[id]/sizes/route');
      const request = new NextRequest('http://localhost:3000/api/products/123/sizes');

      const response = await GET(request, { params: { id: mockProduct.id } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch product sizes');
    });

    it('should calculate available stock correctly', async () => {
      const mockSizes = [
        { size: 'XL', stock_quantity: 20, reserved_quantity: 25 }, // Should be 0, not negative
      ];

      mockSupabaseClient.select.mockResolvedValueOnce({
        data: mockSizes,
        error: null,
      });

      const { GET } = await import('@/app/api/products/[id]/sizes/route');
      const request = new NextRequest('http://localhost:3000/api/products/123/sizes');

      const response = await GET(request, { params: { id: mockProduct.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sizes[0].available).toBe(0); // Math.max(0, 20 - 25) = 0
    });
  });
});

