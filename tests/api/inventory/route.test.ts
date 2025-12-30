/**
 * Tests for Inventory API - Route endpoint
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { mockProducts } from '../../fixtures/products';
import { mockCategories } from '../../fixtures/categories';

// Mock Supabase
const mockSupabaseClient = {
  from: jest.fn(() => mockSupabaseClient),
  select: jest.fn(() => mockSupabaseClient),
  order: jest.fn(() => mockSupabaseClient),
  in: jest.fn(() => mockSupabaseClient),
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
}));

describe('Inventory API - Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/inventory', () => {
    it('should return inventory data with products and categories', async () => {
      const productsWithCategories = mockProducts.map(p => ({
        ...p,
        categories: mockCategories[0],
      }));

      mockSupabaseClient.select.mockResolvedValueOnce({
        data: productsWithCategories,
        error: null,
      });

      const mockInventory = [
        {
          id: 'inv-1',
          product_id: mockProducts[0].id,
          stock_quantity: 10,
          reserved_quantity: 2,
          last_updated: new Date().toISOString(),
        },
      ];

      mockSupabaseClient.select.mockResolvedValueOnce({
        data: mockInventory,
        error: null,
      });

      const { GET } = await import('@/app/api/inventory/route');
      const request = new NextRequest('http://localhost:3000/api/inventory');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('inventory');
      expect(Array.isArray(data.inventory)).toBe(true);
      expect(data.inventory[0]).toHaveProperty('product_name');
      expect(data.inventory[0]).toHaveProperty('available');
      expect(data.inventory[0].available).toBe(8); // 10 - 2
    });

    it('should return empty array if no products found', async () => {
      mockSupabaseClient.select.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const { GET } = await import('@/app/api/inventory/route');
      const request = new NextRequest('http://localhost:3000/api/inventory');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.inventory).toEqual([]);
    });

    it('should handle missing inventory gracefully', async () => {
      const productsWithCategories = mockProducts.map(p => ({
        ...p,
        categories: mockCategories[0],
      }));

      mockSupabaseClient.select.mockResolvedValueOnce({
        data: productsWithCategories,
        error: null,
      });

      mockSupabaseClient.select.mockResolvedValueOnce({
        data: null,
        error: { message: 'Inventory error' },
      });

      const { GET } = await import('@/app/api/inventory/route');
      const request = new NextRequest('http://localhost:3000/api/inventory');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.inventory).toBeDefined();
    });

    it('should calculate available stock correctly', async () => {
      const productsWithCategories = [{
        ...mockProducts[0],
        categories: mockCategories[0],
      }];

      mockSupabaseClient.select.mockResolvedValueOnce({
        data: productsWithCategories,
        error: null,
      });

      const mockInventory = [{
        id: 'inv-1',
        product_id: mockProducts[0].id,
        stock_quantity: 20,
        reserved_quantity: 25,
        last_updated: new Date().toISOString(),
      }];

      mockSupabaseClient.select.mockResolvedValueOnce({
        data: mockInventory,
        error: null,
      });

      const { GET } = await import('@/app/api/inventory/route');
      const request = new NextRequest('http://localhost:3000/api/inventory');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.inventory[0].available).toBe(0); // Math.max(0, 20 - 25)
    });

    it('should handle database errors', async () => {
      mockSupabaseClient.select.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const { GET } = await import('@/app/api/inventory/route');
      const request = new NextRequest('http://localhost:3000/api/inventory');

      const response = await GET(request);

      expect(response.status).toBe(500);
    });
  });
});

