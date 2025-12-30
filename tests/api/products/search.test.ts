/**
 * Tests for Products API - Search endpoint
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { mockProducts } from '../../fixtures/products';

// Mock Supabase
const mockSupabaseClient = {
  from: jest.fn(() => mockSupabaseClient),
  select: jest.fn(() => mockSupabaseClient),
  or: jest.fn(() => mockSupabaseClient),
  eq: jest.fn(() => mockSupabaseClient),
  gte: jest.fn(() => mockSupabaseClient),
  lte: jest.fn(() => mockSupabaseClient),
  range: jest.fn(() => mockSupabaseClient),
  order: jest.fn(() => mockSupabaseClient),
  in: jest.fn(() => mockSupabaseClient),
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
}));

describe('Products API - Search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/products/search', () => {
    it('should search products by query', async () => {
      mockSupabaseClient.select.mockResolvedValueOnce({
        data: mockProducts,
        count: mockProducts.length,
        error: null,
      });

      mockSupabaseClient.select.mockResolvedValueOnce({
        data: [
          { product_id: mockProducts[0].id, stock_quantity: 10, reserved_quantity: 0 },
        ],
        error: null,
      });

      const { GET } = await import('@/app/api/products/search/route');
      const request = new NextRequest('http://localhost:3000/api/products/search?q=test');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('products');
      expect(data).toHaveProperty('pagination');
      expect(mockSupabaseClient.or).toHaveBeenCalled();
    });

    it('should filter by category', async () => {
      mockSupabaseClient.select.mockResolvedValueOnce({
        data: [mockProducts[0]],
        count: 1,
        error: null,
      });

      mockSupabaseClient.select.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const { GET } = await import('@/app/api/products/search/route');
      const request = new NextRequest('http://localhost:3000/api/products/search?category=cat-123');

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('category_id', 'cat-123');
    });

    it('should filter by price range', async () => {
      mockSupabaseClient.select.mockResolvedValueOnce({
        data: mockProducts,
        count: mockProducts.length,
        error: null,
      });

      mockSupabaseClient.select.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const { GET } = await import('@/app/api/products/search/route');
      const request = new NextRequest('http://localhost:3000/api/products/search?minPrice=500&maxPrice=2000');

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockSupabaseClient.gte).toHaveBeenCalledWith('price', 500);
      expect(mockSupabaseClient.lte).toHaveBeenCalledWith('price', 2000);
    });

    it('should handle pagination', async () => {
      mockSupabaseClient.select.mockResolvedValueOnce({
        data: [mockProducts[0]],
        count: 10,
        error: null,
      });

      mockSupabaseClient.select.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const { GET } = await import('@/app/api/products/search/route');
      const request = new NextRequest('http://localhost:3000/api/products/search?page=2&limit=5');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.page).toBe(2);
      expect(data.pagination.limit).toBe(5);
      expect(data.pagination.total).toBe(10);
      expect(data.pagination.totalPages).toBe(2);
    });

    it('should filter out products with 0 stock', async () => {
      const productsWithZeroStock = [
        { ...mockProducts[0], id: 'prod-1' },
        { ...mockProducts[1], id: 'prod-2' },
      ];

      mockSupabaseClient.select.mockResolvedValueOnce({
        data: productsWithZeroStock,
        count: 2,
        error: null,
      });

      mockSupabaseClient.select.mockResolvedValueOnce({
        data: [
          { product_id: 'prod-1', stock_quantity: 0, reserved_quantity: 0 },
          { product_id: 'prod-2', stock_quantity: 5, reserved_quantity: 0 },
        ],
        error: null,
      });

      const { GET } = await import('@/app/api/products/search/route');
      const request = new NextRequest('http://localhost:3000/api/products/search');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should only return product with stock > 0
      expect(data.products.length).toBe(1);
      expect(data.products[0].id).toBe('prod-2');
    });

    it('should return empty results when no products match', async () => {
      mockSupabaseClient.select.mockResolvedValueOnce({
        data: [],
        count: 0,
        error: null,
      });

      const { GET } = await import('@/app/api/products/search/route');
      const request = new NextRequest('http://localhost:3000/api/products/search?q=nonexistent');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.products).toEqual([]);
      expect(data.pagination.total).toBe(0);
    });

    it('should handle database errors', async () => {
      mockSupabaseClient.select.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const { GET } = await import('@/app/api/products/search/route');
      const request = new NextRequest('http://localhost:3000/api/products/search');

      const response = await GET(request);

      expect(response.status).toBe(500);
    });
  });
});

